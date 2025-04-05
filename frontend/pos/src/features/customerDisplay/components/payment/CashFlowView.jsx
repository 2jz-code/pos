// features/customerDisplay/components/payment/CashFlowView.jsx

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { formatPrice } from "../../../../utils/numberUtils";

const CashFlowView = ({ orderData, cashData, onComplete, isComplete }) => {
	const [stage, setStage] = useState("processing"); // processing, complete

	// Debug logging
	useEffect(() => {
		console.log("CashFlowView received data:", {
			orderData,
			cashData,
			isComplete,
		});
	}, [orderData, cashData, isComplete]);

	// Update stage based on isComplete prop
	useEffect(() => {
		if (isComplete && stage !== "complete") {
			setStage("complete");
		}
	}, [isComplete]);

	// When complete, notify parent
	useEffect(() => {
		if (stage === "complete" && onComplete) {
			const timer = setTimeout(() => {
				onComplete({
					status: "success",
					method: "cash",
					timestamp: new Date().toISOString(),
				});
			}, 3000);

			return () => clearTimeout(timer);
		}
	}, [stage, onComplete]);

	// Extract data - use the correct total based on whether this is a split payment
	const {
		subtotal = 0,
		tax = 0,
		total = 0,
		isSplitPayment = false,
		originalTotal,
	} = orderData || {};

	const {
		cashTendered = 0,
		change = 0,
		amountPaid = 0,
		remainingAmount = total - amountPaid,
		isFullyPaid = false,
	} = cashData || {};

	return (
		<div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
			{/* Subtle gradient background */}
			<div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-0"></div>

			{/* Top accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 w-full flex-shrink-0 z-10 shadow-sm"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			></motion.div>

			{/* Main content */}
			<div className="flex-1 flex flex-col p-6 overflow-hidden relative z-10">
				<motion.div
					className="mb-6 text-center"
					initial={{ y: -15, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ duration: 0.4 }}
				>
					<h1 className="text-2xl font-semibold text-gray-800 tracking-tight">
						Cash Payment
					</h1>
					<p className="text-gray-500 mt-1 font-light">
						{isSplitPayment
							? "Split Payment - Transaction Details"
							: "Transaction Details"}
					</p>
				</motion.div>

				<div className="flex-1 flex flex-col justify-center items-center">
					{stage === "processing" ? (
						<motion.div
							className="text-center w-full max-w-md"
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4 }}
						>
							{/* Order summary */}
							<motion.div
								className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm mb-6"
								initial={{ opacity: 0, y: 15 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1, duration: 0.4 }}
							>
								<div className="space-y-2 mb-3">
									<div className="flex justify-between">
										<span className="text-gray-600">Subtotal:</span>
										<span className="font-medium text-gray-800">
											${formatPrice(subtotal)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Tax:</span>
										<span className="font-medium text-gray-800">
											${formatPrice(tax)}
										</span>
									</div>
									<div className="flex justify-between pt-2 border-t border-gray-200">
										<span className="font-medium text-gray-800">Total:</span>
										<span className="font-semibold text-gray-800">
											${formatPrice(total)}
										</span>
									</div>

									{/* Show original total if this is a split payment */}
									{isSplitPayment && originalTotal && (
										<div className="flex justify-between text-sm text-gray-500 mt-1">
											<span>Original Transaction Total:</span>
											<span>${formatPrice(originalTotal)}</span>
										</div>
									)}
								</div>
							</motion.div>

							{/* Payment status - improved to show accurate state */}
							<motion.div
								className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-lg border border-green-100 shadow-sm"
								initial={{ opacity: 0, y: 15 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2, duration: 0.4 }}
							>
								{cashTendered > 0 ? (
									<>
										<div className="flex justify-between text-green-700 mb-2">
											<span className="font-medium">Cash Tendered:</span>
											<span className="font-medium">
												${formatPrice(cashTendered)}
											</span>
										</div>
										{change > 0 && (
											<div className="flex justify-between text-green-700 font-semibold mb-2">
												<span>Change:</span>
												<span>${formatPrice(change)}</span>
											</div>
										)}
										{!isFullyPaid && remainingAmount > 0 && (
											<div className="flex justify-between text-amber-600 font-semibold border-t border-green-200 pt-2">
												<span>Remaining:</span>
												<span>${formatPrice(remainingAmount)}</span>
											</div>
										)}
										{isFullyPaid && (
											<div className="flex justify-between text-green-700 font-semibold border-t border-green-200 pt-2">
												<span>Status:</span>
												<span>Fully Paid</span>
											</div>
										)}
									</>
								) : (
									<div className="text-center py-3">
										<div className="text-green-700 font-medium mb-1">
											Awaiting Payment
										</div>
										<div className="text-sm text-green-600 font-light">
											Please provide payment to the cashier
										</div>
									</div>
								)}
							</motion.div>

							{/* Partial payment warning or completion message */}
							{remainingAmount > 0 && cashTendered > 0 && (
								<motion.div
									className="mt-4 bg-amber-50 p-3 rounded-lg border border-amber-100 shadow-sm"
									initial={{ opacity: 0, y: 15 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3, duration: 0.4 }}
								>
									<div className="flex items-center text-amber-700">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-5 w-5 mr-2"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
												clipRule="evenodd"
											/>
										</svg>
										<span className="font-medium">Partial Payment</span>
									</div>
									<p className="text-sm text-amber-600 mt-1 ml-7 font-light">
										Additional payment required: ${formatPrice(remainingAmount)}
									</p>
								</motion.div>
							)}

							{isFullyPaid && (
								<motion.div
									className="mt-4 bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200 shadow-sm"
									initial={{ opacity: 0, y: 15 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3, duration: 0.4 }}
								>
									<div className="flex items-center text-green-700">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-5 w-5 mr-2"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clipRule="evenodd"
											/>
										</svg>
										<span className="font-medium">Payment Complete</span>
									</div>
									<p className="text-sm text-green-600 mt-1 ml-7 font-light">
										Waiting for cashier to close drawer and complete transaction
									</p>
								</motion.div>
							)}

							{/* Instructions */}
							<motion.div
								className="mt-6 text-center text-sm text-gray-500"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.4, duration: 0.4 }}
							>
								<p className="font-light">
									The cashier will process your payment
								</p>
							</motion.div>
						</motion.div>
					) : (
						<motion.div
							className="text-center w-full max-w-md"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ type: "spring", stiffness: 300, damping: 25 }}
						>
							<motion.div className="mb-6">
								<div className="w-16 h-16 bg-gradient-to-br from-green-50 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
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
								<h2 className="text-xl font-semibold text-gray-800 mb-2 tracking-tight">
									Payment Complete
								</h2>
								<p className="text-gray-600 font-light">
									Thank you for your purchase!
								</p>
							</motion.div>

							<motion.div
								className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm"
								initial={{ opacity: 0, y: 15 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1, duration: 0.3 }}
							>
								<div className="space-y-2 mb-4">
									<div className="flex justify-between">
										<span className="text-gray-600">Subtotal:</span>
										<span className="font-medium text-gray-800">
											${formatPrice(subtotal)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Tax:</span>
										<span className="font-medium text-gray-800">
											${formatPrice(tax)}
										</span>
									</div>
									<div className="flex justify-between pt-2 border-t border-gray-200">
										<span className="font-medium text-gray-800">Total:</span>
										<span className="font-semibold text-gray-800">
											${formatPrice(total)}
										</span>
									</div>
								</div>

								<div className="pt-3 border-t border-gray-200">
									<div className="flex justify-between text-green-700">
										<span className="font-medium">Cash Tendered:</span>
										<span className="font-medium">
											${formatPrice(cashTendered)}
										</span>
									</div>
									<div className="flex justify-between text-green-700 font-semibold">
										<span>Change:</span>
										<span>${formatPrice(change)}</span>
									</div>
								</div>
							</motion.div>

							<motion.div
								className="mt-6 text-center text-sm text-gray-500"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3, duration: 0.4 }}
							>
								<p className="font-light">Your receipt has been printed</p>
								<p className="mt-1 font-light">Thank you for your business!</p>
							</motion.div>
						</motion.div>
					)}
				</div>
			</div>

			{/* Bottom accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 w-full flex-shrink-0 z-10 shadow-sm"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
			></motion.div>
		</div>
	);
};

CashFlowView.propTypes = {
	orderData: PropTypes.shape({
		items: PropTypes.array,
		subtotal: PropTypes.number,
		tax: PropTypes.number,
		total: PropTypes.number,
	}),
	cashData: PropTypes.shape({
		cashTendered: PropTypes.number,
		change: PropTypes.number,
		amountPaid: PropTypes.number,
		remainingAmount: PropTypes.number,
		isFullyPaid: PropTypes.bool,
	}),
	onComplete: PropTypes.func,
	isComplete: PropTypes.bool,
};

export default CashFlowView;
