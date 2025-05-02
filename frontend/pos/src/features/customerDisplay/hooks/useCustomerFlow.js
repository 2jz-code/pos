// features/customerDisplay/hooks/useCustomerFlow.js

import { useState, useEffect, useCallback, useRef } from "react";
import { useCartStore } from "../../../store/cartStore";
import customerDisplayManager from "../utils/windowManager";
import { CUSTOMER_FLOW_STEPS } from "../../payment/constants/paymentFlowSteps";

export function useCustomerFlow() {
	const [currentStep, setCurrentStep] = useState(null);
	const [flowActive, setFlowActive] = useState(false);
	const [stepData, setStepData] = useState({});
	// const cart = useCartStore((state) => state.cart);

	// Use a ref to store the latest stepData without causing re-renders
	const stepDataRef = useRef(stepData);

	// Update the ref whenever stepData changes
	useEffect(() => {
		stepDataRef.current = stepData;
	}, [stepData]);

	const startFlow = useCallback((startFlowArgs = {}) => {
		const {
			orderId: inputOrderId,
			initialStep: inputInitialStep, // Step display should start on
			paymentMethod = "credit",
			amountDue = 0, // Base amount for step
			isSplitPayment = false,
			splitDetails = null,
			payload = {}, // Contains orderData, cashData etc.
			// Add amountCharged if needed for PI creation context (now handled elsewhere)
		} = startFlowArgs;

		const effectiveOrderId = inputOrderId || useCartStore.getState().orderId;
		if (!effectiveOrderId) {
			console.error("useCustomerFlow: No orderId!");
			return;
		}

		setFlowActive(true);
		const initialStep =
			inputInitialStep || (paymentMethod === "cash" ? "payment" : "tip");
		setCurrentStep(initialStep); // <<< Set local POS step state

		// Initialize stepData for the flow
		const initialData = {
			orderId: effectiveOrderId,
			paymentMethod,
			isSplitPayment,
			splitDetails,
			currentPaymentAmount: amountDue, // Amount due this step
			totalAmount: payload?.orderData?.originalTotal || amountDue, // Overall total
			// Reset previous step results, keep PI ID if exists?
			activePaymentIntentId: stepDataRef.current?.activePaymentIntentId, // Preserve? Or clear on new flow? Let's clear for now.
			// activePaymentIntentId: null,
			clientSecret: null,
			tip: null,
			payment: null,
			receiptComplete: null,
			paymentError: null, // Clear results
			...payload, // Spread payload containing initial orderData/cashData
		};
		setStepData(initialData);
		console.log(
			`useCustomerFlow: Flow started. Initial Step: ${initialStep}. Initial Data:`,
			initialData
		);

		// *** Call the window manager to start the flow on the customer display ***
		customerDisplayManager.startCustomerFlow({
			// Pass necessary info to window manager's method
			orderId: effectiveOrderId,
			initialStep: initialStep,
			paymentMethod: paymentMethod,
			amountDue: amountDue,
			isSplitPayment: isSplitPayment,
			splitDetails: splitDetails,
			payload: payload,
		});
		console.log(
			"useCustomerFlow: Called customerDisplayManager.startCustomerFlow"
		);
	}, []);

	// Advance to the next step
	const nextStep = useCallback(() => {
		const currentIndex = CUSTOMER_FLOW_STEPS.findIndex(
			(step) => step.id === currentStep
		);
		if (currentIndex < CUSTOMER_FLOW_STEPS.length - 1) {
			const nextStepId = CUSTOMER_FLOW_STEPS[currentIndex + 1].id;
			setCurrentStep(nextStepId);
			customerDisplayManager.updateCustomerFlowStep(
				nextStepId,
				stepDataRef.current
			);
			return true;
		}
		return false;
	}, [currentStep]);

	// Go to a specific step
	const goToStep = useCallback(
		(stepId, additionalData = {}) => {
			if (CUSTOMER_FLOW_STEPS.some((step) => step.id === stepId)) {
				// Only update if we're changing to a different step
				if (currentStep !== stepId) {
					setCurrentStep(stepId);
					const newStepData = { ...stepDataRef.current, ...additionalData };
					setStepData(newStepData);
					customerDisplayManager.updateCustomerFlowStep(stepId, newStepData);
					return true;
				}
				return true; // Return true but don't update if already on this step
			}
			return false;
		},
		[currentStep]
	);

	// Complete the flow
	const completeFlow = useCallback(() => {
		setFlowActive(false);
		setCurrentStep(null);
		setStepData({});
		customerDisplayManager.showWelcome();
	}, []);

	// Listen for step completion from the customer display
	useEffect(() => {
		if (!flowActive) return () => {}; // Return an empty cleanup function if not active

		const handleStepCompletion = (step, data) => {
			console.log(
				`useCustomerFlow: Received step completion for '${step}'`,
				data
			); // Log received data

			// Store the data from the completed step
			setStepData((prev) => {
				// Create the updated state object, merging previous state with new data for the completed step
				const updated = { ...prev, [step]: data };
				console.log(
					`useCustomerFlow: Updated stepData for step '${step}':`,
					updated
				);

				// Determine the next step based on the completed step and payment method
				let nextStepId = null;

				// Handle flow based on payment method
				if (prev.paymentMethod === "cash") {
					// Cash Flow Logic (keep as is if it works for cash)
					if (step === "payment" && updated.cashPaymentComplete === true) {
						console.log(
							"useCustomerFlow (Cash): Payment complete, moving to receipt."
						);
						nextStepId = "receipt";
					} else if (step === "receipt") {
						console.log(
							"useCustomerFlow (Cash): Receipt shown, cash flow complete."
						);
						// Cash flow ends differently, maybe call completeFlow here for cash only?
						// For consistency, maybe let the CashPaymentView handle its own final completion?
						// Let's assume for now it stops here, or CashPaymentView triggers completion.
						setTimeout(completeFlow, 500); // Keep if cash completion relies on this
						return updated; // Return early for cash receipt completion
					}
				} else {
					// Credit/Other Flow Logic
					if (step === "rewards") {
						console.log(
							"useCustomerFlow (Credit): Rewards complete, moving to tip."
						);
						nextStepId = "tip";
					} else if (step === "tip" && data.tipAmount !== undefined) {
						console.log(
							"useCustomerFlow (Credit): Tip complete, moving to payment."
						);
						updated.tipAmount = data.tipAmount; // Store tip amount
						nextStepId = "payment";
					} else if (step === "payment" && data.status === "success") {
						// Ensure payment was successful
						console.log(
							"useCustomerFlow (Credit): Payment complete, moving to receipt."
						);
						updated.payment = data; // Store payment details
						nextStepId = "receipt";
					} else if (step === "receipt" && data.status === "complete") {
						console.log(
							"useCustomerFlow (Credit): Receipt step complete signal received."
						);
						// *** FIX: DO NOT call completeFlow() here for credit payments ***
						// Simply mark the receipt step as done in the state.
						// CreditPaymentView will react to this updated state.
						updated.receiptComplete = true; // Mark receipt as done
						// Do not determine a next step here; let CreditPaymentView handle it.
						nextStepId = null; // Stop automatic step progression here
					} else {
						// Default: Find the next step in sequence if none of the above match
						const currentIndex = CUSTOMER_FLOW_STEPS.findIndex(
							(s) => s.id === step
						);
						if (
							currentIndex !== -1 &&
							currentIndex < CUSTOMER_FLOW_STEPS.length - 1
						) {
							nextStepId = CUSTOMER_FLOW_STEPS[currentIndex + 1].id;
							console.log(
								`useCustomerFlow: Defaulting to next step: ${nextStepId}`
							);
						}
					}
				}

				// If a next step was determined, update the customer display
				if (nextStepId) {
					// Use a microtask or short timeout to ensure state updates before sending message
					setTimeout(() => {
						console.log(
							`useCustomerFlow: Navigating customer display to step: ${nextStepId}`
						);
						setCurrentStep(nextStepId); // Update local currentStep state
						// Update display manager with the state *before* adding the current step's data
						customerDisplayManager.updateCustomerFlowStep(nextStepId, {
							...stepDataRef.current,
							[step]: data,
						});
					}, 0);
				}

				// Return the updated state object for setStepData
				return updated;
			});
		};

		// Set up the listener using windowManager
		console.log("useCustomerFlow: Setting up listener for step completion.");
		const cleanup =
			customerDisplayManager.listenForCustomerFlowStepCompletion(
				handleStepCompletion
			);

		// Return the cleanup function
		return () => {
			console.log("useCustomerFlow: Cleaning up step completion listener.");
			cleanup();
		};
		// React only when flow becomes active/inactive, or potentially if completeFlow definition changes (stable)
	}, [flowActive, completeFlow]); // Remove stepData from dependencies

	const updateFlowData = useCallback(
		(newData) => {
			console.log("useCustomerFlow.updateFlowData called with:", newData);

			setStepData((prev) => {
				const updated = { ...prev, ...newData };
				console.log("Updated step data:", updated);

				// Update the customer display with the new data
				if (currentStep) {
					console.log(
						"Calling customerDisplayManager.updateCustomerFlowStep with:",
						currentStep,
						updated
					);
					customerDisplayManager.updateCustomerFlowStep(currentStep, updated);
				}

				return updated;
			});
		},
		[currentStep]
	);

	const resetFlowForSplitContinuation = useCallback(
		(paymentInfo = {}) => {
			// Reset flow state but maintain split payment information
			const currentSplitDetails = stepData.splitDetails;
			const originalTotal = stepData.splitOrderData?.originalTotal;

			// Get payment amounts from the passed info or use defaults
			const amountPaid = paymentInfo.amountPaid || stepData.amountPaid || 0;
			const currentPaymentAmount = paymentInfo.currentPaymentAmount || 0;
			const calculatedRemainingAmount =
				paymentInfo.remainingAmount ||
				(originalTotal ? Math.max(0, originalTotal - amountPaid) : 0);

			console.log("FLOW RESET: Resetting flow for split continuation:", {
				originalTotal,
				amountPaid,
				currentPaymentAmount,
				calculatedRemainingAmount,
			});

			// Ensure we're not completing a payment that's already done
			const epsilon = 0.01;
			if (Math.abs(calculatedRemainingAmount) < epsilon) {
				console.log(
					"FLOW RESET: No remaining amount, payment should be complete"
				);
				return;
			}

			// Reset flow state
			setFlowActive(false);
			setCurrentStep(null);

			// Keep only the necessary split information
			setStepData({
				splitDetails: {
					...currentSplitDetails,
					// Update the current split index
					currentSplitIndex: (currentSplitDetails?.currentSplitIndex || 0) + 1,
					// Update the remaining amount
					remainingAmount: calculatedRemainingAmount,
				},
				splitOrderData: {
					originalTotal: originalTotal,
					remainingAmount: calculatedRemainingAmount,
				},
				amountPaid: amountPaid,
				// Add a flag to indicate this is a continuation
				isSplitContinuation: true,
				// Store the last payment amount
				lastPaymentAmount: currentPaymentAmount,
			});

			console.log("FLOW RESET: Customer flow reset for split continuation");
		},
		[stepData]
	);

	return {
		currentStep,
		flowActive,
		stepData,
		startFlow,
		nextStep,
		goToStep,
		completeFlow,
		updateFlowData,
		resetFlowForSplitContinuation,
		isLastStep:
			currentStep === CUSTOMER_FLOW_STEPS[CUSTOMER_FLOW_STEPS.length - 1].id,
		getFlowData: () => stepData,
		resetFlow: () => {
			setFlowActive(false);
			setCurrentStep(null);
			setStepData({});
		},
	};
}
