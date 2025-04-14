// features/customerDisplay/components/payment/CashFlowView.jsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { formatPrice } from "../../../../utils/numberUtils";
import {
	BanknotesIcon,
	CheckCircleIcon,
	ClockIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/solid"; // Solid icons

const CashFlowView = ({ orderData, cashData, onComplete, isComplete }) => {
	const [stage, setStage] = useState("processing"); // processing, complete

	// Safely extract data
	const {
		subtotal = 0,
		tax = 0,
		total = 0,
		discountAmount = 0,
		// orderDiscount = null,
		isSplitPayment = false,
		originalTotal,
	} = orderData || {};
	const { cashTendered = 0, change = 0 } = cashData || {};
	// More robust calculation for remaining amount, especially for splits
	const effectiveTotal = isSplitPayment ? total : originalTotal || total; // Use original total if split, otherwise current total
	const accumulatedPaid = cashData?.amountPaid || 0; // Use amountPaid from cashData if available
	const remainingAmount = Math.max(0, effectiveTotal - accumulatedPaid);
	const isFullyPaid = remainingAmount < 0.01; // Use tolerance

	useEffect(() => {
		if (isComplete && stage !== "complete") setStage("complete");
		else if (!isComplete && stage === "complete") setStage("processing"); // Allow reset
	}, [isComplete, stage]);

	useEffect(() => {
		if (stage === "complete" && onComplete && cashData) {
			const timer = setTimeout(() => {
				onComplete({
					status: "success",
					method: "cash",
					timestamp: new Date().toISOString(),
					cashTendered,
					changeGiven: change,
					amountPaid: total /* Amount for *this* transaction */,
				});
			}, 2500); // Shorter delay
			return () => clearTimeout(timer);
		}
	}, [stage, onComplete, cashData, total, change, cashTendered]);

	// Brand colors
	const primaryColor = "blue-600";
	const successColor = "green-500";
	const warningColor = "orange-500";

	// Animation settings
	const variants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
		},
		exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
	};

	return (
		<motion.div
			key="cashflow"
			className="w-full h-screen bg-white flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 text-center"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
		>
			<AnimatePresence mode="wait">
				{stage === "processing" ? (
					<motion.div
						key="processing"
						className="w-full max-w-md"
						variants={variants}
						initial="hidden"
						animate="visible"
						exit="exit"
					>
						{/* Header */}
						<BanknotesIcon
							className={`w-16 h-16 md:w-20 md:h-20 text-${primaryColor} mx-auto mb-5`}
						/>
						<h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-2">
							Cash Payment
						</h1>
						<p className="text-lg text-slate-600 mb-8">
							{isSplitPayment
								? "Split Payment Details"
								: "Please provide payment to cashier"}
						</p>

						{/* Order Summary Card */}
						<div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200 text-left space-y-2 text-lg">
							<div className="flex justify-between text-slate-600">
								<span>Subtotal</span>
								<span className="font-medium text-slate-800">
									{formatPrice(subtotal)}
								</span>
							</div>
							{discountAmount > 0 && (
								<div className="flex justify-between text-green-600">
									<span>Discount</span>
									<span className="font-medium">
										-{formatPrice(discountAmount)}
									</span>
								</div>
							)}
							<div className="flex justify-between text-slate-600">
								<span>Tax</span>
								<span className="font-medium text-slate-800">
									{formatPrice(tax)}
								</span>
							</div>
							<div className="flex justify-between pt-3 border-t border-slate-200 mt-2">
								<span className="font-semibold text-gray-900">Total Due</span>
								<span className="font-bold text-xl text-blue-600">
									{formatPrice(total)}
								</span>
							</div>
							{isSplitPayment && originalTotal && (
								<div className="text-sm text-slate-500 pt-1">
									Original Total: ${formatPrice(originalTotal)}
								</div>
							)}
						</div>

						{/* Payment Status Card */}
						<div className="bg-blue-50 rounded-xl p-6 border border-blue-200 min-h-[8rem] flex flex-col justify-center items-center space-y-2 text-lg">
							{cashTendered > 0 ? (
								<>
									<div className="flex justify-between w-full text-blue-800">
										<span className="font-medium">Tendered:</span>
										<span className="font-semibold">
											{formatPrice(cashTendered)}
										</span>
									</div>
									{(change > 0 || isFullyPaid) && (
										<div className="flex justify-between w-full text-blue-800 font-semibold pt-2 border-t border-blue-200/50 mt-1">
											<span>Change:</span>
											<span>{formatPrice(change)}</span>
										</div>
									)}
								</>
							) : (
								<div className="flex items-center text-blue-700">
									<ClockIcon className="w-6 h-6 mr-2 animate-pulse" />
									<span className="font-medium">Awaiting Cash...</span>
								</div>
							)}
						</div>

						{/* Remaining Amount / Status */}
						<div className="mt-6 min-h-[3rem]">
							{!isFullyPaid && remainingAmount > 0.01 && cashTendered > 0 && (
								<div
									className={`flex items-center justify-center text-${warningColor} font-medium text-lg`}
								>
									<ExclamationTriangleIcon className="w-6 h-6 mr-2" />
									<span>Remaining Due: {formatPrice(remainingAmount)}</span>
								</div>
							)}
							{isFullyPaid && cashTendered > 0 && (
								<div className="flex items-center justify-center text-green-600 font-medium text-lg">
									<CheckCircleIcon className="w-6 h-6 mr-2" />
									<span>Payment Received - Processing...</span>
								</div>
							)}
						</div>
					</motion.div>
				) : (
					// Complete stage
					<motion.div
						key="complete"
						className="w-full max-w-md"
						variants={variants}
						initial="hidden"
						animate="visible"
						exit="exit"
					>
						<CheckCircleIcon
							className={`w-20 h-20 md:w-24 md:h-24 text-${successColor} mx-auto mb-6`}
						/>
						<h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
							Payment Complete
						</h1>
						<p className="text-lg md:text-xl text-slate-600 mb-8">Thank you!</p>
						<div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-left space-y-2 text-lg">
							<div className="flex justify-between text-slate-600">
								<span>Total Paid:</span>
								<span className="font-medium text-slate-800">
									{formatPrice(total)}
								</span>
							</div>
							<div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200/80 mt-2">
								<span>Tendered:</span>
								<span className="font-medium text-slate-800">
									{formatPrice(cashTendered)}
								</span>
							</div>
							<div className="flex justify-between text-slate-600">
								<span>Change:</span>
								<span className="font-medium text-slate-800">
									{formatPrice(change)}
								</span>
							</div>
						</div>
						<p className="text-base text-slate-500 mt-8">
							Your receipt is printing.
						</p>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
};

CashFlowView.propTypes = {
	orderData: PropTypes.shape({
		subtotal: PropTypes.number,
		tax: PropTypes.number,
		total: PropTypes.number, // Amount for this specific cash transaction
		discountAmount: PropTypes.number,
		orderDiscount: PropTypes.object,
		isSplitPayment: PropTypes.bool,
		originalTotal: PropTypes.number,
	}),
	cashData: PropTypes.shape({
		cashTendered: PropTypes.number,
		change: PropTypes.number,
		amountPaid: PropTypes.number, // Accumulated amount paid if split
		// remainingAmount removed as it's calculated internally
		isFullyPaid: PropTypes.bool, // Is original order fully paid?
	}),
	onComplete: PropTypes.func,
	isComplete: PropTypes.bool, // Trigger from cashier that transaction step is done
};

export default CashFlowView;
