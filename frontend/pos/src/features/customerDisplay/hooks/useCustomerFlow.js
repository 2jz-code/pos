// features/customerDisplay/hooks/useCustomerFlow.js

import { useState, useEffect, useCallback } from "react";
import { useCartStore } from "../../../store/cartStore";
import customerDisplayManager from "../utils/windowManager";
import { CUSTOMER_FLOW_STEPS } from "../../payment/constants/paymentFlowSteps";

export function useCustomerFlow() {
	const [currentStep, setCurrentStep] = useState(null);
	const [flowActive, setFlowActive] = useState(false);
	const [stepData, setStepData] = useState({});
	const cart = useCartStore((state) => state.cart);

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
			customerDisplayManager.updateCustomerFlowStep(nextStepId, stepData);
			return true;
		}
		return false;
	}, [currentStep, stepData]);

	// Go to a specific step
	const goToStep = useCallback(
		(stepId, additionalData = {}) => {
			if (CUSTOMER_FLOW_STEPS.some((step) => step.id === stepId)) {
				setCurrentStep(stepId);
				const newStepData = { ...stepData, ...additionalData };
				setStepData(newStepData);
				customerDisplayManager.updateCustomerFlowStep(stepId, newStepData);
				return true;
			}
			return false;
		},
		[stepData]
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
		if (flowActive) {
			return customerDisplayManager.listenForCustomerFlowStepCompletion(
				(step, data) => {
					// Store the data from the completed step
					setStepData((prev) => ({ ...prev, [step]: data }));

					// Auto-advance to the next step based on the current step
					if (step === "rewards") {
						// After rewards, go to tip selection
						setCurrentStep("tip");
						customerDisplayManager.updateCustomerFlowStep("tip", {
							...stepData,
							[step]: data,
						});
					} else if (step === "tip") {
						// After tip selection, go to payment
						setCurrentStep("payment");
						customerDisplayManager.updateCustomerFlowStep("payment", {
							...stepData,
							[step]: data,
						});
					} else if (step === "payment") {
						// After payment, go to receipt
						setCurrentStep("receipt");
						customerDisplayManager.updateCustomerFlowStep("receipt", {
							...stepData,
							[step]: data,
						});
					} else if (step === "receipt") {
						// If it's the last step, complete the flow
						completeFlow();
					} else {
						// For other steps, just advance to the next one in sequence
						const currentIndex = CUSTOMER_FLOW_STEPS.findIndex(
							(s) => s.id === step
						);
						if (currentIndex < CUSTOMER_FLOW_STEPS.length - 1) {
							const nextStepId = CUSTOMER_FLOW_STEPS[currentIndex + 1].id;
							setCurrentStep(nextStepId);
							customerDisplayManager.updateCustomerFlowStep(nextStepId, {
								...stepData,
								[step]: data,
							});
						}
					}
				}
			);
		}
	}, [flowActive, stepData, completeFlow]);

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
