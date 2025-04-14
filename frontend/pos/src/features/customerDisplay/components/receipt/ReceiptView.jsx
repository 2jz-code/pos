// features/customerDisplay/components/receipt/ReceiptView.jsx

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { formatPrice } from "../../../../utils/numberUtils";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

const ReceiptView = ({ orderData, paymentData, onComplete, paymentMethod }) => {
	const [showDetails, setShowDetails] = useState(false);

	// Safely get data
	const tipAmount = orderData?.tipAmount || 0;
	const baseTotal = typeof orderData?.total === "number" ? orderData.total : 0;
	const finalTotal = baseTotal + tipAmount;
	const transactionId =
		paymentData?.transactionId || (paymentMethod === "cash" ? "CASH" : "N/A");
	const cardBrand = paymentData?.cardInfo?.brand;
	const cardLast4 = paymentData?.cardInfo?.last4;
	const paymentTimestamp = paymentData?.timestamp
		? new Date(paymentData.timestamp)
		: new Date();

	// Animation sequence and completion signal
	useEffect(() => {
		let detailsTimerId = null;
		let immediateCompleteTimerId = null;

		// Call onComplete very quickly after mount/initial animation starts
		// This ensures the signal gets back to the POS reliably.
		// A tiny delay (e.g., 100ms) might be needed if there are race conditions
		// with the POS side setting up its listener, but let's try almost immediate first.
		immediateCompleteTimerId = setTimeout(() => {
			console.log("ReceiptView: Calling onComplete immediately");
			if (onComplete) {
				onComplete({ status: "complete", timestamp: new Date().toISOString() });
			}
		}, 100); // ** Call onComplete after only 100ms **

		// Still show details after a slightly longer delay for the user to see
		detailsTimerId = setTimeout(() => {
			setShowDetails(true);
		}, 2200); // Details show after 1.2 seconds

		// Cleanup function
		return () => {
			clearTimeout(detailsTimerId);
			clearTimeout(immediateCompleteTimerId);
		};
	}, [onComplete]); // Dependency array includes onComplete

	const successColor = "green-500";

	return (
		<motion.div
			key="receipt"
			className="w-full h-screen bg-white flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 text-center"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.4 }}
		>
			{/* Checkmark Animation */}
			<motion.div
				className="mb-6 md:mb-8"
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
			>
				<CheckCircleIcon
					className={`w-24 h-24 md:w-28 md:h-28 text-${successColor} mx-auto`}
				/>
			</motion.div>

			{/* Main Message */}
			<motion.h1
				className="text-3xl md:text-4xl font-bold text-gray-900 mb-3"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.5 }}
			>
				Thank You!
			</motion.h1>

			<motion.p
				className="text-lg md:text-xl text-slate-600 mb-8 md:mb-10"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.7 }}
			>
				Your payment of{" "}
				<span className="font-semibold text-slate-800">
					{formatPrice(finalTotal)}
				</span>{" "}
				was successful.
			</motion.p>

			{/* Transaction Details (Appear after a delay) */}
			<motion.div
				className="w-full max-w-sm bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-3 text-left text-base"
				initial={{ opacity: 0, y: 20 }}
				animate={showDetails ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
			>
				<div className="flex justify-between">
					<span className="text-slate-500">Method:</span>
					<span className="font-medium text-slate-700">
						{
							paymentMethod === "cash"
								? "Cash"
								: `${cardBrand || "Card"} ${
										cardLast4 ? `•••• ${cardLast4}` : ""
								  }` // Improved display
						}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-slate-500">Date:</span>
					<span className="font-medium text-slate-700">
						{paymentTimestamp.toLocaleDateString()}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-slate-500">Time:</span>
					<span className="font-medium text-slate-700">
						{paymentTimestamp.toLocaleTimeString([], {
							hour: "numeric",
							minute: "2-digit",
							hour12: true,
						})}
					</span>
				</div>
				<div className="flex justify-between pt-2 border-t border-slate-200/80 mt-2">
					<span className="text-slate-500">Transaction ID:</span>
					<span
						className="font-medium text-slate-700 truncate max-w-[150px]" // Adjusted max-width
						title={transactionId}
					>
						{transactionId}
					</span>
				</div>
			</motion.div>

			{/* Footer Message */}
			<motion.p
				className="text-base text-slate-500 mt-10"
				initial={{ opacity: 0 }}
				animate={showDetails ? { opacity: 1 } : {}}
				transition={{ duration: 0.5, delay: 0.3 }} // Delay after details appear
			>
				Your receipt is printing. See you again soon!
			</motion.p>
		</motion.div>
	);
};

ReceiptView.propTypes = {
	orderData: PropTypes.shape({
		total: PropTypes.number, // Base total before tip
		tipAmount: PropTypes.number,
	}),
	paymentData: PropTypes.shape({
		// Optional: payment data might not exist for cash right away
		transactionId: PropTypes.string,
		cardInfo: PropTypes.shape({
			brand: PropTypes.string,
			last4: PropTypes.string,
		}),
		amount: PropTypes.number,
		timestamp: PropTypes.string,
	}),
	paymentMethod: PropTypes.string, // Crucial for display logic
	onComplete: PropTypes.func,
};

export default ReceiptView;
