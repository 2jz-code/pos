// frontend/features/customerDisplay/hooks/useTerminalSimulation.js

import { useState, useCallback, useRef, useEffect } from "react"; // Added useEffect
import axiosInstance from "../../../api/config/axiosConfig";
import { Decimal } from "decimal.js"; // Import Decimal for precision

export function useTerminalSimulation() {
	const [paymentStatus, setPaymentStatus] = useState("idle"); // idle, connecting, reader_check, processing, success, error
	const [paymentResult, setPaymentResult] = useState(null);
	const [error, setError] = useState("");
	const [pollingInterval, setPollingInterval] = useState(null);
	const [readerInfo, setReaderInfo] = useState(null);
	const currentPaymentIntentRef = useRef(null);
	const paymentDataRef = useRef(null); // Ref to store latest payment data for callbacks if needed
	const isMountedRef = useRef(false); // Track mount status

	// Mount/Unmount effect
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			stopPolling(); // Ensure polling stops on unmount
			currentPaymentIntentRef.current = null;
		};
	}, []); // Run only once on mount

	// Get the reader status and information
	const getReaderStatus = useCallback(async () => {
		// Note: No state changes directly related to this component's rendering here
		try {
			// setPaymentStatus("reader_check"); // Status change moved to processPayment

			const response = await axiosInstance.get(
				"payments/terminal/reader-status/"
			);

			if (response.data.success && response.data.reader) {
				const reader = response.data.reader;
				// Set reader info state in the hook if needed elsewhere
				// setReaderInfo(reader);
				if (reader.status !== "online") {
					throw new Error(
						`Terminal reader is ${reader.status}. Ensure device is on and connected.`
					);
				}
				console.log(
					`useTerminalSimulation - Reader Check Success: ${reader.id} (${reader.status})`
				);
				return reader; // Return the reader info
			} else {
				const msg =
					response.data?.error ||
					"No terminal reader found or info unavailable";
				throw new Error(msg);
			}
		} catch (err) {
			console.error(
				"useTerminalSimulation - Error getting reader status:",
				err
			);
			let errorMessage = "Failed to connect to terminal reader";
			if (err.response) {
				if (err.response.status === 404)
					errorMessage = "Terminal reader not found. Check registration.";
				else if (err.response.data?.error)
					errorMessage = err.response.data.error;
			} else if (err.message) {
				errorMessage = err.message;
			}
			// Throw the processed error message
			throw new Error(errorMessage);
		}
	}, []); // No dependencies needed here

	// Process payment with real terminal
	const processPayment = useCallback(
		async (orderData) => {
			paymentDataRef.current = orderData; // Store latest data

			try {
				if (
					paymentStatus === "processing" ||
					paymentStatus === "reader_check" ||
					paymentStatus === "connecting"
				) {
					console.warn(
						"useTerminalSimulation - Payment already in progress, ignoring new request"
					);
					return;
				}

				setPaymentStatus("connecting"); // Initial status
				setError("");
				setPaymentResult(null);
				setReaderInfo(null); // Reset reader info for new attempt

				console.log("useTerminalSimulation - Starting payment process...");
				setPaymentStatus("reader_check");
				const reader = await getReaderStatus(); // Check reader status first
				setReaderInfo(reader); // Store reader info after successful check

				// --- Amount Calculation & Logging ---
				console.log(
					"useTerminalSimulation - Received orderData for PI creation:",
					JSON.stringify(orderData, null, 2)
				);
				// Use Decimal for accuracy
				const baseAmountDecimal = new Decimal(orderData?.total || 0);
				const tipDecimal = new Decimal(orderData?.tipAmount || 0);
				const calculatedAmountDecimal = baseAmountDecimal.plus(tipDecimal);
				const finalAmountToCharge = parseFloat(
					calculatedAmountDecimal.toFixed(2)
				); // Final numeric value

				console.log(
					`useTerminalSimulation - Base Amount: ${baseAmountDecimal.toString()}, Tip: ${tipDecimal.toString()}, Calculated Total for PI: ${finalAmountToCharge}`
				);
				// --- End Logging ---

				const orderId = orderData.orderId;
				if (!orderId) {
					console.error("useTerminalSimulation - Missing orderId:", orderData);
					throw new Error("Order ID is required for payment processing");
				}

				// --- API call to create PI ---
				console.log(
					`useTerminalSimulation - Sending amount ${finalAmountToCharge} to create-payment-intent...`
				);
				const response = await axiosInstance.post(
					"payments/terminal/create-payment-intent/",
					{
						amount: finalAmountToCharge, // *** Send the calculated total (base + tip) ***
						description: orderData.isSplitPayment
							? `Split Pmt (Order ${orderId})`
							: `Order ${orderId}`,
						order_id: orderId,
						metadata: {
							is_split_payment: orderData.isSplitPayment ? "true" : "false",
							split_amount: orderData.isSplitPayment
								? finalAmountToCharge.toString()
								: "",
							// Pass the original total if available, otherwise use the base for this step
							original_total: (
								orderData.originalTotal ??
								orderData.total ??
								0
							).toString(),
							tip_amount: tipDecimal.toFixed(2), // Pass tip as string metadata
							order_id: orderId.toString(),
						},
					}
				);

				const paymentIntentId = response.data.id;
				console.log(`useTerminalSimulation - Created PI: ${paymentIntentId}`);
				currentPaymentIntentRef.current = paymentIntentId; // Store current PI ID

				// Process payment on terminal
				setPaymentStatus("processing_intent");
				console.log(
					`useTerminalSimulation - Requesting process PI ${paymentIntentId} on reader ${reader.id}`
				);
				await axiosInstance.post("payments/terminal/process-payment-method/", {
					reader_id: reader.id,
					payment_intent_id: paymentIntentId,
				});
				console.log(
					`useTerminalSimulation - Process request sent for PI ${paymentIntentId}`
				);
				// Start polling (polling function will update status further)
				startPollingPaymentStatus(paymentIntentId);
			} catch (err) {
				console.error("useTerminalSimulation - Error processing payment:", err);
				const errorMsg =
					err.response?.data?.error ||
					err.message ||
					"Failed to process payment";
				setError(errorMsg);
				setPaymentStatus("error");
				currentPaymentIntentRef.current = null;
			}
		},
		[getReaderStatus] // Include getReaderStatus which is stable due to its own useCallback
	);

	// Handle successful payment
	const handlePaymentSuccess = useCallback(
		(paymentIntentData) => {
			if (!isMountedRef.current) return;

			console.log(
				"useTerminalSimulation - handlePaymentSuccess received PI data:",
				JSON.stringify(paymentIntentData, null, 2)
			);
			setPaymentStatus("success");

			let cardInfo = { last4: "****", brand: "Card" };
			// Safely access nested card details from charge object
			const charge = paymentIntentData?.charges?.data?.[0];
			const cardPresentDetails = charge?.payment_method_details?.card_present;

			if (cardPresentDetails) {
				cardInfo = {
					last4: cardPresentDetails.last4 || "****",
					brand: cardPresentDetails.brand || "Card",
				};
			}

			// *** FIX: Amount reported back should be the amount FROM the successful Payment Intent ***
			const finalChargedAmount = (Number(paymentIntentData.amount) || 0) / 100; // Amount from PI (in cents)
			console.log(
				`useTerminalSimulation - handlePaymentSuccess - Amount from PI: ${paymentIntentData.amount} cents -> $${finalChargedAmount}`
			);
			// *** END FIX ***

			// *** FIX: Get tip amount from metadata if PI has it, otherwise from original paymentData ref ***
			const tipAmountFromMetadata =
				Number(paymentIntentData?.metadata?.tip_amount) || 0;
			// Fallback to data used when starting the payment IF metadata tip is missing
			const tipAmountFromOriginalData = paymentDataRef.current?.tipAmount || 0;
			const finalTipAmount =
				tipAmountFromMetadata > 0
					? tipAmountFromMetadata
					: tipAmountFromOriginalData;
			console.log(
				`useTerminalSimulation - handlePaymentSuccess - Final Tip Amount: $${finalTipAmount}`
			);
			// *** END FIX ***

			const result = {
				status: "success",
				transactionId: paymentIntentData.id, // Use PI ID
				amount: finalChargedAmount, // *** Use amount from the successful PI ***
				timestamp: new Date(paymentIntentData.created * 1000).toISOString(), // Use PI creation time
				cardInfo: cardInfo,
				reader: readerInfo
					? {
							id: readerInfo.id,
							label: readerInfo.label,
							deviceType: readerInfo.device_type,
					  }
					: null,
				// Include split details and tip from metadata/original data
				splitPayment: paymentIntentData.metadata?.is_split_payment === "true",
				// Use parseFloat for safety when reading from metadata
				splitAmount: parseFloat(
					paymentIntentData.metadata?.split_amount || finalChargedAmount
				),
				originalTotal: parseFloat(
					paymentIntentData.metadata?.original_total || finalChargedAmount
				),
				tipAmount: finalTipAmount, // Include the determined tip amount
			};

			console.log(
				"useTerminalSimulation - handlePaymentSuccess - Final Result Object:",
				result
			);
			setPaymentResult(result); // Update local state with the result

			// Send result back to parent window using postMessage
			if (window.opener) {
				window.opener.postMessage(
					{ type: "PAYMENT_RESULT", content: result },
					"*"
				);
				console.log(
					"useTerminalSimulation - Sent PAYMENT_RESULT to opener window."
				);
			} else {
				console.warn(
					"useTerminalSimulation - window.opener not available, cannot send PAYMENT_RESULT."
				);
			}

			// Clean up polling and PI ref
			if (pollingInterval) clearInterval(pollingInterval);
			setPollingInterval(null);
			currentPaymentIntentRef.current = null;

			// Close the terminal window after a delay
			// setTimeout(() => { window.close(); }, 3000); // Decided by parent component now
		},
		[readerInfo, pollingInterval]
	); // Dependencies

	// Stop polling
	const stopPolling = useCallback(() => {
		if (pollingInterval) {
			console.log("useTerminalSimulation - Stopping polling interval.");
			clearInterval(pollingInterval);
			setPollingInterval(null);
		}
	}, [pollingInterval]);

	// Capture a payment that requires capture
	const capturePayment = useCallback(
		async (intentId) => {
			try {
				await axiosInstance.post("payments/terminal/capture-payment/", {
					payment_intent_id: intentId,
				});
				console.log(
					`useTerminalSimulation - Capture request sent for PI ${intentId}`
				);
			} catch (err) {
				console.error(
					`useTerminalSimulation - Error capturing payment ${intentId}:`,
					err
				);
				// Capture failure might need specific handling or error state
				setError(
					`Failed to capture payment: ${
						err.response?.data?.error || err.message
					}`
				);
				setPaymentStatus("error");
				stopPolling(); // Stop polling if capture fails decisively
				currentPaymentIntentRef.current = null;
			}
		},
		[stopPolling]
	); // Added stopPolling dependency

	// Poll for payment intent status
	const startPollingPaymentStatus = useCallback(
		(paymentIntentId) => {
			if (pollingInterval) clearInterval(pollingInterval);

			console.log(
				`useTerminalSimulation - Starting polling for PI: ${paymentIntentId}`
			);

			const checkStatus = async () => {
				if (currentPaymentIntentRef.current !== paymentIntentId) {
					console.log(
						`useTerminalSimulation - Polling stopped: PI changed from ${paymentIntentId} to ${currentPaymentIntentRef.current}`
					);
					clearInterval(newInterval);
					setPollingInterval(null);
					return;
				}
				try {
					console.log(
						`useTerminalSimulation - Polling check for ${paymentIntentId}...`
					);
					const response = await axiosInstance.get(
						`payments/terminal/payment-status/${paymentIntentId}/`
					);
					const intentData = response.data; // Store the full PI data
					const intentStatus = intentData.status;
					console.log(
						`useTerminalSimulation - Poll Status for ${paymentIntentId}: ${intentStatus}`
					);

					if (intentStatus === "succeeded") {
						clearInterval(newInterval);
						setPollingInterval(null);
						handlePaymentSuccess(intentData); // Pass full PI data
					} else if (intentStatus === "requires_capture") {
						console.log(
							`useTerminalSimulation - PI ${paymentIntentId} requires capture. Capturing...`
						);
						await capturePayment(paymentIntentId);
					} else if (intentStatus === "canceled") {
						clearInterval(newInterval);
						setPollingInterval(null);
						setError("Payment was canceled.");
						setPaymentStatus("error");
						currentPaymentIntentRef.current = null;
					} else if (intentStatus === "requires_payment_method") {
						if (paymentStatus !== "waiting_for_card")
							setPaymentStatus("waiting_for_card");
					} else if (intentStatus === "processing") {
						if (paymentStatus !== "processing") setPaymentStatus("processing");
					} else if (intentStatus === "requires_action") {
						// Handle potential 3DS or other actions if needed for terminal
						console.log(
							`useTerminalSimulation - PI ${paymentIntentId} requires action.`
						);
						// For terminal, this usually means waiting for customer interaction
						if (paymentStatus !== "processing") setPaymentStatus("processing"); // Keep showing processing
					} else if (intentStatus === "requires_confirmation") {
						// This status is less common for terminal auto-capture
						console.log(
							`useTerminalSimulation - PI ${paymentIntentId} requires confirmation.`
						);
						if (paymentStatus !== "processing") setPaymentStatus("processing");
					}
				} catch (err) {
					console.error(
						`useTerminalSimulation - Error polling status for ${paymentIntentId}:`,
						err
					);
				}
			};

			checkStatus(); // Initial check
			const newInterval = setInterval(checkStatus, 2500);
			setPollingInterval(newInterval);
		},
		[pollingInterval, handlePaymentSuccess, capturePayment]
	); // Added capturePayment

	// Cancel an in-progress payment
	const cancelPayment = useCallback(async () => {
		const intentIdToCancel = currentPaymentIntentRef.current;
		if (!intentIdToCancel) {
			console.log(
				"useTerminalSimulation - No active payment intent to cancel."
			);
			return;
		}

		try {
			console.log(
				`useTerminalSimulation - Attempting to cancel PI: ${intentIdToCancel}`
			);
			await axiosInstance.post("payments/terminal/cancel-action/", {
				reader_id: readerInfo?.id,
				payment_intent_id: intentIdToCancel, // Pass intent ID if backend needs it for cancellation context
			});

			stopPolling();
			setError("Payment canceled by user.");
			setPaymentStatus("error"); // Treat cancel as an error/end state for this flow
			currentPaymentIntentRef.current = null;
		} catch (err) {
			console.error(
				`useTerminalSimulation - Error canceling payment ${intentIdToCancel}:`,
				err
			);
			setError("Failed to cancel payment.");
			// Consider if status should change if cancellation fails
		}
	}, [readerInfo, stopPolling]);

	return {
		processPayment,
		paymentStatus,
		paymentResult,
		error,
		readerInfo,
		cancelPayment,
	};
}
