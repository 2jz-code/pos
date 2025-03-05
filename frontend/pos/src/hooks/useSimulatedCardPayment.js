// src/hooks/useSimulatedCardPayment.js
import { useState, useCallback } from "react";

export const useSimulatedCardPayment = () => {
	const [status, setStatus] = useState("idle");
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState(null);
	const [tipAmount, setTipAmount] = useState(0);
	const [cardData, setCardData] = useState(null);

	// Define the flow steps
	const FLOW_STEPS = {
		IDLE: "idle",
		AMOUNT_CONFIRMATION: "amount_confirmation",
		TIP_PROMPT: "tip_prompt",
		WAITING_FOR_CARD: "waiting_for_card",
		PROCESSING: "processing",
		APPROVED: "approved",
		DECLINED: "declined",
		ERROR: "error",
		CANCELLED: "cancelled",
	};

	// Reset the payment flow
	const resetPayment = useCallback(() => {
		setStatus(FLOW_STEPS.IDLE);
		setIsProcessing(false);
		setError(null);
		setTipAmount(0);
		setCardData(null);
	}, [FLOW_STEPS.IDLE]);

	// Simulate starting a payment
	const startPayment = useCallback(
		(amount) => {
			resetPayment();
			setStatus(FLOW_STEPS.AMOUNT_CONFIRMATION);
			setIsProcessing(true);

			return new Promise((resolve) => {
				// Simulate a slight delay before showing the amount confirmation
				setTimeout(() => {
					resolve({
						status: FLOW_STEPS.AMOUNT_CONFIRMATION,
						amount,
					});
				}, 500);
			});
		},
		[FLOW_STEPS.AMOUNT_CONFIRMATION, resetPayment]
	);

	// Confirm the payment amount
	const confirmAmount = useCallback(() => {
		setStatus(FLOW_STEPS.TIP_PROMPT);

		return new Promise((resolve) => {
			resolve({
				status: FLOW_STEPS.TIP_PROMPT,
			});
		});
	}, [FLOW_STEPS.TIP_PROMPT]);

	// Handle tip selection
	const addTip = useCallback(
		(amount) => {
			setTipAmount(amount);
			setStatus(FLOW_STEPS.WAITING_FOR_CARD);

			return new Promise((resolve) => {
				resolve({
					status: FLOW_STEPS.WAITING_FOR_CARD,
					tipAmount: amount,
				});
			});
		},
		[FLOW_STEPS.WAITING_FOR_CARD]
	);

	// Simulate card entry
	const processCard = useCallback(
		(cardType = "VISA") => {
			setStatus(FLOW_STEPS.PROCESSING);

			return new Promise((resolve, reject) => {
				// Simulate processing delay
				setTimeout(() => {
					// 90% chance of success
					const isSuccess = Math.random() < 0.9;

					if (isSuccess) {
						const lastFour = Math.floor(1000 + Math.random() * 9000).toString();
						const transactionId = `TXN-${Date.now()}-${Math.floor(
							Math.random() * 1000
						)}`;

						const cardData = {
							transactionId,
							cardType,
							lastFour,
							tipAmount,
						};

						setCardData(cardData);
						setStatus(FLOW_STEPS.APPROVED);
						setIsProcessing(false);
						resolve(cardData);
					} else {
						setStatus(FLOW_STEPS.DECLINED);
						setIsProcessing(false);
						setError("Card declined. Please try another payment method.");
						reject(new Error("Card declined"));
					}
				}, 2000);
			});
		},
		[FLOW_STEPS.APPROVED, FLOW_STEPS.DECLINED, FLOW_STEPS.PROCESSING, tipAmount]
	);

	// Cancel the payment
	const cancelPayment = useCallback(() => {
		setStatus(FLOW_STEPS.CANCELLED);
		setIsProcessing(false);
		setError("Payment cancelled");

		return Promise.resolve({
			status: FLOW_STEPS.CANCELLED,
		});
	}, [FLOW_STEPS.CANCELLED]);

	const simulateDecline = useCallback(() => {
		setStatus(FLOW_STEPS.PROCESSING);

		return new Promise((resolve, reject) => {
			// Simulate processing delay
			setTimeout(() => {
				setStatus(FLOW_STEPS.DECLINED);
				setIsProcessing(false);
				setError("Card declined. Please try another payment method.");
				reject(new Error("Card declined"));
			}, 2000);
		});
	}, [FLOW_STEPS.PROCESSING, FLOW_STEPS.DECLINED]);

	// Make sure to return this function in the hook's return value
	return {
		status,
		isProcessing,
		error,
		tipAmount,
		cardData,
		flowSteps: FLOW_STEPS,
		startPayment,
		confirmAmount,
		addTip,
		processCard,
		simulateDecline,
		cancelPayment,
		resetPayment,
	};
};
