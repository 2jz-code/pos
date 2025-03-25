// features/customerDisplay/hooks/useCustomerFlow.js

import { useState, useEffect, useCallback, useRef } from "react";
import { useCartStore } from "../../../store/cartStore";
import customerDisplayManager from "../utils/windowManager";
import { CUSTOMER_FLOW_STEPS } from "../../payment/constants/paymentFlowSteps";

export function useCustomerFlow() {
	const [currentStep, setCurrentStep] = useState(null);
	const [flowActive, setFlowActive] = useState(false);
	const [stepData, setStepData] = useState({});
	const cart = useCartStore((state) => state.cart);

	// Use a ref to store the latest stepData without causing re-renders
	const stepDataRef = useRef(stepData);

	// Update the ref whenever stepData changes
	useEffect(() => {
		stepDataRef.current = stepData;
	}, [stepData]);

	const startFlow = useCallback(
		(
			orderId,
			paymentMethod = "credit",
			orderTotal = 0,
			isSplitPayment = false,
			splitDetails = null,
			splitOrderData = null
		) => {
			// Get orderId from the cart store if not provided
			const effectiveOrderId = orderId || useCartStore.getState().orderId;

			if (!effectiveOrderId) {
				console.error("No orderId available when starting customer flow!");
			}

			setFlowActive(true);

			// For cash payments, start at the payment step directly
			const initialStep =
				paymentMethod === "cash" ? "payment" : CUSTOMER_FLOW_STEPS[0].id;

			setCurrentStep(initialStep);
			setStepData((prev) => ({
				...prev,
				orderId: effectiveOrderId, // Use the effective order ID
				paymentMethod,
				isSplitPayment,
				splitDetails,
				splitOrderData: splitOrderData
					? {
							...splitOrderData,
							orderId: effectiveOrderId, // Also ensure orderId in splitOrderData
					  }
					: null,
				cashData:
					paymentMethod === "cash"
						? {
								// Initialize with zero values for a fresh cash payment
								cashTendered: 0,
								change: 0,
								amountPaid: 0,
								remainingAmount: orderTotal,
								isFullyPaid: orderTotal <= 0,
								isSplitPayment,
						  }
						: undefined,
			}));

			customerDisplayManager.startCustomerFlow(
				cart,
				initialStep,
				paymentMethod,
				orderTotal,
				isSplitPayment,
				splitDetails,
				splitOrderData
					? {
							...splitOrderData,
							orderId: effectiveOrderId, // Ensure orderId in data sent to display
					  }
					: null
			);
		},
		[cart]
	);

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
		if (!flowActive) return;

		const handleStepCompletion = (step, data) => {
			// Store the data from the completed step
			setStepData((prev) => {
				const updated = { ...prev, [step]: data };

				// Determine the next step based on the completed step and payment method
				let nextStepId = null;

				// For cash payments, we have a simplified flow
				if (prev.paymentMethod === "cash") {
					if (step === "payment" && prev.cashPaymentComplete === true) {
						nextStepId = "receipt";
					} else if (step === "receipt") {
						setTimeout(completeFlow, 0);
						return updated;
					}
				} else {
					// Original credit card flow logic
					if (step === "rewards") {
						nextStepId = "tip";
					} else if (step === "tip" && data.tipAmount !== undefined) {
						updated.tipAmount = data.tipAmount;
						nextStepId = "payment";
					} else if (step === "payment") {
						updated.payment = data;
						nextStepId = "receipt";
					} else if (step === "receipt" && data.status === "complete") {
						console.log("Receipt view completed, ending flow");

						// Set a flag to indicate receipt is complete
						updated.receiptComplete = true;

						// Notify the credit payment view that the flow is complete
						setTimeout(() => {
							completeFlow();
						}, 500);
					} else {
						// For other steps, find the next in sequence
						const currentIndex = CUSTOMER_FLOW_STEPS.findIndex(
							(s) => s.id === step
						);
						if (currentIndex < CUSTOMER_FLOW_STEPS.length - 1) {
							nextStepId = CUSTOMER_FLOW_STEPS[currentIndex + 1].id;
						}
					}
				}

				// If we have a next step, update it
				if (nextStepId) {
					setTimeout(() => {
						setCurrentStep(nextStepId);
						customerDisplayManager.updateCustomerFlowStep(nextStepId, {
							...stepDataRef.current,
							[step]: data,
						});
					}, 0);
				}

				return updated;
			});
		};

		// Set up the listener
		const cleanup =
			customerDisplayManager.listenForCustomerFlowStepCompletion(
				handleStepCompletion
			);

		return cleanup;
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
