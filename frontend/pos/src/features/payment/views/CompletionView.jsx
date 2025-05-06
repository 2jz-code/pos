// src/features/payment/views/CompletionView.jsx
import { motion } from "framer-motion";
import {
	CheckCircleIcon,
	PrinterIcon,
	XMarkIcon,
	BanknotesIcon,
} from "@heroicons/react/24/solid";
import { useEffect, useState, useCallback } from "react"; // Added useState, useCallback
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import customerDisplayManager from "../../../features/customerDisplay/utils/windowManager";
// Import the agent print service
import {
	printReceiptWithAgent,
	openDrawerWithAgent,
} from "../../../api/services/localHardwareService";
import { toast } from "react-toastify";
import { formatPrice } from "../../../utils/numberUtils"; // Import formatter

const { pageVariants, pageTransition } = paymentAnimations;

export const CompletionView = ({
	onStartNewOrder,
	paymentResult,
	state, // Receive the full payment flow state for context if needed (e.g., payment method)
}) => {
	// --- State for Print Decision ---
	// Determine initial state: decision is made if no payload exists
	const receiptPayload = paymentResult?.receipt_payload;
	const involvedCash = paymentResult?.involvedCash ?? false;
	const totalCashTendered = paymentResult?.totalCashTendered ?? 0;
	const totalChangeGiven = paymentResult?.totalChangeGiven ?? 0;

	// State for optional printing remains the same
	const [decisionMade, setDecisionMade] = useState(!receiptPayload);
	const [isPrinting, setIsPrinting] = useState(false);

	// Effect to reset customer display after a delay (original logic)
	useEffect(() => {
		console.log(
			"POS CompletionView mounted. Scheduling customer display reset."
		);
		const resetTimer = setTimeout(() => {
			console.log(
				"POS CompletionView: Delay finished. Resetting customer display."
			);
			try {
				if (
					customerDisplayManager.displayWindow &&
					!customerDisplayManager.displayWindow.closed
				) {
					customerDisplayManager.showWelcome();
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
		}, 4000); // 4 second delay

		return () => {
			clearTimeout(resetTimer);
			console.log(
				"POS CompletionView unmounted, cleared customer display reset timer."
			);
		};
	}, []); // Run only on mount

	useEffect(() => {
		console.log("CompletionView: Checking if drawer needs to open.", {
			involvedCash,
		});
		if (involvedCash) {
			console.log(
				"CompletionView: Cash was involved, calling openCashDrawerAgent..."
			);
			// Call the function to open the drawer - no need to await usually
			openDrawerWithAgent().catch((err) => {
				// Error is likely already handled by toast in the service,
				// but you could log it here again if needed.
				console.error("CompletionView: Error from openCashDrawerAgent:", err);
			});
		}
		// This effect should run only once when the component mounts
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// --- Print Handlers ---
	const handlePrint = useCallback(async () => {
		if (!receiptPayload || isPrinting) return;
		setIsPrinting(true);
		try {
			console.log("CompletionView: Printing receipt via agent...");
			// Determine if drawer should open (only for cash payments)
			const openDrawer =
				state?.paymentMethod === "cash" ||
				(state?.splitMode &&
					state.transactions?.some((tx) => tx.method === "cash")); // Open if any part was cash in split

			const printResult = await printReceiptWithAgent(
				receiptPayload,
				openDrawer
			);
			if (!printResult.success) {
				console.warn(
					"CompletionView: Print command failed:",
					printResult.message
				);
				// Toast is likely handled in the service
			}
			// Mark decision as made regardless of print success/failure
			setDecisionMade(true);
		} catch (err) {
			console.error("CompletionView: Error during printing:", err);
			toast.error("An error occurred while trying to print.");
			setDecisionMade(true); // Mark decision made even on error
		} finally {
			setIsPrinting(false);
		}
	}, [
		receiptPayload,
		isPrinting,
		state?.paymentMethod,
		state?.splitMode,
		state?.transactions,
	]); // Add dependencies

	const handleSkip = useCallback(() => {
		if (isPrinting) return;
		console.log("CompletionView: Skipping receipt print.");
		setDecisionMade(true);
	}, [isPrinting]);

	// Handler for the "Start New Order" button
	const handleStartNew = async () => {
		console.log("Starting new order from completion view");
		// Ensure customer display is reset before starting new order
		try {
			if (
				customerDisplayManager.displayWindow &&
				!customerDisplayManager.displayWindow.closed
			) {
				console.log("Sending welcome command before starting new order");
				customerDisplayManager.showWelcome();
			}
		} catch (err) {
			console.error("Error sending welcome command:", err);
		}
		// Wait briefly for display update
		await new Promise((resolve) => setTimeout(resolve, 100));
		// Call the prop function
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
				<div className="flex flex-col items-center justify-center space-y-6 py-8 text-center">
					{/* --- Success Icon and Message --- */}
					<div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2 shadow-md">
						<CheckCircleIcon className="w-12 h-12 text-emerald-500" />
					</div>
					<h2 className="text-2xl font-semibold text-slate-800">
						Payment Complete!
					</h2>
					<p className="text-slate-600 max-w-md">
						The transaction has been processed successfully.
					</p>
					{/* --- ADDED: Conditional Cash Details Display --- */}
					{involvedCash &&
						totalChangeGiven >= 0 && ( // Show if cash involved and change calculated
							<motion.div
								key="cash-details"
								className="w-full max-w-sm p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1 text-sm shadow"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1 }}
							>
								<div className="flex justify-between items-center font-medium text-emerald-800">
									<span className="flex items-center gap-1.5">
										<BanknotesIcon className="h-4 w-4" />
										Cash Tendered:
									</span>
									<span>{formatPrice(totalCashTendered)}</span>
								</div>
								<div className="flex justify-between items-center font-bold text-emerald-900 text-base">
									<span>Change Due:</span>
									<span>{formatPrice(totalChangeGiven)}</span>
								</div>
							</motion.div>
						)}
					{/* ---------------------------------------------- */}
					{/* --- Conditional Rendering: Print Options OR Start New Order --- */}

					{/* Show Print Options if decision not made and payload exists */}
					{!decisionMade && receiptPayload && (
						<motion.div
							key="print-options"
							className="w-full max-w-md space-y-3 pt-4 border-t border-slate-200 mt-4"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
						>
							<p className="text-slate-700 font-medium">Print Receipt?</p>
							<div className="flex flex-col sm:flex-row justify-center gap-3">
								<PaymentButton
									label={isPrinting ? "Printing..." : "Print Receipt"}
									variant="primary"
									icon={PrinterIcon}
									onClick={handlePrint}
									disabled={isPrinting}
									className="w-full sm:w-auto px-5 py-2.5"
								/>
								<PaymentButton
									label="Skip"
									variant="default" // Or "default" if "secondary" is not defined
									icon={XMarkIcon}
									onClick={handleSkip}
									disabled={isPrinting}
									className="w-full sm:w-auto px-5 py-2.5"
								/>
							</div>
						</motion.div>
					)}

					{/* Show Start New Order button if decision IS made */}
					{decisionMade && (
						<motion.div
							key="start-new"
							className="w-full max-w-md pt-6"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.3 }}
						>
							<PaymentButton
								label="Start New Order"
								variant="primary" // Or a different variant if desired
								onClick={handleStartNew}
								className="w-full py-3 text-lg"
							/>
						</motion.div>
					)}
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CompletionView.propTypes = {
	onStartNewOrder: PropTypes.func.isRequired,
	paymentResult: PropTypes.shape({
		// Structure includes backend data + cash details
		receipt_payload: PropTypes.object,
		paymentMethodUsed: PropTypes.string,
		involvedCash: PropTypes.bool,
		totalCashTendered: PropTypes.number,
		totalChangeGiven: PropTypes.number,
		// Include other fields from backend if CompletionView needs them
		id: PropTypes.number,
		status: PropTypes.string,
	}),
	state: PropTypes.object, // Keep passing state if needed elsewhere
};

export default CompletionView;
