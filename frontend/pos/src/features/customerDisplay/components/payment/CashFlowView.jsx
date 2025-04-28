import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "../../../../utils/numberUtils"; // Ensure path is correct
import {
	BanknotesIcon, // Main icon
	CheckCircleIcon, // Success icon
	ClockIcon, // Waiting icon
	ExclamationTriangleIcon, // Remaining due icon
	TagIcon, // Discount icon
} from "@heroicons/react/24/solid"; // Using solid icons

/**
 * CashFlowView Component (UI Revamped)
 * Displays cash payment progress (total, tendered, change) on the customer display.
 */
const CashFlowView = ({ orderData, cashData, onComplete, isComplete }) => {
	const [stage, setStage] = useState("processing"); // 'processing', 'complete'

	// Safely extract data from props
	const {
		subtotal = 0,
		tax = 0,
		total = 0, // Amount due for this specific cash transaction/step
		discountAmount = 0,
		orderDiscount = null,
		isSplitPayment = false,
		originalTotal, // Total of the original order before splitting
	} = orderData || {};
	const {
		cashTendered = 0,
		change = 0,
		amountPaid = 0, // Accumulated amount paid *before* this step (for splits)
	} = cashData || {};

	// Calculate remaining amount based on the *original* total if splitting
	const effectiveTotal = isSplitPayment ? originalTotal ?? total : total;
	// Amount remaining includes the amount for the *current* step ('total')
	const remainingAmount = Math.max(
		0,
		effectiveTotal - amountPaid - total + change
	); // Simplified logic
	const isFullyPaid = remainingAmount < 0.01; // Check if fully paid with tolerance

	// Update stage based on isComplete prop from parent
	useEffect(() => {
		if (isComplete && stage !== "complete") {
			setStage("complete");
		} else if (!isComplete && stage === "complete") {
			// Allow resetting if needed (e.g., cashier cancels completion)
			setStage("processing");
		}
	}, [isComplete, stage]);

	// Call onComplete when the 'complete' stage is reached and data is available
	useEffect(() => {
		let timerId = null;
		if (stage === "complete" && onComplete && cashData) {
			timerId = setTimeout(() => {
				onComplete({
					status: "success",
					method: "cash",
					timestamp: new Date().toISOString(),
					cashTendered: cashTendered,
					changeGiven: change,
					amountPaid: total, // Amount paid in *this* specific cash transaction
				});
			}, 2000); // Delay before signaling completion
		}
		return () => clearTimeout(timerId); // Cleanup timer
	}, [stage, onComplete, cashData, total, change, cashTendered]);

	// Animation variants
	const variants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.4, ease: "easeOut" },
		},
		exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
	};

	return (
		<motion.div
			key="cashflow-container" // Key for potential parent AnimatePresence
			className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 text-center md:p-12 lg:p-16" // Cash-themed gradient
		>
			<AnimatePresence mode="wait">
				{stage === "processing" ? (
					// --- Processing Stage ---
					<motion.div
						key="processing"
						className="w-full max-w-md"
						variants={variants}
						initial="hidden"
						animate="visible"
						exit="exit"
					>
						<BanknotesIcon className="mx-auto mb-5 h-16 w-16 text-emerald-500 md:h-20 md:w-20" />
						<h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
							Cash Payment
						</h1>
						<p className="mb-8 text-lg text-slate-600">
							{isSplitPayment
								? "Split Payment Details"
								: "Please provide payment to cashier"}
						</p>

						{/* Order Summary */}
						<div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 text-left text-base shadow-sm">
							<div className="space-y-1.5">
								<div className="flex justify-between text-slate-600">
									<span>Subtotal</span>
									<span className="font-medium text-slate-800">
										{formatPrice(subtotal)}
									</span>
								</div>
								{discountAmount > 0 && (
									<div className="flex justify-between text-emerald-600">
										<span className="flex items-center gap-1">
											<TagIcon className="h-4 w-4" />
											Discount
										</span>
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
							</div>
							<div className="mt-3 flex justify-between border-t border-slate-200 pt-3">
								<span className="font-semibold text-slate-900">
									Amount Due Now
								</span>
								<span className="text-xl font-bold text-blue-600">
									{formatPrice(total)}
								</span>
							</div>
							{isSplitPayment && originalTotal != null && (
								<div className="mt-1 text-right text-xs text-slate-500">
									(Original Total: {formatPrice(originalTotal)})
								</div>
							)}
						</div>

						{/* Payment Status */}
						<div className="flex min-h-[6rem] flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-lg">
							{cashTendered > 0 ? (
								<div className="w-full space-y-1.5 text-emerald-800">
									<div className="flex justify-between">
										<span className="font-medium">Tendered:</span>
										<span className="font-semibold">
											{formatPrice(cashTendered)}
										</span>
									</div>
									{(change > 0 || isFullyPaid) && (
										<div className="mt-1 flex justify-between border-t border-emerald-200/60 pt-1.5">
											<span className="font-medium">Change Due:</span>
											<span className="font-semibold">
												{formatPrice(change)}
											</span>
										</div>
									)}
								</div>
							) : (
								<div className="flex items-center text-emerald-700">
									<ClockIcon className="mr-2 h-6 w-6 animate-pulse" />
									<span className="font-medium">Awaiting Cash...</span>
								</div>
							)}
						</div>

						{/* Remaining Amount (only if split and not fully paid yet) */}
						{isSplitPayment && !isFullyPaid && remainingAmount > 0.01 && (
							<div className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-orange-600">
								<ExclamationTriangleIcon className="h-4 w-4" />
								Remaining Order Total: {formatPrice(remainingAmount)}
							</div>
						)}
					</motion.div>
				) : (
					// --- Complete Stage ---
					<motion.div
						key="complete"
						className="w-full max-w-md"
						variants={variants}
						initial="hidden"
						animate="visible"
						exit="exit"
					>
						<CheckCircleIcon className="mx-auto mb-6 h-20 w-20 text-green-500 md:h-24 md:w-24" />
						<h1 className="mb-3 text-3xl font-bold text-slate-900 md:text-4xl">
							Payment Complete
						</h1>
						<p className="mb-8 text-lg text-slate-600 md:text-xl">Thank you!</p>
						<div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-left text-base shadow-sm">
							<div className="flex justify-between text-slate-600">
								<span>Amount Paid:</span>
								<span className="font-medium text-slate-800">
									{formatPrice(total)}
								</span>
							</div>
							<div className="flex justify-between text-slate-600">
								<span>Cash Tendered:</span>
								<span className="font-medium text-slate-800">
									{formatPrice(cashTendered)}
								</span>
							</div>
							<div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
								<span className="font-semibold text-slate-900">
									Change Given:
								</span>
								<span className="font-semibold text-emerald-600">
									{formatPrice(change)}
								</span>
							</div>
						</div>
						<p className="mt-8 text-base text-slate-500">
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
		total: PropTypes.number, // Amount due for this cash step
		discountAmount: PropTypes.number,
		orderDiscount: PropTypes.object,
		isSplitPayment: PropTypes.bool,
		originalTotal: PropTypes.number, // Original total before splitting
	}),
	cashData: PropTypes.shape({
		cashTendered: PropTypes.number,
		change: PropTypes.number,
		amountPaid: PropTypes.number, // Accumulated amount paid *before* this step
	}),
	onComplete: PropTypes.func,
	isComplete: PropTypes.bool, // Signal from POS that this cash step is done
};

export default CashFlowView;
