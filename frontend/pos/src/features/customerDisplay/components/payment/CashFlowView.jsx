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
		<div className="w-full h-screen bg-white flex flex-col overflow-hidden">
			{/* Main content */}
			<div className="flex-1 flex flex-col p-6 overflow-hidden">
				<motion.div
					className="mb-6 text-center"
					initial={{ y: -20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.2 }}
				>
					<h1 className="text-3xl font-bold text-slate-800">Cash Payment</h1>
					<p className="text-slate-500 mt-2">
						{isSplitPayment
							? "Split Payment - Transaction Details"
							: "Transaction Details"}
					</p>
				</motion.div>

				<div className="flex-1 flex flex-col justify-center items-center">
					{stage === "processing" ? (
						<motion.div
							className="text-center w-full max-w-md"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
						>
							{/* Order summary */}
							<div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6">
								<div className="space-y-2 mb-3">
									<div className="flex justify-between">
										<span className="text-slate-600">Subtotal:</span>
										<span className="font-medium">
											${formatPrice(subtotal)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-600">Tax:</span>
										<span className="font-medium">${formatPrice(tax)}</span>
									</div>
									<div className="flex justify-between pt-2 border-t border-slate-200">
										<span className="font-semibold">Total:</span>
										<span className="font-bold">${formatPrice(total)}</span>
									</div>

									{/* Show original total if this is a split payment */}
									{isSplitPayment && originalTotal && (
										<div className="flex justify-between text-sm text-slate-500 mt-1">
											<span>Original Transaction Total:</span>
											<span>${formatPrice(originalTotal)}</span>
										</div>
									)}
								</div>
							</div>

							{/* Payment status - improved to show accurate state */}
							<div className="bg-green-50 p-4 rounded-lg border border-green-100">
								{cashTendered > 0 ? (
									<>
										<div className="flex justify-between text-green-700 mb-2">
											<span className="font-medium">Cash Tendered:</span>
											<span className="font-medium">
												${formatPrice(cashTendered)}
											</span>
										</div>
										{change > 0 && (
											<div className="flex justify-between text-green-700 font-bold mb-2">
												<span>Change:</span>
												<span>${formatPrice(change)}</span>
											</div>
										)}
										{!isFullyPaid && remainingAmount > 0 && (
											<div className="flex justify-between text-amber-600 font-bold border-t border-green-200 pt-2">
												<span>Remaining:</span>
												<span>${formatPrice(remainingAmount)}</span>
											</div>
										)}
										{isFullyPaid && (
											<div className="flex justify-between text-green-700 font-bold border-t border-green-200 pt-2">
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
										<div className="text-sm text-green-600">
											Please provide payment to the cashier
										</div>
									</div>
								)}
							</div>

							{/* Partial payment warning or completion message */}
							{remainingAmount > 0 && cashTendered > 0 && (
								<div className="mt-4 bg-amber-50 p-3 rounded-lg border border-amber-100">
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
									<p className="text-sm text-amber-600 mt-1 ml-7">
										Additional payment required: ${formatPrice(remainingAmount)}
									</p>
								</div>
							)}

							{isFullyPaid && (
								<div className="mt-4 bg-green-100 p-3 rounded-lg border border-green-200">
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
									<p className="text-sm text-green-600 mt-1 ml-7">
										Waiting for cashier to close drawer and complete transaction
									</p>
								</div>
							)}

							{/* Instructions */}
							<div className="mt-6 text-center text-sm text-slate-500">
								<p>The cashier will process your payment</p>
							</div>
						</motion.div>
					) : (
						<motion.div
							className="text-center w-full max-w-md"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ type: "spring", stiffness: 300, damping: 25 }}
						>
							<div className="mb-6">
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
									Payment Complete
								</h2>
								<p className="text-slate-600">Thank you for your purchase!</p>
							</div>

							<div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
								<div className="space-y-2 mb-4">
									<div className="flex justify-between">
										<span className="text-slate-600">Subtotal:</span>
										<span className="font-medium">
											${formatPrice(subtotal)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-600">Tax:</span>
										<span className="font-medium">${formatPrice(tax)}</span>
									</div>
									<div className="flex justify-between pt-2 border-t border-slate-200">
										<span className="font-semibold">Total:</span>
										<span className="font-bold">${formatPrice(total)}</span>
									</div>
								</div>

								<div className="pt-3 border-t border-slate-200">
									<div className="flex justify-between text-green-700">
										<span className="font-medium">Cash Tendered:</span>
										<span className="font-medium">
											${formatPrice(cashTendered)}
										</span>
									</div>
									<div className="flex justify-between text-green-700 font-bold">
										<span>Change:</span>
										<span>${formatPrice(change)}</span>
									</div>
								</div>
							</div>

							<div className="mt-6 text-center text-sm text-slate-500">
								<p>Your receipt has been printed</p>
								<p className="mt-1">Thank you for your business!</p>
							</div>
						</motion.div>
					)}
				</div>
			</div>
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
