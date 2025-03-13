// features/customerDisplay/components/receipt/ReceiptView.jsx

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";

const ReceiptView = ({ orderData, paymentData, onComplete }) => {
	const [isAnimating, setIsAnimating] = useState(true);

	// Automatically complete after animation finishes
	useEffect(() => {
		const timer = setTimeout(() => {
			setIsAnimating(false);
			// Give a moment for animation to finish before signaling completion
			setTimeout(() => {
				if (onComplete) {
					onComplete({
						status: "complete",
						timestamp: new Date().toISOString(),
					});
				}
			}, 1000);
		}, 3000);

		return () => clearTimeout(timer);
	}, [onComplete]);

	// Format currency for display
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	// Format date for display
	const formatDate = (dateString) => {
		const date = new Date(dateString || Date.now());
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
		}).format(date);
	};

	// Calculate totals
	const subtotal = orderData?.subtotal || 0;
	const tax = orderData?.tax || 0;
	const tipAmount = orderData?.tipAmount || 0;
	const total = (orderData?.total || 0) + tipAmount;

	// Get transaction info
	const transactionId = paymentData?.transactionId || "TXN-UNKNOWN";
	const cardInfo = paymentData?.cardInfo || { brand: "Card", last4: "****" };
	const timestamp = paymentData?.timestamp || new Date().toISOString();

	return (
		<div className="flex flex-col h-full overflow-hidden bg-white">
			{/* Receipt content */}
			<div className="flex-1 p-6 overflow-auto">
				<div className="max-w-md mx-auto bg-white">
					{/* Header with success animation */}
					<div className="text-center mb-8">
						<motion.div
							className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ duration: 0.5 }}
						>
							<motion.svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-10 w-10 text-green-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								initial={{ pathLength: 0 }}
								animate={{ pathLength: 1 }}
								transition={{ duration: 1, delay: 0.5 }}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</motion.svg>
						</motion.div>
						<h2 className="text-2xl font-bold text-slate-800 mb-2">
							Payment Successful
						</h2>
						<p className="text-slate-600">
							Your transaction has been processed
						</p>
					</div>

					{/* Receipt paper effect */}
					<motion.div
						className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden relative"
						initial={{ y: 50, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ duration: 0.5, delay: 0.3 }}
					>
						{/* Zigzag top edge */}
						<div className="absolute top-0 left-0 right-0 h-3 overflow-hidden">
							<div
								className="h-4 bg-white"
								style={{
									backgroundImage:
										"linear-gradient(135deg, transparent 25%, #f1f5f9 25%, #f1f5f9 50%, transparent 50%, transparent 75%, #f1f5f9 75%)",
									backgroundSize: "8px 8px",
								}}
							></div>
						</div>

						{/* Store info */}
						<div className="pt-6 pb-3 px-6 text-center border-b border-dashed border-slate-200">
							<h3 className="text-lg font-bold text-slate-800 mb-1">
								Cafe POS System
							</h3>
							<p className="text-sm text-slate-500">
								123 Main Street, Anytown, USA
							</p>
						</div>

						{/* Order info */}
						<div className="p-6">
							<div className="mb-4 text-sm">
								<div className="flex justify-between mb-1">
									<span className="text-slate-500">Date:</span>
									<span className="text-slate-700">
										{formatDate(timestamp)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-500">Transaction ID:</span>
									<span className="text-slate-700">{transactionId}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-500">Payment Method:</span>
									<span className="text-slate-700">
										{cardInfo.brand} •••• {cardInfo.last4}
									</span>
								</div>
							</div>

							{/* Order items */}
							<div className="border-t border-b border-slate-200 py-4 mb-4">
								<h4 className="font-medium text-slate-800 mb-3">Order Items</h4>
								<div className="space-y-2">
									{orderData?.items?.map((item, index) => (
										<div
											key={index}
											className="flex justify-between text-sm"
										>
											<div>
												<span className="text-slate-700">
													{item.quantity || 1}x{" "}
												</span>
												<span className="text-slate-800">{item.name}</span>
											</div>
											<span className="text-slate-700">
												{formatCurrency(item.price * (item.quantity || 1))}
											</span>
										</div>
									))}

									{(!orderData?.items || orderData.items.length === 0) && (
										<div className="text-sm text-slate-500 italic">
											No items available
										</div>
									)}
								</div>
							</div>

							{/* Order totals */}
							<div className="space-y-2 text-sm mb-4">
								<div className="flex justify-between">
									<span className="text-slate-600">Subtotal</span>
									<span className="text-slate-700">
										{formatCurrency(subtotal)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-600">Tax</span>
									<span className="text-slate-700">{formatCurrency(tax)}</span>
								</div>
								{tipAmount > 0 && (
									<div className="flex justify-between">
										<span className="text-slate-600">Tip</span>
										<span className="text-slate-700">
											{formatCurrency(tipAmount)}
										</span>
									</div>
								)}
								<div className="flex justify-between pt-2 border-t border-slate-200 text-base font-medium">
									<span className="text-slate-800">Total</span>
									<span className="text-slate-800">
										{formatCurrency(total)}
									</span>
								</div>
							</div>

							{/* Thank you message */}
							<div className="text-center text-slate-500 text-sm pt-2 border-t border-dashed border-slate-200">
								<p className="mb-1">Thank you for your purchase!</p>
								<p>Please visit again soon</p>
							</div>
						</div>

						{/* Zigzag bottom edge */}
						<div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden">
							<div
								className="h-4 bg-white"
								style={{
									backgroundImage:
										"linear-gradient(135deg, transparent 25%, #f1f5f9 25%, #f1f5f9 50%, transparent 50%, transparent 75%, #f1f5f9 75%)",
									backgroundSize: "8px 8px",
								}}
							></div>
						</div>
					</motion.div>

					{/* Message about physical receipt */}
					<div className="mt-6 text-center text-sm text-slate-500">
						<p>A copy of this receipt has been printed</p>
					</div>
				</div>
			</div>

			{/* Footer with animation */}
			<div className="p-6 bg-slate-50 border-t border-slate-200">
				<div className="max-w-md mx-auto">
					{isAnimating ? (
						<div className="flex items-center justify-center">
							<motion.div
								className="w-4 h-4 bg-blue-600 rounded-full mr-2"
								animate={{
									scale: [1, 1.5, 1],
									opacity: [1, 0.5, 1],
								}}
								transition={{
									duration: 1.5,
									repeat: Infinity,
									repeatType: "loop",
								}}
							/>
							<span className="text-slate-600 font-medium">
								Completing transaction...
							</span>
						</div>
					) : (
						<motion.div
							className="text-center text-slate-600"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5 }}
						>
							<p className="font-medium">Transaction complete</p>
							<p className="text-sm mt-1">Returning to home screen shortly</p>
						</motion.div>
					)}
				</div>
			</div>
		</div>
	);
};

ReceiptView.propTypes = {
	orderData: PropTypes.shape({
		items: PropTypes.array,
		subtotal: PropTypes.number,
		tax: PropTypes.number,
		total: PropTypes.number,
		tipAmount: PropTypes.number,
	}),
	paymentData: PropTypes.shape({
		transactionId: PropTypes.string,
		cardInfo: PropTypes.shape({
			brand: PropTypes.string,
			last4: PropTypes.string,
		}),
		amount: PropTypes.number,
		timestamp: PropTypes.string,
	}),
	onComplete: PropTypes.func,
};

export default ReceiptView;
