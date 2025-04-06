// features/customerDisplay/components/payment/PaymentView.jsx

import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useTerminalSimulation } from "../../hooks/useTerminalSimulation";
import { useCartStore } from "../../../../store/cartStore";

const PaymentView = ({ orderData, onComplete }) => {
	const [isInitiating, setIsInitiating] = useState(true);
	const { processPayment, paymentStatus, paymentResult, error } =
		useTerminalSimulation();
	const hasStartedPaymentRef = useRef(false);

	useEffect(() => {
		console.log("PaymentView received orderData:", {
			total: orderData.total,
			isSplitPayment: orderData.isSplitPayment,
			originalTotal: orderData.originalTotal,
			tipAmount: orderData.tipAmount || 0,
		});
	}, [orderData]);

	// In the useEffect that starts the payment process
	useEffect(() => {
		// Only proceed if we haven't started the payment process yet
		if (hasStartedPaymentRef.current) {
			return;
		}

		const timer = setTimeout(() => {
			setIsInitiating(false);

			// Get the orderId from multiple possible sources
			const effectiveOrderId =
				orderData.orderId || useCartStore.getState().orderId;

			console.log("Processing payment with order data:", {
				...orderData,
				orderId: effectiveOrderId,
			});

			if (!effectiveOrderId) {
				console.warn("⚠️ No orderId in order data when starting payment!");
			} else {
				console.log("Using orderId for payment:", effectiveOrderId);
			}

			// Create a new object with the orderId explicitly set
			const paymentOrderData = {
				...orderData,
				orderId: effectiveOrderId,
			};

			// Mark that we've started the payment process
			hasStartedPaymentRef.current = true;

			// Process the payment with the updated orderData
			processPayment(paymentOrderData);
		}, 1500);

		return () => clearTimeout(timer);
	}, [orderData]);

	// When payment is successful, notify parent
	useEffect(() => {
		if (paymentStatus === "success" && paymentResult && onComplete) {
			// Get the orderId from multiple sources
			const effectiveOrderId =
				orderData.orderId || useCartStore.getState().orderId;

			console.log(
				"Payment successful, preparing completion with orderId:",
				effectiveOrderId
			);

			// Wait a moment before completing to show success state
			const timer = setTimeout(() => {
				// Include complete payment data in the completion event
				const completionData = {
					status: "success",
					transactionId: paymentResult.transactionId,
					cardInfo: paymentResult.cardInfo,
					amount: paymentResult.amount,
					timestamp: paymentResult.timestamp,
					orderId: effectiveOrderId, // Use the effective orderId
				};

				console.log("Completing payment with data:", completionData);
				onComplete(completionData);
			}, 2000);

			return () => clearTimeout(timer);
		}
	}, [paymentStatus, paymentResult, onComplete, orderData]);

	useEffect(() => {
		if (paymentStatus === "error") {
			hasStartedPaymentRef.current = false;
		}
	}, [paymentStatus]);

	const handleRetry = () => {
		hasStartedPaymentRef.current = true; // Set flag before retrying
		processPayment(orderData);
	};

	// Format currency
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	// Calculate order total including tip
	const tipAmount = orderData.tipAmount || 0;
	const finalTotal = orderData.total + tipAmount;

	return (
		<div className="flex flex-col h-full bg-white">
			{/* Top accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 w-full flex-shrink-0 z-10"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			></motion.div>

			{/* Order summary section */}
			<div className="flex-1 p-6 overflow-auto relative z-10">
				<motion.h1
					className="text-2xl font-semibold text-gray-800 tracking-tight mb-6"
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
				>
					Payment Details
				</motion.h1>

				<motion.div
					className="bg-transparent border-b border-gray-100 p-6 mb-6"
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1, duration: 0.4 }}
				>
					<h2 className="text-lg font-medium text-gray-800 mb-4">
						Order Summary
					</h2>

					<div className="space-y-3 mb-4">
						<div className="flex justify-between">
							<span className="text-gray-600">Subtotal</span>
							<span className="font-medium text-gray-800">
								{formatCurrency(orderData.subtotal)}
							</span>
						</div>

						<div className="flex justify-between">
							<span className="text-gray-600">Tax</span>
							<span className="font-medium text-gray-800">
								{formatCurrency(orderData.tax)}
							</span>
						</div>

						{tipAmount > 0 && (
							<div className="flex justify-between">
								<span className="text-gray-600">Tip</span>
								<span className="font-medium text-gray-800">
									{formatCurrency(tipAmount)}
								</span>
							</div>
						)}

						<div className="border-t border-gray-200 pt-3 flex justify-between">
							<span className="text-gray-800 font-medium">Total</span>
							<span className="text-xl font-semibold text-blue-600">
								{formatCurrency(finalTotal)}
							</span>
						</div>
					</div>
				</motion.div>
			</div>

			{/* Terminal instruction section */}
			<div className="p-6 bg-transparent border-t border-gray-100 relative z-10">
				<div className="max-w-md mx-auto text-center">
					{isInitiating ? (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.4 }}
						>
							<div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
							<h2 className="text-xl font-semibold text-gray-800 mb-2">
								Initializing Payment
							</h2>
							<p className="text-gray-600 font-light mb-2">
								Preparing secure payment terminal...
							</p>
						</motion.div>
					) : paymentStatus === "processing" ? (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.4 }}
						>
							<div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<motion.div
									className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full"
									animate={{ rotate: 360 }}
									transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
								/>
							</div>
							<h2 className="text-xl font-semibold text-gray-800 mb-2">
								Processing Payment
							</h2>
							<p className="text-gray-600 font-light mb-6">
								Please complete payment on the physical terminal.
							</p>

							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: [0, 1, 0] }}
								transition={{
									duration: 2,
									repeat: Infinity,
									repeatType: "loop",
								}}
								className="text-blue-600 font-medium"
							>
								Follow the instructions on the terminal →
							</motion.div>
						</motion.div>
					) : paymentStatus === "success" ? (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ type: "spring", stiffness: 300, damping: 25 }}
						>
							<div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-8 w-8 text-emerald-600"
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
							<h2 className="text-xl font-semibold text-gray-800 mb-2">
								Payment Successful
							</h2>
							<p className="text-gray-600 font-light">
								Transaction ID: {paymentResult?.transactionId}
								<br />
								{paymentResult?.cardInfo?.brand} ••••{" "}
								{paymentResult?.cardInfo?.last4}
							</p>
						</motion.div>
					) : paymentStatus === "error" ? (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.4 }}
						>
							<div className="w-16 h-16 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
							<h2 className="text-xl font-semibold text-gray-800 mb-2">
								Payment Failed
							</h2>
							<p className="text-gray-600 font-light mb-4">
								{error || "There was an error processing your payment."}
							</p>
							<button
								onClick={handleRetry}
								className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors font-medium"
							>
								Try Again
							</button>
						</motion.div>
					) : null}
				</div>
			</div>

			{/* Bottom accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 w-full flex-shrink-0 z-10"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
			></motion.div>
		</div>
	);
};

PaymentView.propTypes = {
	orderData: PropTypes.shape({
		items: PropTypes.array,
		subtotal: PropTypes.number,
		tax: PropTypes.number,
		total: PropTypes.number,
		tipAmount: PropTypes.number,
		orderId: PropTypes.number,
		isSplitPayment: PropTypes.bool,
		originalTotal: PropTypes.number,
	}),
	onComplete: PropTypes.func,
};

export default PaymentView;
