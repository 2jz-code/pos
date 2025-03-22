// features/payment/hooks/useTerminalSimulation.js

import { useState, useCallback, useRef } from "react";
import axiosInstance from "../../../api/config/axiosConfig";

export function useTerminalSimulation() {
	const [paymentStatus, setPaymentStatus] = useState("idle"); // idle, connecting, reader_check, processing, success, error
	const [paymentResult, setPaymentResult] = useState(null);
	const [error, setError] = useState("");
	const [pollingInterval, setPollingInterval] = useState(null);
	const [readerInfo, setReaderInfo] = useState(null);
	const currentPaymentIntentRef = useRef(null);

	// Get the reader status and information
	const getReaderStatus = useCallback(async () => {
		try {
			setPaymentStatus("reader_check");

			// Use the updated endpoint that returns a single reader
			const response = await axiosInstance.get(
				"payments/terminal/reader-status/"
			);

			if (response.data.success && response.data.reader) {
				const reader = response.data.reader;

				// Store reader information for reference
				setReaderInfo(reader);

				// Check if reader is online
				if (reader.status !== "online") {
					throw new Error(
						`Terminal reader is ${reader.status}. Please ensure the device is powered on and connected.`
					);
				}

				return reader;
			} else {
				throw new Error(
					"No terminal reader found or reader information not available"
				);
			}
		} catch (err) {
			console.error("Error getting reader status:", err);

			// Generate a user-friendly error message
			let errorMessage = "Failed to connect to terminal reader";

			if (err.response) {
				// Server responded with an error
				if (err.response.status === 404) {
					errorMessage =
						"Terminal reader not found. Please check device registration in Stripe.";
				} else if (err.response.data && err.response.data.error) {
					errorMessage = err.response.data.error;
				}
			} else if (err.message) {
				errorMessage = err.message;
			}

			throw new Error(errorMessage);
		}
	}, []);

	// Process payment with real terminal
	const processPayment = useCallback(
		async (orderData) => {
			try {
				// If we're already processing a payment, don't start another one
				if (
					paymentStatus === "processing" ||
					paymentStatus === "reader_check"
				) {
					console.warn("Payment already in progress, ignoring new request");
					return;
				}

				setPaymentStatus("connecting");
				setError("");
				setReaderInfo(null);

				// Check reader status first
				const reader = await getReaderStatus();

				// Get the amount to charge - either split amount or full amount
				const amount = orderData.total + (orderData.tipAmount || 0);

				console.log(
					`Processing payment with amount: ${amount}`,
					`isSplitPayment: ${orderData.isSplitPayment}`,
					`originalTotal: ${orderData.originalTotal || "N/A"}`
				);

				// Create payment intent with metadata for split payments
				const response = await axiosInstance.post(
					"payments/terminal/create-payment-intent/",
					{
						amount: amount,
						description: orderData.isSplitPayment
							? "POS Split Payment"
							: "POS Terminal Payment",
						order_id: orderData.orderId,
						metadata: {
							is_split_payment: orderData.isSplitPayment ? "true" : "false",
							split_amount: orderData.isSplitPayment ? amount.toString() : "",
							original_total: orderData.originalTotal
								? orderData.originalTotal.toString()
								: "",
							remaining_after: orderData.isSplitPayment
								? (orderData.originalTotal - amount).toString()
								: "",
						},
					}
				);

				const paymentIntentId = response.data.id;

				// Store the payment intent ID
				currentPaymentIntentRef.current = paymentIntentId;

				// 3. Process payment on terminal using the confirmed reader
				setPaymentStatus("processing");
				await axiosInstance.post("payments/terminal/process-payment-method/", {
					reader_id: reader.id,
					payment_intent_id: paymentIntentId,
				});

				// 4. Start polling for payment completion
				startPollingPaymentStatus(paymentIntentId);
			} catch (err) {
				console.error("Error processing payment:", err);
				setError(err.message || "Failed to process payment");
				setPaymentStatus("error");
				// Clear the payment intent ID on error
				currentPaymentIntentRef.current = null;
			}
		},
		[getReaderStatus]
	);

	// Start polling for payment status
	const startPollingPaymentStatus = useCallback(
		(paymentIntentId) => {
			// Clear any existing polling
			if (pollingInterval) {
				clearInterval(pollingInterval);
				setPollingInterval(null);
			}

			// Verify this is still the current payment intent
			if (currentPaymentIntentRef.current !== paymentIntentId) {
				console.warn("Payment intent ID mismatch, not starting polling");
				return;
			}

			console.log(
				`Starting to poll payment status for intent: ${paymentIntentId}`
			);

			// Poll every 2 seconds
			const interval = setInterval(async () => {
				// Skip polling if this is no longer the current payment intent
				if (currentPaymentIntentRef.current !== paymentIntentId) {
					clearInterval(interval);
					return;
				}

				try {
					const response = await axiosInstance.get(
						`payments/terminal/payment-status/${paymentIntentId}/`
					);

					const status = response.data.status;
					console.log(`Payment status for ${paymentIntentId}: ${status}`);

					if (status === "succeeded") {
						// Payment succeeded
						clearInterval(interval);
						setPollingInterval(null);
						setPaymentStatus("success");

						// Extract card details if available
						const cardDetails = response.data.card_details || {};

						// Get the actual amount charged from the response
						const chargedAmount = response.data.amount / 100; // Convert from cents

						const result = {
							status: "success",
							transactionId: response.data.id,
							amount: chargedAmount, // Make sure to use the actual charged amount
							timestamp: new Date().toISOString(),
							cardInfo: {
								brand: cardDetails.brand || "Card",
								last4: cardDetails.last4 || "****",
							},
							reader: readerInfo
								? {
										id: readerInfo.id,
										label: readerInfo.label,
										deviceType: readerInfo.device_type,
								  }
								: null,
							// Add split payment information
							splitPayment: response.data.metadata?.is_split_payment === "true",
							splitAmount: parseFloat(
								response.data.metadata?.split_amount || chargedAmount
							),
							originalTotal: parseFloat(
								response.data.metadata?.original_total || chargedAmount
							),
						};

						setPaymentResult(result);

						// Clear the payment intent ID on success
						currentPaymentIntentRef.current = null;
					} else if (status === "canceled") {
						// Payment was canceled
						clearInterval(interval);
						setPollingInterval(null);
						setError("Payment was canceled");
						setPaymentStatus("error");

						// Clear the payment intent ID on cancellation
						currentPaymentIntentRef.current = null;
					} else if (status === "requires_payment_method") {
						// Still waiting for card
						// We don't need to do anything special here, just continue polling
					} else if (status === "requires_capture") {
						// Payment needs to be captured
						try {
							await axiosInstance.post("payments/terminal/capture-payment/", {
								payment_intent_id: paymentIntentId,
							});
							// Continue polling to confirm the capture
						} catch (captureErr) {
							console.error("Error capturing payment:", captureErr);
							// Continue polling, the next poll might show success anyway
						}
					}
				} catch (err) {
					console.error("Error checking payment status:", err);
					// Don't set error state here as it might be a temporary network issue
				}
			}, 2000);

			setPollingInterval(interval);

			// Return cleanup function
			return () => {
				clearInterval(interval);
				setPollingInterval(null);
			};
		},
		[pollingInterval, readerInfo]
	);

	// Stop polling
	const stopPolling = useCallback(() => {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			setPollingInterval(null);
		}
	}, [pollingInterval]);

	// Cancel an in-progress payment
	const cancelPayment = useCallback(
		async (paymentIntentId) => {
			if (!paymentIntentId) return;

			try {
				await axiosInstance.post("payments/terminal/cancel-payment/", {
					payment_intent_id: paymentIntentId,
				});

				stopPolling();
				setPaymentStatus("idle");
				setError("Payment canceled");
			} catch (err) {
				console.error("Error canceling payment:", err);
				setError("Failed to cancel payment");
			}
		},
		[stopPolling]
	);

	return {
		processPayment,
		paymentStatus,
		paymentResult,
		error,
		stopPolling,
		cancelPayment,
		readerInfo,
	};
}
