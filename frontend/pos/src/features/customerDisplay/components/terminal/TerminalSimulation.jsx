// features/payment/components/TerminalSimulation.jsx

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";

const TerminalSimulation = ({ paymentData = {}, onPaymentResult }) => {
	const [cardNumber, setCardNumber] = useState("");
	const [expiryDate, setExpiryDate] = useState("");
	const [cvv, setCvv] = useState("");
	const [processingPayment, setProcessingPayment] = useState(false);
	const [error, setError] = useState("");
	const [localPaymentData, setLocalPaymentData] = useState(paymentData);

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
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	// Format card number with spaces
	const formatCardNumber = (value) => {
		const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
		const matches = v.match(/\d{4,16}/g);
		const match = (matches && matches[0]) || "";
		const parts = [];

		for (let i = 0, len = match.length; i < len; i += 4) {
			parts.push(match.substring(i, i + 4));
		}

		if (parts.length) {
			return parts.join(" ");
		} else {
			return value;
		}
	};

	// Format expiry date MM/YY
	const formatExpiryDate = (value) => {
		const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");

		if (v.length >= 2) {
			return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
		}

		return v;
	};

	// Handle card number input
	const handleCardNumberChange = (e) => {
		const formattedValue = formatCardNumber(e.target.value);
		setCardNumber(formattedValue);
	};

	// Handle expiry date input
	const handleExpiryDateChange = (e) => {
		const formattedValue = formatExpiryDate(e.target.value);
		setExpiryDate(formattedValue);
	};

	// Handle CVV input
	const handleCvvChange = (e) => {
		const value = e.target.value.replace(/\D/g, "");
		setCvv(value);
	};

	// Format currency
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	// Process payment
	const processPayment = () => {
		setError("");

		// Basic validation
		if (cardNumber.replace(/\s/g, "").length !== 16) {
			setError("Please enter a valid 16-digit card number");
			return;
		}

		if (expiryDate.length !== 5) {
			setError("Please enter a valid expiry date (MM/YY)");
			return;
		}

		if (cvv.length !== 3) {
			setError("Please enter a valid 3-digit CVV");
			return;
		}

		// Simulate payment processing
		setProcessingPayment(true);

		setTimeout(() => {
			// Simulate successful payment 90% of the time
			const isSuccessful = Math.random() < 0.9;

			const result = {
				status: isSuccessful ? "success" : "failure",
				transactionId: isSuccessful
					? `TXN${Date.now().toString().slice(-9)}`
					: null,
				amount: amount,
				timestamp: new Date().toISOString(),
				cardInfo: {
					last4: cardNumber.slice(-4),
					brand: getCardBrand(cardNumber),
				},
				error: isSuccessful
					? null
					: "Payment declined. Please try another card.",
			};

			// Send result back to parent
			if (onPaymentResult) {
				onPaymentResult(result);
			}

			// If failure, allow retry
			if (!isSuccessful) {
				setProcessingPayment(false);
				setError(result.error);
			}
		}, 2000);
	};

	// Determine card brand based on first digits
	const getCardBrand = (number) => {
		const prefix = number.replace(/\s/g, "").substring(0, 2);
		const prefixNum = parseInt(prefix, 10);

		if (prefixNum >= 40 && prefixNum <= 49) return "Visa";
		if (prefixNum >= 51 && prefixNum <= 55) return "Mastercard";
		if (prefixNum === 34 || prefixNum === 37) return "American Express";
		if (prefixNum === 60) return "Discover";
		return "Unknown";
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
				<p className="text-sm text-slate-300">Simulation Mode</p>
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

			{/* Payment form */}
			<div className="flex-1 p-4">
				{processingPayment ? (
					<div className="text-center py-8">
						<motion.div
							className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
						/>
						<h2 className="text-xl font-semibold mb-2">Processing Payment</h2>
						<p className="text-slate-600">Please do not remove your card...</p>
					</div>
				) : (
					<div className="bg-white p-4 rounded-lg shadow-sm">
						<h2 className="text-lg font-semibold mb-4">Enter Card Details</h2>

						{error && (
							<div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
								{error}
							</div>
						)}

						<div className="mb-4">
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Card Number
							</label>
							<input
								type="text"
								value={cardNumber}
								onChange={handleCardNumberChange}
								placeholder="1234 5678 9012 3456"
								maxLength={19}
								className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
							/>
						</div>

						<div className="flex gap-4 mb-6">
							<div className="flex-1">
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Expiry Date
								</label>
								<input
									type="text"
									value={expiryDate}
									onChange={handleExpiryDateChange}
									placeholder="MM/YY"
									maxLength={5}
									className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
								/>
							</div>
							<div className="w-1/3">
								<label className="block text-sm font-medium text-slate-700 mb-1">
									CVV
								</label>
								<input
									type="text"
									value={cvv}
									onChange={handleCvvChange}
									placeholder="123"
									maxLength={3}
									className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
								/>
							</div>
						</div>

						{/* Test card shortcuts */}
						<div className="mb-6">
							<p className="text-sm text-slate-500 mb-2">Test Cards:</p>
							<div className="flex flex-wrap gap-2">
								<button
									onClick={() => {
										setCardNumber("4242 4242 4242 4242");
										setExpiryDate("12/25");
										setCvv("123");
									}}
									className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded"
								>
									Visa (Success)
								</button>
								<button
									onClick={() => {
										setCardNumber("4000 0000 0000 0002");
										setExpiryDate("12/25");
										setCvv("123");
									}}
									className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded"
								>
									Visa (Decline)
								</button>
							</div>
						</div>

						<button
							onClick={processPayment}
							className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
						>
							Pay {formatCurrency(total)}
						</button>
					</div>
				)}
			</div>

			{/* Terminal footer */}
			<div className="bg-slate-800 text-white p-3 text-center text-xs">
				<p>Simulated Payment Terminal | For Testing Only</p>
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
