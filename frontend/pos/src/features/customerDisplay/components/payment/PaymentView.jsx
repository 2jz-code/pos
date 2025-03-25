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

			// Get the orderId from multiple possible sources to ensure we have it
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
		<div className="flex flex-col h-full">
			{/* Order summary section */}
			<div className="flex-1 p-6 bg-white overflow-auto">
				<h1 className="text-2xl font-bold text-slate-800 mb-6">
					Payment Details
				</h1>

				<div className="bg-slate-50 rounded-lg p-6 mb-6">
					<h2 className="text-lg font-semibold text-slate-700 mb-4">
						Order Summary
					</h2>

					<div className="space-y-3 mb-4">
						<div className="flex justify-between">
							<span className="text-slate-600">Subtotal</span>
							<span className="font-medium">
								{formatCurrency(orderData.subtotal)}
							</span>
						</div>

						<div className="flex justify-between">
							<span className="text-slate-600">Tax</span>
							<span className="font-medium">
								{formatCurrency(orderData.tax)}
							</span>
						</div>

						{tipAmount > 0 && (
							<div className="flex justify-between">
								<span className="text-slate-600">Tip</span>
								<span className="font-medium">{formatCurrency(tipAmount)}</span>
							</div>
						)}

						<div className="border-t border-slate-200 pt-3 flex justify-between">
							<span className="text-slate-800 font-semibold">Total</span>
							<span className="text-xl font-bold text-blue-600">
								{formatCurrency(finalTotal)}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Terminal instruction section */}
			<div className="p-6 bg-slate-50 border-t border-slate-200">
				<div className="max-w-md mx-auto text-center">
					{isInitiating ? (
						<>
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
							<h2 className="text-xl font-bold text-slate-800 mb-2">
								Initializing Payment
							</h2>
							<p className="text-slate-600 mb-2">
								Preparing secure payment terminal...
							</p>
						</>
					) : paymentStatus === "processing" ? (
						<>
							<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<motion.div
									className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
									animate={{ rotate: 360 }}
									transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
								/>
							</div>
							<h2 className="text-xl font-bold text-slate-800 mb-2">
								Processing Payment
							</h2>
							<p className="text-slate-600 mb-6">
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
						</>
					) : paymentStatus === "success" ? (
						<>
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
							<h2 className="text-xl font-bold text-slate-800 mb-2">
								Payment Successful
							</h2>
							<p className="text-slate-600">
								Transaction ID: {paymentResult?.transactionId}
								<br />
								{paymentResult?.cardInfo?.brand} ••••{" "}
								{paymentResult?.cardInfo?.last4}
							</p>
						</>
					) : paymentStatus === "error" ? (
						<>
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
							<h2 className="text-xl font-bold text-slate-800 mb-2">
								Payment Failed
							</h2>
							<p className="text-slate-600 mb-4">
								{error || "There was an error processing your payment."}
							</p>
							<button
								onClick={handleRetry}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								Try Again
							</button>
						</>
					) : null}
				</div>
			</div>
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
