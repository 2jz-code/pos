// features/customerDisplay/components/receipt/ReceiptView.jsx

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";

const ReceiptView = ({ orderData, paymentData, onComplete }) => {
	const [animationStage, setAnimationStage] = useState("initial"); // initial, checkmark, message, complete

	// Control the animation sequence and timing
	useEffect(() => {
		// Start the animation sequence
		const checkmarkTimer = setTimeout(() => {
			setAnimationStage("checkmark");
		}, 500);

		// Show the first message after the checkmark animation
		const messageTimer = setTimeout(() => {
			setAnimationStage("message");
		}, 2000);

		// Show the second message and prepare to complete
		const completeTimer = setTimeout(() => {
			setAnimationStage("complete");
		}, 4000);

		// Notify parent component that we're done
		const finalTimer = setTimeout(() => {
			if (onComplete) {
				onComplete({
					status: "complete",
					timestamp: new Date().toISOString(),
				});
			}
		}, 6000);

		// Clean up timers
		return () => {
			clearTimeout(checkmarkTimer);
			clearTimeout(messageTimer);
			clearTimeout(completeTimer);
			clearTimeout(finalTimer);
		};
	}, [onComplete]);

	// Format the total amount for display
	const formatTotal = () => {
		const tipAmount = orderData?.tipAmount || 0;
		const total = (orderData?.total || 0) + tipAmount;

		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(total);
	};

	return (
		<div className="flex flex-col h-full bg-white">
			{/* Top accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 w-full flex-shrink-0 z-10"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			></motion.div>

			{/* Main content - centered both vertically and horizontally */}
			<div className="flex-1 flex items-center justify-center p-6 relative z-10">
				<div className="max-w-md w-full flex flex-col items-center">
					{/* Checkmark animation */}
					<motion.div
						className="w-32 h-32 bg-gradient-to-br from-green-50 to-emerald-100 rounded-full flex items-center justify-center mb-8"
						initial={{ scale: 0, opacity: 0 }}
						animate={{
							scale: animationStage !== "initial" ? 1 : 0,
							opacity: animationStage !== "initial" ? 1 : 0,
						}}
						transition={{
							type: "spring",
							stiffness: 300,
							damping: 20,
							duration: 0.8,
						}}
					>
						<motion.svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-16 w-16 text-green-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							initial={{ pathLength: 0, opacity: 0 }}
							animate={{
								pathLength: animationStage !== "initial" ? 1 : 0,
								opacity: animationStage !== "initial" ? 1 : 0,
							}}
							transition={{ duration: 1, delay: 0.3 }}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={3}
								d="M5 13l4 4L19 7"
							/>
						</motion.svg>
					</motion.div>

					{/* Success title */}
					<motion.h1
						className="text-3xl font-semibold text-gray-800 tracking-tight mb-3 text-center"
						initial={{ opacity: 0, y: 20 }}
						animate={{
							opacity: animationStage !== "initial" ? 1 : 0,
							y: animationStage !== "initial" ? 0 : 20,
						}}
						transition={{ delay: 1, duration: 0.5 }}
					>
						Thank You!
					</motion.h1>

					{/* Transaction amount */}
					<motion.div
						className="text-xl text-gray-600 font-light mb-6 text-center"
						initial={{ opacity: 0 }}
						animate={{
							opacity: animationStage !== "initial" ? 1 : 0,
						}}
						transition={{ delay: 1.2, duration: 0.5 }}
					>
						Your payment of {formatTotal()} has been processed successfully.
					</motion.div>

					{/* Messages that appear sequentially */}
					<div className="space-y-5 w-full">
						<motion.div
							className="bg-transparent p-5 border-b border-gray-100 text-center"
							initial={{ opacity: 0, y: 20 }}
							animate={{
								opacity:
									animationStage === "message" || animationStage === "complete"
										? 1
										: 0,
								y:
									animationStage === "message" || animationStage === "complete"
										? 0
										: 20,
							}}
							transition={{ delay: 0.2, duration: 0.5 }}
						>
							<p className="text-gray-700">
								Your receipt has been printed and will be provided to you.
							</p>
						</motion.div>

						<motion.div
							className="bg-transparent p-5 border-b border-gray-100 text-center"
							initial={{ opacity: 0, y: 20 }}
							animate={{
								opacity: animationStage === "complete" ? 1 : 0,
								y: animationStage === "complete" ? 0 : 20,
							}}
							transition={{ delay: 0.3, duration: 0.5 }}
						>
							<p className="text-gray-700 font-medium">
								We hope to see you again soon!
							</p>
							<p className="text-gray-500 text-sm mt-1 font-light">
								Ajeen Bakery appreciates your business.
							</p>
						</motion.div>
					</div>
				</div>
			</div>

			{/* Footer - shows transaction ID in a subtle way */}
			<div className="p-4 bg-transparent border-t border-gray-100 relative z-10">
				<motion.div
					className="text-center text-xs text-gray-400 font-light"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 2, duration: 1 }}
				>
					Transaction ID: {paymentData?.transactionId || "TXN-UNKNOWN"} •{" "}
					{new Date().toLocaleDateString()}
				</motion.div>
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
