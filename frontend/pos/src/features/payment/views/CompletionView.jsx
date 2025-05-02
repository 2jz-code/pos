// src/components/payment/views/CompletionView.jsx
import { motion } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { useEffect } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import customerDisplayManager from "../../../features/customerDisplay/utils/windowManager";

const { pageVariants, pageTransition } = paymentAnimations;

export const CompletionView = ({ onStartNewOrder }) => {
	// *** ADD THIS useEffect ***
	useEffect(() => {
		// This effect runs once when the POS CompletionView mounts,
		// indicating the entire payment process succeeded on the POS side.
		console.log(
			"POS CompletionView mounted. Scheduling customer display reset."
		);

		// Set a timer to reset the customer display after a delay (e.g., 4 seconds)
		const resetTimer = setTimeout(() => {
			console.log(
				"POS CompletionView: Delay finished. Resetting customer display."
			);
			try {
				// Check if the customer display window still exists and is open
				if (
					customerDisplayManager.displayWindow &&
					!customerDisplayManager.displayWindow.closed
				) {
					customerDisplayManager.showWelcome(); // Command to show Welcome screen
				} else {
					console.warn(
						"POS CompletionView: Customer display window not accessible for reset."
					);
				}
			} catch (err) {
				console.error(
					"POS CompletionView: Error resetting customer display:",
					err
				);
			}
		}, 500); // Delay in milliseconds (4 seconds) - adjust as needed

		// Cleanup function: clear the timer if the CompletionView unmounts before the delay finishes
		return () => {
			clearTimeout(resetTimer);
			console.log(
				"POS CompletionView unmounted, cleared customer display reset timer."
			);
		};
	}, []); // Empty dependency array ensures this runs only once on mount
	// *************************

	const handleStartNew = async () => {
		console.log("Starting new order from completion view");

		// Tell the customer display to return to welcome screen (redundant but ensures consistency)
		try {
			if (
				customerDisplayManager.displayWindow &&
				!customerDisplayManager.displayWindow.closed
			) {
				console.log(
					"Sending welcome command to customer display before starting new order"
				);
				customerDisplayManager.showWelcome();
			}
		} catch (err) {
			console.error("Error sending welcome command to customer display:", err);
		}

		// Wait a short delay to ensure customer display has time to process
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Then call the original handler to start a new order
		await onStartNewOrder();
	};

	return (
		<motion.div
			key="completion"
			className="absolute inset-0 p-4"
			variants={pageVariants}
			initial="enter"
			animate="center"
			exit="exit"
			transition={pageTransition}
		>
			<ScrollableViewWrapper>
				<div className="flex flex-col items-center justify-center space-y-6 py-8">
					<div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
						<CheckCircleIcon className="w-12 h-12 text-emerald-500" />
					</div>

					<h2 className="text-2xl font-semibold text-slate-800">
						Payment Complete!
					</h2>

					<div className="text-slate-600 text-center max-w-md">
						<p>The transaction has been processed successfully.</p>
						<p className="mt-2">Receipt has been printed.</p>
					</div>

					<PaymentButton
						label="Start New Order"
						variant="primary"
						onClick={handleStartNew}
						className="w-full max-w-md mt-8"
					/>
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CompletionView.propTypes = {
	onStartNewOrder: PropTypes.func.isRequired,
};

export default CompletionView;
