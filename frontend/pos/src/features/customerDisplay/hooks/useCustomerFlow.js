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

	// Start the customer flow
	const startFlow = useCallback(() => {
		setFlowActive(true);
		setCurrentStep(CUSTOMER_FLOW_STEPS[0].id);
		customerDisplayManager.startCustomerFlow(cart);
	}, [cart]);

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

				// Determine the next step based on the completed step
				let nextStepId = null;

				if (step === "rewards") {
					nextStepId = "tip";
				} else if (step === "tip" && data.tipAmount !== undefined) {
					updated.tipAmount = data.tipAmount;
					nextStepId = "payment";
				} else if (step === "payment") {
					// Store payment data for receipt
					updated.payment = data;
					nextStepId = "receipt";
				} else if (step === "receipt") {
					// Instead of directly calling completeFlow, schedule it
					setTimeout(completeFlow, 0);
					return updated;
				} else {
					// For other steps, find the next in sequence
					const currentIndex = CUSTOMER_FLOW_STEPS.findIndex(
						(s) => s.id === step
					);
					if (currentIndex < CUSTOMER_FLOW_STEPS.length - 1) {
						nextStepId = CUSTOMER_FLOW_STEPS[currentIndex + 1].id;
					}
				}

				// If we have a next step, update it (but after this state update completes)
				if (nextStepId) {
					// Use setTimeout to break the potential update cycle
					setTimeout(() => {
						setCurrentStep(nextStepId);
						// Use the latest stepData via the ref
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

	return {
		currentStep,
		flowActive,
		stepData,
		startFlow,
		nextStep,
		goToStep,
		completeFlow,
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
