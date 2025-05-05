// frontend-pos/features/payment/views/CashPaymentView.jsx

import { motion } from "framer-motion";
// Import useEffect, useMemo, useCallback, useState, useRef
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
const { pageVariants, pageTransition } = paymentAnimations;
import { useReceiptPrinter } from "../../../hooks/useReceiptPrinter";
// Removed useCustomerFlow as direct interaction is handled differently now
// import { useCustomerFlow } from "../../../features/customerDisplay/hooks/useCustomerFlow";
import customerDisplayManager from "../../../features/customerDisplay/utils/windowManager"; // Correct import
import { useCartStore } from "../../../store/cartStore";
import { formatPrice } from "../../../utils/numberUtils";
import { XCircleIcon } from "@heroicons/react/24/solid";
import { Decimal } from "decimal.js"; // Import Decimal
import { toast } from "react-toastify";
import { openDrawerWithAgent } from "../../../api/services/localHardwareService";

const commonMotionProps = {
	variants: pageVariants,
	initial: "enter",
	animate: "center",
	exit: "exit",
	transition: pageTransition,
};

export const CashPaymentView = ({
	state,
	remainingAmount: remainingAmountProp, // This is the OVERALL remaining amount for the order
	handlePayment, // This is processPayment from usePaymentFlow
	setState: setParentState, // Renamed from setState to avoid conflict if local needed
	completePaymentFlow,
	handleNavigation,
	totalAmount, // *** ADDED: totalAmount (full order total) prop ***
}) => {
	const {
		isProcessing: isPrinterProcessing,
		error: printerError,
		isConnected: isPrinterConnected,
		// printReceipt,
	} = useReceiptPrinter();

	const [error, setError] = useState(null);
	const [paymentInProgress, setPaymentInProgress] = useState(false);
	// Removed flowActive etc. as useCustomerFlow is no longer directly used here
	const displayError = printerError || error;
	const [hasBeenMounted, setHasBeenMounted] = useState(false); // Keep if still used for unmount logic
	const isMountedRef = useRef(false); // Ref to track mount status
	const epsilon = 0.01;

	// --- Helper to check overall order completion ---
	const isPaymentCompleteInternal = useCallback(
		(paidAmount) => {
			const baseTotalRequired = totalAmount; // Use the full order total passed in props
			if (typeof baseTotalRequired !== "number") {
				console.error(
					"isPaymentCompleteInternal: totalAmount is not a number",
					totalAmount
				);
				return false;
			}
			// Check if amount paid meets or exceeds the total required (minus tolerance)
			return new Decimal(paidAmount).greaterThanOrEqualTo(
				new Decimal(baseTotalRequired).minus(epsilon)
			);
		},
		[totalAmount, epsilon] // Depend on totalAmount prop
	);

	// *** MODIFIED: Calculate amount required for THIS specific cash step ***
	const currentPaymentAmount = useMemo(() => {
		// 1. Prioritize amount explicitly set for this step in the parent state
		if (
			state.splitMode &&
			state.currentStepAmount !== null && // Check specifically for null/undefined
			state.currentStepAmount !== undefined &&
			state.currentStepAmount >= 0 // Allow zero amount if valid (e.g., final rounding)
		) {
			console.log(
				`CASH VIEW: Using currentStepAmount: ${state.currentStepAmount}`
			);
			// Ensure 2 decimal places for currency
			return parseFloat(state.currentStepAmount.toFixed(2));
		}
		// 2. Fallback for non-split mode: use the total remaining order amount
		if (!state.splitMode) {
			const overallRemaining = Math.max(0, remainingAmountProp); // Use overall remaining prop
			console.log(
				`CASH VIEW: Using overall remaining (non-split): ${overallRemaining}`
			);
			return parseFloat(overallRemaining.toFixed(2));
		}
		// 3. Fallback IN split mode if currentStepAmount isn't set
		//    (Should be rare now but handles edge cases). Use overall remaining.
		console.warn(
			"CashPaymentView: currentStepAmount not set in split mode, falling back to overall remaining amount."
		);
		const fallbackRemaining = Math.max(0, remainingAmountProp);
		return parseFloat(fallbackRemaining.toFixed(2));
	}, [state.splitMode, state.currentStepAmount, remainingAmountProp]); // Dependencies updated

	// --- Mount / Unmount Effects ---
	useEffect(() => {
		isMountedRef.current = true;
		setHasBeenMounted(true); // Keep if used elsewhere
		return () => {
			isMountedRef.current = false;
			if (hasBeenMounted) {
				console.log(
					"CashPaymentView unmounting, attempting reset customer display"
				);
				try {
					// Reset customer display using windowManager
					if (typeof customerDisplayManager.showWelcome === "function") {
						const cart = useCartStore.getState().cart;
						if (cart && cart.length > 0) {
							// Optional: Show cart instead if items remain?
							customerDisplayManager.showCart();
						} else {
							customerDisplayManager.showWelcome();
						}
					} else {
						console.warn(
							"customerDisplayManager methods not found on unmount."
						);
					}
				} catch (err) {
					console.error("Error resetting customer display on unmount:", err);
				}
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Keep hasBeenMounted dependency? Or just run mount/unmount once? Depends if hasBeenMounted is needed elsewhere.

	// Effect to log processing states (optional for debugging)
	useEffect(() => {
		console.log("CashPaymentView State Update:", {
			isPrinterProcessing,
			paymentInProgress,
			isPrinterConnected,
			currentPaymentAmount, // Log calculated amount
		});
	}, [
		isPrinterProcessing,
		paymentInProgress,
		isPrinterConnected,
		currentPaymentAmount,
	]);

	// --- Send Initial State to Customer Display on Mount ---
	useEffect(() => {
		console.log(
			"CashPaymentView Mounted: Sending initial state to customer display."
		);
		// Ensure calculation is ready before sending message
		if (currentPaymentAmount === undefined) {
			console.warn(
				"Initial currentPaymentAmount not ready, delaying display update slightly."
			);
			// Optionally add a small timeout, but usually direct call is fine if calculation is synchronous
			// setTimeout(() => { /* send message */ }, 50);
			// return; // Or just proceed, assuming calculation is fast enough
		}

		const initialCashData = {
			cashTendered: 0,
			change: 0,
			amountPaid: state.amountPaid || 0, // Amount paid *before* this step
			remainingAmount: currentPaymentAmount, // Amount due *for this step*
			isFullyPaid: currentPaymentAmount < epsilon,
			isSplitPayment: state.splitMode,
		};
		const initialOrderData = {
			subtotal: null, // Populate if needed/available from state/props
			tax: null, // Populate if needed/available from state/props
			total: currentPaymentAmount, // Amount due *for this step*
			discountAmount: null, // Populate if needed/available from state/props
			isSplitPayment: state.splitMode,
			// Provide context of full order total if splitting
			originalTotal: state.splitMode ? totalAmount : currentPaymentAmount,
		};
		const initialMessageContent = {
			currentStep: "payment",
			paymentMethod: "cash",
			cashData: initialCashData,
			orderData: initialOrderData,
			displayMode: "flow",
			isSplitPayment: state.splitMode,
			splitDetails: state.splitDetails,
			orderId: state.orderId,
		};

		try {
			customerDisplayManager.sendDirectCashUpdateMessage(initialMessageContent);
			console.log(
				"Initial cash state sent via windowManager.",
				initialMessageContent
			);
		} catch (err) {
			console.error("Error sending initial cash state:", err);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Runs only once on mount

	useEffect(() => {
		// Only run if in split mode when this component mounts or relevant state changes
		if (state.splitMode) {
			console.log("CASH VIEW (Split Mode): Calling startCustomerFlow.");
			// Ensure we have the correct amount for this step
			const amountForThisStep = currentPaymentAmount; // Use the calculated amount
			if (amountForThisStep === undefined || amountForThisStep < 0) {
				console.error(
					"Cannot start customer flow, invalid amount for step:",
					amountForThisStep
				);
				return;
			}

			// Prepare data needed by CashFlowView via startCustomerFlow
			const cashDataForFlow = {
				cashTendered: 0,
				change: 0,
				amountPaid: state.amountPaid || 0, // Overall paid before this step
				remainingAmount: amountForThisStep, // Amount for *this* step
				isFullyPaid: amountForThisStep < epsilon,
				isSplitPayment: true,
			};
			const orderDataForFlow = {
				total: amountForThisStep, // Amount for *this* step
				isSplitPayment: true,
				originalTotal: totalAmount, // Overall order total
				// Add subtotal/tax if needed/available
			};

			// Call windowManager directly to start the flow
			// This ensures the display state is properly initialized via START_CUSTOMER_FLOW
			customerDisplayManager.startCustomerFlow({
				// Assuming startCustomerFlow takes an object
				orderId: state.orderId,
				initialStep: "payment", // Start at payment step
				paymentMethod: "cash",
				amountDue: amountForThisStep, // Pass the specific amount for this step
				isSplitPayment: true,
				splitDetails: state.splitDetails,
				// Pass constructed data payload needed by the display:
				payload: {
					// Nest data inside a 'payload' if startCustomerFlow expects it, otherwise adjust
					cashData: cashDataForFlow,
					orderData: orderDataForFlow,
				},
				// NOTE: Adjust the arguments/structure based on your exact
				// customerDisplayManager.startCustomerFlow function signature
			});
		}
		// What should this depend on? It needs to run when entering split cash view.
		// Relying on state.splitMode and maybe currentPaymentAmount being calculated.
	}, [
		state.splitMode,
		state.orderId,
		state.splitDetails,
		state.amountPaid,
		currentPaymentAmount,
		totalAmount,
	]); // Add dependencies

	// --- Helper Functions ---
	const getLatestTransaction = useCallback(() => {
		if (!state.transactions || state.transactions.length === 0) return null;
		return state.transactions[state.transactions.length - 1];
	}, [state.transactions]); // Dependency on transactions array from state prop

	const getLatestCashDetails = useCallback(() => {
		const latestTransaction = getLatestTransaction();
		return {
			cashTendered:
				latestTransaction?.method === "cash"
					? latestTransaction?.cashTendered || 0
					: 0,
			change:
				latestTransaction?.method === "cash"
					? latestTransaction?.change || 0
					: 0,
		};
	}, [getLatestTransaction]); // Dependency

	const shouldShowChangeCalculation = useCallback(() => {
		const latestTransaction = getLatestTransaction();
		return (
			latestTransaction &&
			latestTransaction.method === "cash" &&
			typeof latestTransaction.cashTendered === "number" &&
			latestTransaction.cashTendered > 0
		);
	}, [getLatestTransaction]); // Dependency

	// --- Payment Handlers ---
	const handlePresetAmount = async (amountTendered) => {
		setError(null);
		setPaymentInProgress(true);
		const requiredAmount = currentPaymentAmount; // Amount needed for this step
		console.log(
			`CASH VIEW: Preset $${amountTendered} clicked. Amount due: $${requiredAmount}`
		);

		try {
			const amountToApply = Math.min(amountTendered, requiredAmount);
			const changeDue = Math.max(
				0,
				new Decimal(amountTendered).minus(new Decimal(amountToApply)).toNumber()
			);

			const paymentResult = await handlePayment(amountToApply, {
				method: "cash",
				cashTendered: amountTendered,
				change: changeDue,
			});

			if (!paymentResult || !paymentResult.success) {
				throw new Error(paymentResult?.error || "Payment processing failed");
			}

			// Send display update based on the *result* of the payment
			const updatedAmountPaidOverall = paymentResult.newAmountPaid;
			const stepRemainingAfterPayment = Math.max(
				0,
				new Decimal(requiredAmount).minus(amountToApply).toNumber()
			);

			const cashDataForDisplay = {
				cashTendered: amountTendered,
				change: changeDue,
				amountPaid: updatedAmountPaidOverall,
				// Show 0 due for step if met, otherwise the original step amount? Or total remaining? Let's show step amount for clarity.
				remainingAmount:
					stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
				isFullyPaid: paymentResult.isNowComplete, // Reflect overall completion
				isSplitPayment: state.splitMode,
			};
			const orderDataForDisplay = {
				total: stepRemainingAfterPayment < epsilon ? 0 : requiredAmount, // Show amount due for step
				isSplitPayment: state.splitMode,
				originalTotal: state.splitMode ? totalAmount : requiredAmount,
			};

			const messageContent = {
				currentStep: "payment",
				paymentMethod: "cash",
				displayMode: "flow",
				cashData: cashDataForDisplay,
				orderData: orderDataForDisplay,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
				orderId: state.orderId,
			};
			customerDisplayManager.sendDirectCashUpdateMessage(messageContent);
			console.log("Direct cash update message sent after preset.");
		} catch (err) {
			setError(err.message || "Failed to process preset amount");
			console.error("Preset amount payment error:", err);
		} finally {
			if (isMountedRef.current) setPaymentInProgress(false);
		}
	};

	const handleCustomAmount = async () => {
		const amountTendered = parseFloat(state.customAmount);
		const requiredAmount = currentPaymentAmount;

		if (!amountTendered || isNaN(amountTendered) || amountTendered <= 0) {
			setError("Please enter a valid positive amount");
			return;
		}
		// Ensure tendered amount is sufficient for the current step amount
		if (
			new Decimal(amountTendered).lessThan(
				new Decimal(requiredAmount).minus(epsilon)
			)
		) {
			setError(`Amount must be at least ${formatPrice(requiredAmount)}`);
			return;
		}

		setError(null);
		setPaymentInProgress(true);
		console.log(
			`CASH VIEW: Custom $${amountTendered} submitted. Amount due: $${requiredAmount}`
		);

		try {
			const amountToApply = Math.min(amountTendered, requiredAmount);
			const changeDue = Math.max(
				0,
				new Decimal(amountTendered).minus(new Decimal(amountToApply)).toNumber()
			);

			const paymentResult = await handlePayment(amountToApply, {
				method: "cash",
				cashTendered: amountTendered,
				change: changeDue,
			});

			if (!paymentResult || !paymentResult.success) {
				throw new Error(paymentResult?.error || "Payment processing failed");
			}

			// Clear input using parent state setter
			if (setParentState)
				setParentState((prev) => ({ ...prev, customAmount: "" }));

			// Send display update (similar logic to preset amount)
			const updatedAmountPaidOverall = paymentResult.newAmountPaid;
			const stepRemainingAfterPayment = Math.max(
				0,
				new Decimal(requiredAmount).minus(amountToApply).toNumber()
			);

			const cashDataForDisplay = {
				cashTendered: amountTendered,
				change: changeDue,
				amountPaid: updatedAmountPaidOverall,
				remainingAmount:
					stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
				isFullyPaid: paymentResult.isNowComplete,
				isSplitPayment: state.splitMode,
			};
			const orderDataForDisplay = {
				total: stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
				isSplitPayment: state.splitMode,
				originalTotal: state.splitMode ? totalAmount : requiredAmount,
			};
			const messageContent = {
				currentStep: "payment",
				paymentMethod: "cash",
				displayMode: "flow",
				cashData: cashDataForDisplay,
				orderData: orderDataForDisplay,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
				orderId: state.orderId,
			};
			customerDisplayManager.sendDirectCashUpdateMessage(messageContent);
			console.log("Direct cash update message sent after custom.");
		} catch (err) {
			setError(err.message || "Failed to process custom amount");
			console.error("Custom amount payment error:", err);
		} finally {
			if (isMountedRef.current) setPaymentInProgress(false);
		}
	};

	// --- Button Logic ---
	// Determines if the "Complete/Continue" button should be enabled
	const canCompleteCurrentStep = useCallback(() => {
		const latestTransaction = getLatestTransaction();
		const hasValidTenderInfo =
			latestTransaction?.method === "cash" &&
			typeof latestTransaction.cashTendered === "number";

		if (!hasValidTenderInfo) return false;

		const requiredAmountForThisStep = currentPaymentAmount;
		const tenderedInLastTx = latestTransaction.cashTendered;
		// Check if amount tendered was enough for *this specific step*
		const tenderedMetRequirement = new Decimal(
			tenderedInLastTx
		).greaterThanOrEqualTo(
			new Decimal(requiredAmountForThisStep).minus(epsilon)
		);

		const canProceed =
			tenderedMetRequirement && !isPrinterProcessing && !paymentInProgress;

		console.log("canCompleteCurrentStep check:", {
			requiredAmountForThisStep,
			tenderedInLastTx,
			tenderedMetRequirement,
			isPrinterProcessing,
			paymentInProgress,
			canProceed,
		});

		return canProceed;
	}, [
		state.transactions,
		currentPaymentAmount,
		isPrinterProcessing,
		paymentInProgress,
		epsilon,
		getLatestTransaction,
	]); // Dependencies

	// Handles clicking the "Complete Payment" or "Continue Split" button
	const handlePaymentCompletionAndPrint = async () => {
		setError(null);
		console.log("=== CASH: Handling Completion/Continuation ===");
		if (!canCompleteCurrentStep()) {
			console.warn("Complete button clicked but shouldn't be enabled.");
			return;
		}
		setPaymentInProgress(true);

		try {
			const currentTransactions = state.transactions;
			const currentAmountPaidOverall = state.amountPaid;
			// Check if the *entire order* is fully paid
			const isOrderFullyPaid = isPaymentCompleteInternal(
				currentAmountPaidOverall
			);

			console.log("Completion check:", {
				currentAmountPaidOverall,
				totalAmount,
				isOrderFullyPaid,
				isSplitMode: state.splitMode,
			});

			if (state.splitMode && !isOrderFullyPaid) {
				// --- Scenario 1: Split Mode and Order NOT Fully Paid ---
				console.log("SPLIT CONTINUE: Navigating back to Split view.");
				customerDisplayManager.showCart(); // Reset customer display
				setTimeout(() => {
					if (isMountedRef.current) handleNavigation("Split", -1); // Navigate POS back
				}, 100);
			} else if (isOrderFullyPaid) {
				// --- Scenario 2: Order Fully Paid ---
				console.log(
					"COMPLETE: Order fully paid. Calling completePaymentFlow..."
				);
				// Call the hook's function to finalize with backend
				const completedOrderData = await completePaymentFlow(
					currentTransactions
				);

				if (completedOrderData) {
					// Backend successful
					console.log("COMPLETE: Backend successful.");
					// *** MODIFICATION START: Navigate, pass payload ***
					const receiptPayload = completedOrderData.receipt_payload || null;
					console.log(
						`COMPLETE: Navigating to Completion. Receipt payload ${
							receiptPayload ? "exists" : "missing"
						}.`
					);
					// Navigate to completion view, passing the payload
					openDrawerWithAgent();
					handleNavigation("Completion", 1, { receiptPayload: receiptPayload });
					// *** DO NOT PRINT HERE ANYMORE ***
					// if (receiptPayload) {
					//    printReceiptWithAgent(receiptPayload, true) ...
					// } else { ... }
					// *** MODIFICATION END ***
				} else {
					// Backend failed
					console.error("COMPLETE: Backend finalization failed.");
					toast.error("Failed to finalize order. Please check details.");
					// Error state likely set within completePaymentFlow hook
				}
			} else {
				// Should not happen if button logic is correct
				console.warn(
					"Complete button pressed but order not fully paid and not intermediate split."
				);
				setError("Cannot complete: Payment is not sufficient for the order.");
			}
		} catch (err) {
			console.error("Error during payment completion/continuation:", err);
			setError(err.message || "Failed processing completion/continuation");
			toast.error(`Error: ${err.message || "Completion failed"}`);
		} finally {
			if (isMountedRef.current) setPaymentInProgress(false);
		}
	};

	// --- Custom Amount Validation ---
	const isCustomAmountValid = () => {
		const amount = parseFloat(state.customAmount);
		// Check if amount is a number, positive, and meets/exceeds amount needed for *this step*
		return (
			!isNaN(amount) &&
			amount > 0 &&
			new Decimal(amount).greaterThanOrEqualTo(
				new Decimal(currentPaymentAmount).minus(epsilon)
			)
		);
	};

	// Get latest cash tendered/change for display
	const latestCashDisplay = getLatestCashDetails();

	// --- Render ---
	return (
		<motion.div
			key="cash-payment-ui"
			className="absolute inset-0 p-4 flex flex-col bg-slate-50"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper className="space-y-4">
				{/* Printer Status */}
				<div className="text-xs text-slate-500 mb-2">
					Printer Status:{" "}
					<span
						className={`font-medium ${
							isPrinterConnected ? "text-green-600" : "text-red-600"
						}`}
					>
						{isPrinterConnected
							? isPrinterProcessing
								? "Busy..."
								: "Connected"
							: "Disconnected"}
					</span>
				</div>

				{/* Error Display */}
				{displayError && (
					<motion.div
						className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-start gap-2 text-sm shadow-sm"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<XCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
						<span>{displayError}</span>
					</motion.div>
				)}

				{/* Amount Due Box - Uses corrected currentPaymentAmount */}
				<div className="p-4 bg-blue-50 text-blue-700 rounded-lg shadow">
					<div className="font-medium mb-1 text-blue-800">
						Amount Due This Step
					</div>
					<div className="text-3xl font-bold text-blue-900">
						{formatPrice(currentPaymentAmount)}
					</div>
					{/* Show total remaining only if in split mode and it differs */}
					{state.splitMode &&
						Math.abs(remainingAmountProp - currentPaymentAmount) > epsilon && (
							<div className="text-xs mt-1 text-blue-600">
								Total Order Remaining: {formatPrice(remainingAmountProp)}
							</div>
						)}
				</div>

				{/* Quick Amounts Section */}
				<div className="space-y-2">
					<h4 className="text-sm font-medium text-slate-600">Quick Amounts</h4>
					<div className="grid grid-cols-3 gap-3">
						{/* Exact Amount Button */}
						<PaymentButton
							label={formatPrice(currentPaymentAmount)}
							onClick={() => handlePresetAmount(currentPaymentAmount)}
							disabled={paymentInProgress || currentPaymentAmount < epsilon}
							className={`bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed`}
						/>
						{/* Preset Dollar Amounts */}
						{[5, 10, 20, 50, 100].map((amount) => (
							<PaymentButton
								key={amount}
								label={`$${amount}`}
								onClick={() => handlePresetAmount(amount)}
								disabled={paymentInProgress || currentPaymentAmount < epsilon}
								variant="default"
								className={"disabled:opacity-50 disabled:cursor-not-allowed"}
							/>
						))}
					</div>
				</div>

				{/* Custom Amount Section */}
				<div className="space-y-2">
					<h4 className="text-sm font-medium text-slate-600">Custom Amount</h4>
					<div className="grid grid-cols-2 gap-3">
						<div className="relative">
							<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
								$
							</span>
							<input
								type="number"
								className="w-full pl-7 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-right disabled:opacity-50 disabled:bg-slate-100"
								placeholder="Enter amount"
								min={
									currentPaymentAmount > epsilon
										? currentPaymentAmount.toFixed(2)
										: "0.01"
								} // Use fixed value for min
								step="0.01"
								value={state.customAmount}
								onChange={(e) =>
									setParentState((prev) => ({
										...prev,
										customAmount: e.target.value,
									}))
								}
								disabled={paymentInProgress || currentPaymentAmount < epsilon}
								onKeyPress={(e) => {
									if (
										e.key === "Enter" &&
										!paymentInProgress &&
										isCustomAmountValid()
									) {
										handleCustomAmount();
									}
								}}
							/>
						</div>
						<PaymentButton
							label={paymentInProgress ? "Processing..." : "Pay"}
							variant="primary"
							onClick={handleCustomAmount}
							disabled={
								paymentInProgress ||
								!state.customAmount ||
								!isCustomAmountValid() ||
								currentPaymentAmount < epsilon
							}
							className="py-3"
						/>
					</div>
					{/* Validation message */}
					{state.customAmount &&
						!isCustomAmountValid() &&
						parseFloat(state.customAmount) >= 0 && (
							<div className="text-xs text-red-500 pl-1">
								Amount must be at least {formatPrice(currentPaymentAmount)}
							</div>
						)}
				</div>

				{/* Change Due Display */}
				{shouldShowChangeCalculation() && (
					<motion.div
						className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg space-y-2 shadow-sm"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<div className="flex justify-between items-center text-sm">
							<span className="font-medium">Cash Tendered (Last):</span>
							<span className="font-semibold">
								{formatPrice(latestCashDisplay.cashTendered)}
							</span>
						</div>
						<div className="flex justify-between items-center font-bold text-lg">
							<span>Change Due (Last):</span>
							<span>{formatPrice(latestCashDisplay.change)}</span>
						</div>
						{/* Show overall remaining only if it's relevant */}
						{remainingAmountProp > epsilon && (
							<div className="flex justify-between items-center text-xs text-emerald-700 pt-1 border-t border-emerald-100 mt-2">
								<span>Remaining Order Balance:</span>
								<span>{formatPrice(remainingAmountProp)}</span>
							</div>
						)}
					</motion.div>
				)}

				{/* Buttons at the bottom */}
				<div className="mt-auto pt-4 border-t border-slate-200 space-y-3 flex-shrink-0">
					<PaymentButton
						label={
							// Check overall completion to decide label
							state.splitMode && !isPaymentCompleteInternal(state.amountPaid)
								? "Continue Split"
								: "Complete Payment"
						}
						variant="primary"
						onClick={handlePaymentCompletionAndPrint}
						// Enable button based on whether the *current step* is met
						disabled={!canCompleteCurrentStep()}
						className={`w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed`}
					/>
					{/* Optional Manual Print Button Removed for brevity, add back if needed */}
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

// *** ADD totalAmount and update state shape in propTypes ***
CashPaymentView.propTypes = {
	state: PropTypes.shape({
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired, // Overall amount paid
		orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		transactions: PropTypes.array.isRequired,
		customAmount: PropTypes.string.isRequired,
		splitDetails: PropTypes.object,
		nextSplitAmount: PropTypes.number, // Keep if used elsewhere, but logic relies on currentStepAmount
		currentStepAmount: PropTypes.number, // *** ADDED: Expect this from state now ***
		currentSplitMethod: PropTypes.string,
		totalTipAmount: PropTypes.number,
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired, // Overall remaining amount for order
	totalAmount: PropTypes.number.isRequired, // *** ADDED: Full order total ***
	handlePayment: PropTypes.func.isRequired, // processPayment from usePaymentFlow
	setState: PropTypes.func.isRequired, // setState from usePaymentFlow
	completePaymentFlow: PropTypes.func.isRequired,
	handleNavigation: PropTypes.func.isRequired,
};

export default CashPaymentView;
