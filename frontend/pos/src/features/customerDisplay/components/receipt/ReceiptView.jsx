import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "../../../../utils/numberUtils"; // Ensure path is correct
import { CheckBadgeIcon } from "@heroicons/react/24/solid"; // Use solid badge icon
import {
	CreditCardIcon,
	CalendarDaysIcon,
	ClockIcon as ClockOutlineIcon,
	HashtagIcon,
} from "@heroicons/react/24/outline"; // Outline for details

/**
 * ReceiptView Component (UI Revamped)
 * Displays a confirmation message and receipt details after payment.
 */
const ReceiptView = ({ orderData, paymentData, onComplete, paymentMethod }) => {
	const [showDetails, setShowDetails] = useState(false);

	// Safely extract data
	const tipAmount = orderData?.tipAmount || 0;
	const baseTotal = typeof orderData?.total === "number" ? orderData.total : 0; // Base amount paid in the final step
	const finalTotal =
		(orderData?.isSplitPayment ? orderData?.originalTotal : baseTotal) +
		tipAmount; // Show original total + tip if split, else base + tip

	// Extract payment details more robustly
	const getPaymentInfo = () => {
		if (paymentMethod === "cash") return { methodDisplay: "Cash", id: "N/A" };
		if (paymentMethod === "credit" && paymentData?.cardInfo) {
			const brand = paymentData.cardInfo.brand || "Card";
			const last4 = paymentData.cardInfo.last4;
			return {
				methodDisplay: `${brand} ${last4 ? `•••• ${last4}` : ""}`,
				id: paymentData.transactionId || "N/A",
			};
		}
		// Handle split payment details (might need more info from paymentData if available)
		if (paymentMethod === "split" || orderData?.isSplitPayment) {
			// Attempt to get details from the last transaction if available
			const lastTx = paymentData?.transactions?.slice(-1)[0];
			if (lastTx?.method === "credit" && lastTx?.cardInfo) {
				return {
					methodDisplay: `Split (${lastTx.cardInfo.brand} •••• ${lastTx.cardInfo.last4})`,
					id: lastTx.transactionId || "Multiple",
				};
			}
			return { methodDisplay: "Split Payment", id: "Multiple" };
		}
		// Fallback
		return {
			methodDisplay: paymentMethod || "Other",
			id: paymentData?.transactionId || "N/A",
		};
	};
	const { methodDisplay, id: transactionId } = getPaymentInfo();

	const paymentTimestamp = paymentData?.timestamp
		? new Date(paymentData.timestamp)
		: new Date();

	// Effect to show details and signal completion
	useEffect(() => {
		let detailsTimerId = null;
		let completeTimerId = null;

		// Signal completion quickly
		completeTimerId = setTimeout(() => {
			console.log("ReceiptView: Calling onComplete");
			if (onComplete) {
				onComplete({ status: "complete", timestamp: new Date().toISOString() });
			}
		}, 150); // Short delay

		// Show details after a longer visual delay
		detailsTimerId = setTimeout(() => {
			setShowDetails(true);
		}, 1800); // Show details after 1.8 seconds

		return () => {
			// Cleanup timers
			clearTimeout(detailsTimerId);
			clearTimeout(completeTimerId);
		};
	}, [onComplete]);

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { duration: 0.4 } },
		exit: { opacity: 0, transition: { duration: 0.2 } },
	};
	const itemVariants = (delay = 0) => ({
		hidden: { opacity: 0, y: 15 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.5, delay, ease: "easeOut" },
		},
	});
	const detailsVariants = {
		hidden: { opacity: 0, height: 0 },
		visible: {
			opacity: 1,
			height: "auto",
			transition: { duration: 0.5, ease: "easeOut", delay: 0.2 },
		},
	};

	return (
		<motion.div
			key="receipt"
			className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-8 text-center md:p-12 lg:p-16" // Success gradient
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			<div className="w-full max-w-md">
				{/* Check Badge Animation */}
				<motion.div
					className="mb-6 md:mb-8"
					initial={{ scale: 0.5, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 15,
						delay: 0.2,
					}}
				>
					<CheckBadgeIcon className="mx-auto h-20 w-20 text-green-500 md:h-24 md:w-24" />
				</motion.div>

				{/* Main Message */}
				<motion.h1
					variants={itemVariants(0.4)}
					className="mb-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl"
				>
					Thank You!
				</motion.h1>

				<motion.p
					variants={itemVariants(0.5)}
					className="mb-8 text-lg text-slate-600 md:text-xl md:mb-10"
				>
					Your payment of{" "}
					<span className="font-semibold text-slate-800">
						{formatPrice(finalTotal)}
					</span>{" "}
					was successful.
				</motion.p>

				{/* Transaction Details (Animated Appearance) */}
				<AnimatePresence>
					{showDetails && (
						<motion.div
							variants={detailsVariants}
							initial="hidden"
							animate="visible"
							className="overflow-hidden" // Needed for height animation
						>
							<div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-left text-sm shadow-sm">
								<div className="flex justify-between">
									<span className="flex items-center gap-1 text-slate-500">
										<CreditCardIcon className="h-4 w-4" />
										Method:
									</span>
									<span className="font-medium text-slate-700">
										{methodDisplay}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="flex items-center gap-1 text-slate-500">
										<CalendarDaysIcon className="h-4 w-4" />
										Date:
									</span>
									<span className="font-medium text-slate-700">
										{paymentTimestamp.toLocaleDateString()}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="flex items-center gap-1 text-slate-500">
										<ClockOutlineIcon className="h-4 w-4" />
										Time:
									</span>
									<span className="font-medium text-slate-700">
										{paymentTimestamp.toLocaleTimeString([], {
											hour: "numeric",
											minute: "2-digit",
											hour12: true,
										})}
									</span>
								</div>
								<div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
									<span className="flex items-center gap-1 text-slate-500">
										<HashtagIcon className="h-4 w-4" />
										Reference:
									</span>
									<span
										className="max-w-[150px] truncate font-mono text-xs font-medium text-slate-700"
										title={transactionId}
									>
										{transactionId}
									</span>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Footer Message */}
				<motion.p
					variants={itemVariants(showDetails ? 0.8 : 1.0)} // Adjust delay based on details visibility
					className="mt-8 text-base text-slate-500"
				>
					Your receipt is printing. Have a great day!
				</motion.p>
			</div>
		</motion.div>
	);
};

ReceiptView.propTypes = {
	orderData: PropTypes.shape({
		total: PropTypes.number, // Base total of the final step
		tipAmount: PropTypes.number,
		isSplitPayment: PropTypes.bool,
		originalTotal: PropTypes.number, // Original total before splitting
	}),
	paymentData: PropTypes.shape({
		transactionId: PropTypes.string,
		cardInfo: PropTypes.shape({
			brand: PropTypes.string,
			last4: PropTypes.string,
		}),
		amount: PropTypes.number, // Amount of the final transaction step
		timestamp: PropTypes.string,
		transactions: PropTypes.array, // Include if needed for split display
	}),
	paymentMethod: PropTypes.string, // Overall or final payment method
	onComplete: PropTypes.func,
};

export default ReceiptView;
