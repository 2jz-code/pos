// features/payment/components/TerminalSimulation.jsx

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import axiosInstance from "../../../../api/config/axiosConfig";

const TerminalSimulation = ({ paymentData = {}, onPaymentResult }) => {
	const [processingPayment, setProcessingPayment] = useState(false);
	const [error, setError] = useState("");
	const [localPaymentData, setLocalPaymentData] = useState(paymentData);
	const [paymentIntentId, setPaymentIntentId] = useState(null);
	const [readerId, setReaderId] = useState(null);
	const [paymentStatus, setPaymentStatus] = useState("idle"); // idle, connecting, creating_intent, processing_intent, waiting_for_card, processing, success, error
	const [connectionToken, setConnectionToken] = useState(null);
	const [statusMessage, setStatusMessage] = useState("");

	// Timer for polling payment status
	const statusPollingRef = useRef(null);

	// Keep a ref to paymentData for async callbacks
	const paymentDataRef = useRef(paymentData);

	useEffect(() => {
		paymentDataRef.current = localPaymentData;
	}, [localPaymentData]);

	useEffect(() => {
		// Notify parent window that terminal is ready
		if (window.opener) {
			window.opener.postMessage("TERMINAL_SIMULATION_READY", "*");
		}

		// Listen for payment requests
		const handleMessage = (event) => {
			if (
				event.source === window.opener &&
				event.data.type === "PAYMENT_REQUEST"
			) {
				// Update local payment data state with the received data
				const newPaymentData = event.data.content;
				console.log("Received payment data:", newPaymentData);
				setLocalPaymentData(newPaymentData);

				// Start the payment flow
				startPaymentFlow(newPaymentData);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);

			// Clear any polling intervals
			if (statusPollingRef.current) {
				clearInterval(statusPollingRef.current);
			}
		};
	}, []);

	// Start the payment flow by getting a connection token and discovering readers
	const startPaymentFlow = async (data) => {
		try {
			setPaymentStatus("connecting");
			setError("");
			setStatusMessage("Connecting to terminal...");

			// 1. Get a connection token from your backend
			const tokenResponse = await axiosInstance.post(
				"payments/terminal/connection-token/"
			);
			setConnectionToken(tokenResponse.data.secret);

			// 2. Get available readers (in test mode, we'll get a simulated reader)
			const readersResponse = await axiosInstance.get(
				"payments/terminal/reader-status/"
			);

			if (
				readersResponse.data.readers &&
				readersResponse.data.readers.length > 0
			) {
				// Use the first available reader
				const reader = readersResponse.data.readers[0];
				setReaderId(reader.id);
				setStatusMessage(`Connected to terminal: ${reader.label || reader.id}`);

				// Proceed to create a payment intent
				await createPaymentIntent(data, reader.id);
			} else {
				throw new Error(
					"No terminal readers available. Please register a test reader in Stripe Dashboard."
				);
			}
		} catch (err) {
			console.error("Error starting payment flow:", err);
			setError(err.message || "Failed to connect to payment terminal");
			setPaymentStatus("error");
		}
	};

	// Create a payment intent
	const createPaymentIntent = async (data, readerId) => {
		try {
			setPaymentStatus("creating_intent");
			setStatusMessage("Creating payment...");

			// Calculate total with tip
			const amount = data.total + (data.tipAmount || 0);

			// Create payment intent via your existing backend
			const response = await axiosInstance.post(
				"payments/terminal/create-payment-intent/",
				{
					amount: amount, // Convert to cents
					description: "POS Terminal Payment",
					order_id: data.orderId,
				}
			);

			setPaymentIntentId(response.data.id);

			// Now process the payment intent on the reader (new step)
			await processPaymentIntent(response.data.id, readerId);
		} catch (err) {
			console.error("Error creating payment intent:", err);
			setError(
				err.response?.data?.error || err.message || "Failed to create payment"
			);
			setPaymentStatus("error");
		}
	};

	// Process the payment intent on the reader (new method)
	const processPaymentIntent = async (intentId, readerId) => {
		try {
			setPaymentStatus("processing_intent");
			setStatusMessage("Processing payment on terminal...");

			// Process the payment intent on the reader using the new endpoint
			await axiosInstance.post("payments/terminal/process-payment-method/", {
				reader_id: readerId,
				payment_intent_id: intentId,
			});

			// After successfully processing on the reader, move to waiting for card
			setPaymentStatus("waiting_for_card");
			setStatusMessage(
				"Ready for card. Please tap, insert, or swipe your card."
			);

			// Start polling for payment intent status
			startPaymentStatusPolling(intentId);
		} catch (err) {
			console.error("Error processing payment intent on reader:", err);
			setError(
				err.response?.data?.error ||
					err.message ||
					"Failed to process payment on terminal"
			);
			setPaymentStatus("error");
		}
	};

	// Poll for payment intent status
	const startPaymentStatusPolling = (intentId) => {
		// Clear any existing interval
		if (statusPollingRef.current) {
			clearInterval(statusPollingRef.current);
		}

		// Check status immediately and then every 2 seconds
		checkPaymentStatus(intentId);

		statusPollingRef.current = setInterval(() => {
			checkPaymentStatus(intentId);
		}, 2000);
	};

	// Check payment intent status
	const checkPaymentStatus = async (intentId) => {
		try {
			const response = await axiosInstance.get(
				`payments/terminal/payment-status/${intentId}/`
			);

			const status = response.data.status;

			// Update UI based on status
			if (status === "succeeded") {
				// Payment succeeded
				clearInterval(statusPollingRef.current);
				handlePaymentSuccess(response.data);
			} else if (status === "requires_payment_method") {
				// Terminal is waiting for card
				setPaymentStatus("waiting_for_card");
			} else if (status === "processing") {
				// Payment is being processed
				setPaymentStatus("processing");
				setStatusMessage("Processing payment...");
			} else if (status === "requires_capture") {
				// Need to capture the payment
				capturePayment(intentId);
			} else if (status === "canceled") {
				// Payment was canceled
				clearInterval(statusPollingRef.current);
				setError("Payment was canceled");
				setPaymentStatus("error");
			}
		} catch (err) {
			console.error("Error checking payment status:", err);
			// Don't set error state here as it might be a temporary network issue
		}
	};

	// Capture a payment that requires capture
	const capturePayment = async (intentId) => {
		try {
			const response = await axiosInstance.post(
				"payments/terminal/capture-payment/",
				{
					payment_intent_id: intentId,
				}
			);

			if (response.data.status === "succeeded") {
				handlePaymentSuccess(response.data);
			}
		} catch (err) {
			console.error("Error capturing payment:", err);
			setError(
				"Failed to capture payment: " +
					(err.response?.data?.error || err.message)
			);
			setPaymentStatus("error");
			clearInterval(statusPollingRef.current);
		}
	};

	// Handle successful payment
	const handlePaymentSuccess = (paymentData) => {
		setPaymentStatus("success");

		// Extract card info if available
		let cardInfo = {
			last4: "****",
			brand: "Card",
		};

		if (paymentData.payment_method_details?.card_present) {
			cardInfo = {
				last4: paymentData.payment_method_details.card_present.last4,
				brand: paymentData.payment_method_details.card_present.brand,
			};
		}

		const result = {
			status: "success",
			transactionId: paymentData.id,
			amount:
				paymentDataRef.current.total + (paymentDataRef.current.tipAmount || 0),
			timestamp: new Date().toISOString(),
			cardInfo: cardInfo,
		};

		// Send result back to parent
		if (onPaymentResult) {
			onPaymentResult(result);
		}

		if (window.opener) {
			window.opener.postMessage(
				{
					type: "PAYMENT_RESULT",
					content: result,
				},
				"*"
			);
		}

		// Close the terminal window after a delay
		setTimeout(() => {
			window.close();
		}, 3000);
	};

	// Simulate card tap using Stripe's Test Helpers API
	const simulateCardTap = async () => {
		if (!readerId) {
			setError("No reader connected. Please try again.");
			return;
		}

		try {
			setPaymentStatus("processing");
			setProcessingPayment(true);
			setStatusMessage("Processing card...");

			// Call your backend to use Stripe's Test Helpers API
			await axiosInstance.post("payments/terminal/present-payment-method/", {
				reader_id: readerId,
			});

			// The status polling will pick up the change in payment status
		} catch (err) {
			console.error("Error simulating card tap:", err);
			setError(
				"Failed to process card: " + (err.response?.data?.error || err.message)
			);
			setPaymentStatus("error");
		} finally {
			setProcessingPayment(false);
		}
	};

	// Simulate card decline
	const simulateCardDecline = async () => {
		setError(
			"This feature is not available in the current Stripe Terminal API. Only successful payments can be simulated."
		);
	};

	// Format currency
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	// Calculate total including tip
	const amount = localPaymentData?.total || 0;
	const tipAmount = localPaymentData?.tipAmount || 0;
	const subtotal = localPaymentData?.subtotal || 0;
	const tax = localPaymentData?.tax || 0;
	const total = amount + tipAmount;

	return (
		<div className="bg-slate-100 min-h-screen flex flex-col">
			{/* Terminal header */}
			<div className="bg-slate-800 text-white p-4 text-center">
				<h1 className="text-xl font-bold">Payment Terminal</h1>
				<p className="text-sm text-slate-300">Stripe Terminal Simulation</p>
			</div>

			{/* Transaction details */}
			<div className="bg-white p-4 mb-4 shadow-sm">
				<div className="flex justify-between mb-2">
					<span className="text-slate-600">Subtotal:</span>
					<span>{formatCurrency(subtotal || 0)}</span>
				</div>
				<div className="flex justify-between mb-2">
					<span className="text-slate-600">Tax:</span>
					<span>{formatCurrency(tax || 0)}</span>
				</div>
				{tipAmount > 0 && (
					<div className="flex justify-between mb-2">
						<span className="text-slate-600">Tip:</span>
						<span>{formatCurrency(tipAmount || 0)}</span>
					</div>
				)}
				<div className="flex justify-between font-bold text-lg pt-2 border-t">
					<span>Total:</span>
					<span>{formatCurrency(total)}</span>
				</div>
			</div>

			{/* Payment interface */}
			<div className="flex-1 p-4">
				{(paymentStatus === "connecting" ||
					paymentStatus === "idle" ||
					paymentStatus === "creating_intent" ||
					paymentStatus === "processing_intent") && (
					<div className="text-center py-8">
						<motion.div
							className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
						/>
						<h2 className="text-xl font-semibold mb-2">
							{paymentStatus === "connecting"
								? "Connecting to Terminal"
								: paymentStatus === "creating_intent"
								? "Creating Payment"
								: paymentStatus === "processing_intent"
								? "Preparing Terminal"
								: "Initializing"}
						</h2>
						<p className="text-slate-600">{statusMessage}</p>
					</div>
				)}

				{paymentStatus === "waiting_for_card" && (
					<div className="bg-white p-6 rounded-lg shadow-sm">
						<div className="text-center mb-6">
							<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-8 w-8 text-blue-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
									/>
								</svg>
							</div>
							<h2 className="text-xl font-semibold mb-2">Ready for Payment</h2>
							<p className="text-slate-600 mb-4">{statusMessage}</p>
							<motion.p
								className="text-blue-600 font-medium"
								animate={{ opacity: [0.5, 1, 0.5] }}
								transition={{ duration: 2, repeat: Infinity }}
							>
								Waiting for card...
							</motion.p>
						</div>

						<div className="border-t border-slate-200 pt-6">
							<h3 className="font-medium text-slate-700 mb-3">
								Simulation Options
							</h3>
							<div className="grid grid-cols-1 gap-3">
								<button
									onClick={simulateCardTap}
									disabled={processingPayment}
									className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<span className="block font-medium text-green-800">
										Simulate Card Tap
									</span>
									<span className="text-sm text-green-600">
										Present payment method to terminal
									</span>
								</button>

								<button
									onClick={simulateCardDecline}
									disabled={processingPayment || true} // Currently disabled
									className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<span className="block font-medium text-red-800">
										Simulate Card Decline
									</span>
									<span className="text-sm text-red-600">
										Currently not supported by Stripe Test Helpers
									</span>
								</button>
							</div>
						</div>
					</div>
				)}

				{paymentStatus === "processing" && (
					<div className="text-center py-8">
						<motion.div
							className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
						/>
						<h2 className="text-xl font-semibold mb-2">Processing Payment</h2>
						<p className="text-slate-600">{statusMessage}</p>
					</div>
				)}

				{paymentStatus === "success" && (
					<div className="text-center py-8">
						<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-8 w-8 text-green-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<h2 className="text-xl font-semibold mb-2">Payment Approved</h2>
						<p className="text-slate-600">Amount: {formatCurrency(total)}</p>
						<p className="mt-6 text-sm text-slate-500">
							This window will close automatically
						</p>
					</div>
				)}

				{paymentStatus === "error" && (
					<div className="bg-white p-6 rounded-lg shadow-sm">
						<div className="text-center mb-6">
							<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-8 w-8 text-red-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</div>
							<h2 className="text-xl font-semibold mb-2">Payment Failed</h2>
							<p className="text-red-600 mb-6">
								{error || "An error occurred while processing payment."}
							</p>

							<button
								onClick={() => startPaymentFlow(localPaymentData)}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								Try Again
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Terminal footer */}
			<div className="bg-slate-800 text-white p-3 text-center text-xs">
				<p>Stripe Terminal Simulation | For Testing Only</p>
			</div>
		</div>
	);
};

TerminalSimulation.propTypes = {
	paymentData: PropTypes.shape({
		amount: PropTypes.number,
		tipAmount: PropTypes.number,
		subtotal: PropTypes.number,
		tax: PropTypes.number,
		orderItems: PropTypes.array,
	}),
	onPaymentResult: PropTypes.func,
};

TerminalSimulation.defaultProps = {
	paymentData: {
		amount: 0,
		tipAmount: 0,
		subtotal: 0,
		tax: 0,
		orderItems: [],
	},
	onPaymentResult: () => {},
};

export default TerminalSimulation;
