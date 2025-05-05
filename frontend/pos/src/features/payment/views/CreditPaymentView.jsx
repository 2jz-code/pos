// frontend/features/payment/views/CreditPaymentView.jsx

import { motion } from "framer-motion";
import { CreditCardIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { useCustomerFlow } from "../../../features/customerDisplay/hooks/useCustomerFlow";
import { formatPrice } from "../../../utils/numberUtils";
import TerminalStatusIndicator from "../components/TerminalStatusIndicator";
import { useCartStore } from "../../../store/cartStore";
import { useTerminal } from "../hooks/useTerminal";
import { Decimal } from "decimal.js";
import customerDisplayManager from "../../customerDisplay/utils/windowManager";
import { toast } from "react-toastify";
// No longer need printReceiptWithAgent here

const { pageVariants, pageTransition } = paymentAnimations;

// Define PropTypes for the component's props for better type checking and documentation
const commonPropTypes = {
	state: PropTypes.shape({
		orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired, // Overall amount paid before this step
		transactions: PropTypes.array.isRequired,
		splitDetails: PropTypes.object,
		nextSplitAmount: PropTypes.number, // Amount potentially set for the next split step
		currentStepAmount: PropTypes.number, // Amount specifically due for *this* credit step
		currentSplitMethod: PropTypes.string,
		totalTipAmount: PropTypes.number, // Overall tip accumulated so far
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired, // Overall remaining amount for the *entire order*
	handlePayment: PropTypes.func.isRequired, // Function from usePaymentFlow to process a payment step
	completePaymentFlow: PropTypes.func.isRequired, // Function from usePaymentFlow to finalize the order
	handleNavigation: PropTypes.func.isRequired, // Function from usePaymentFlow to change views
	totalAmount: PropTypes.number.isRequired, // The total amount of the *entire order*
};

// Define common animation properties for Framer Motion
const commonMotionProps = {
	variants: pageVariants,
	initial: "enter",
	animate: "center",
	exit: "exit",
	transition: pageTransition,
};

/**
 * CreditPaymentView Component
 * Handles the UI and logic for processing credit card payments,
 * including interaction with the customer display/terminal flow.
 * After successful finalization, it navigates to the CompletionView,
 * passing the receipt payload if available.
 */
export const CreditPaymentView = ({
	state,
	remainingAmount: remainingAmountProp,
	handlePayment,
	completePaymentFlow,
	handleNavigation,
	totalAmount,
}) => {
	// --- State Variables ---
	const [error, setError] = useState(null); // Stores any error messages for display
	const [viewProcessingState, setViewProcessingState] = useState(false); // Tracks if the view is busy (e.g., starting flow)
	const [flowStarted, setFlowStarted] = useState(false); // Tracks if the customer display/terminal flow has been initiated
	// *** Print decision state REMOVED ***

	// --- Hooks ---
	const { cancelTerminalAction } = useTerminal(); // Hook for interacting with the payment terminal context
	const {
		flowActive, // Is the customer display flow currently active?
		currentStep: customerFlowStep, // What step is the customer display on?
		startFlow, // Function to initiate the customer display flow
		completeFlow: completeCustomerDisplayFlow, // Function to end the customer display flow
		stepData, // Data associated with the current customer display step
		resetFlowForSplitContinuation, // Function to reset customer display state for the next split payment
	} = useCustomerFlow(); // Hook for managing the customer-facing display flow

	// --- Refs ---
	const paymentProcessedRef = useRef(false); // Tracks if handlePayment has been called for the current terminal signal
	const completionProcessedRef = useRef(false); // Tracks if the finalization/navigation logic has started for the current completion event
	const isMountedRef = useRef(false); // Tracks if the component is currently mounted
	const epsilon = 0.01; // Tolerance for floating point comparisons

	// --- Calculations --- (remain the same)
	const currentRemainingAmount = remainingAmountProp;
	const currentPaymentAmount = useMemo(() => {
		if (
			state.splitMode &&
			state.currentStepAmount !== null &&
			state.currentStepAmount !== undefined &&
			state.currentStepAmount >= 0
		) {
			return parseFloat(state.currentStepAmount.toFixed(2));
		}
		if (!state.splitMode) {
			const overallRemaining = Math.max(0, remainingAmountProp);
			return parseFloat(overallRemaining.toFixed(2));
		}
		console.warn(
			"CreditPaymentView: currentStepAmount not set in split mode, falling back to overall remaining amount."
		);
		const fallbackRemaining = Math.max(0, remainingAmountProp);
		return parseFloat(fallbackRemaining.toFixed(2));
	}, [state.splitMode, state.currentStepAmount, remainingAmountProp]);
	const tipForThisPayment = stepData?.tip?.tipAmount || 0;
	const amountChargedThisTxnNum = parseFloat(
		new Decimal(currentPaymentAmount)
			.plus(new Decimal(tipForThisPayment))
			.toFixed(2)
	);
	const currentPaymentAmountNum = parseFloat(
		new Decimal(currentPaymentAmount).toFixed(2)
	);
	const tipForThisPaymentNum = parseFloat(
		new Decimal(tipForThisPayment).toFixed(2)
	);

	// --- Effects ---

	// Mount/Unmount Effect
	useEffect(() => {
		isMountedRef.current = true;
		paymentProcessedRef.current = false;
		completionProcessedRef.current = false;
		setError(null);
		setFlowStarted(false);
		setViewProcessingState(false);
		console.log(`CreditPaymentView Mounted/Reset for total: ${totalAmount}`);
		return () => {
			isMountedRef.current = false;
			console.log("CreditPaymentView Unmounted");
		};
	}, [totalAmount]);

	// Start Customer Display Flow (remains the same)
	const startCreditPaymentFlow = useCallback(async () => {
		if (flowStarted || viewProcessingState || !isMountedRef.current) return;
		setViewProcessingState(true);
		setError(null);
		paymentProcessedRef.current = false;
		completionProcessedRef.current = false;
		try {
			const orderId = state.orderId || useCartStore.getState().orderId;
			if (!orderId) throw new Error("Order ID missing");
			console.log("CREDIT VIEW: Starting POS and customer display flow...");
			const payloadForDisplay = {
				orderData: {
					total: currentPaymentAmountNum,
					isSplitPayment: state.splitMode,
					originalTotal: totalAmount,
				},
			};
			const startFlowArgs = {
				orderId: orderId,
				initialStep: "tip",
				paymentMethod: "credit",
				amountDue: currentPaymentAmountNum,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitMode ? state.splitDetails : null,
				payload: payloadForDisplay,
				amountCharged: amountChargedThisTxnNum,
			};
			startFlow(startFlowArgs);
			console.log(
				"CREDIT VIEW: useCustomerFlow.startFlow called.",
				startFlowArgs
			);
			setFlowStarted(true);
		} catch (err) {
			console.error("CREDIT VIEW: Error starting customer display flow:", err);
			setError(err.message || "Failed to start payment process.");
			setFlowStarted(false);
		} finally {
			if (isMountedRef.current) setViewProcessingState(false);
		}
	}, [
		state.orderId,
		state.splitMode,
		state.splitDetails,
		currentPaymentAmountNum,
		totalAmount,
		amountChargedThisTxnNum,
		flowStarted,
		viewProcessingState,
		startFlow,
	]);

	// --- Main Effect: Handles Payment Result, Finalization, and Navigation ---
	useEffect(() => {
		const receiptStepSignalledComplete = stepData.receiptComplete === true;
		const paymentSuccess = stepData.payment?.status === "success";

		console.log(
			`CREDIT_VIEW_EFFECT_MAIN: Step=${customerFlowStep}, ReceiptDone=${receiptStepSignalledComplete}, PaymentOK=${paymentSuccess}, PaymentProcessedRef=${paymentProcessedRef.current}, CompletionProcessedRef=${completionProcessedRef.current}`
		);

		if (
			customerFlowStep === "receipt" &&
			receiptStepSignalledComplete &&
			paymentSuccess &&
			!paymentProcessedRef.current
		) {
			paymentProcessedRef.current = true;
			console.log(
				"CREDIT_VIEW_EFFECT_MAIN: Conditions MET. Processing payment update..."
			);
			setViewProcessingState(true);

			// Prepare transaction details
			const paymentInfo = stepData.payment;
			const nestedPaymentObject = {
				status: "success",
				transactionId: paymentInfo.transactionId,
				amount: amountChargedThisTxnNum,
				timestamp: paymentInfo.timestamp || new Date().toISOString(),
				cardInfo: paymentInfo.cardInfo || { brand: "Card", last4: "****" },
				reader: paymentInfo.reader || null,
				splitPayment: state.splitMode,
				splitAmount: state.splitMode ? currentPaymentAmountNum : null,
				originalTotal: currentPaymentAmountNum,
				orderId: state.orderId,
				tipAmount: tipForThisPaymentNum,
			};
			const transactionDetails = {
				method: "credit",
				cardInfo: paymentInfo.cardInfo,
				transactionId: paymentInfo.transactionId,
				flowData: { ...stepData, payment: nestedPaymentObject },
			};

			// Update payment state via hook
			handlePayment(amountChargedThisTxnNum, transactionDetails)
				.then((paymentResult) => {
					if (!isMountedRef.current) return;
					if (!paymentResult || !paymentResult.success) {
						throw new Error(
							paymentResult?.error || "Failed to record payment transaction."
						);
					}

					console.log(
						"CREDIT_VIEW_EFFECT_MAIN: handlePayment succeeded:",
						paymentResult
					);
					const { isNowComplete, updatedTransactions } = paymentResult;

					// Check if the entire order is complete
					if (isNowComplete && !completionProcessedRef.current) {
						completionProcessedRef.current = true;
						console.log(
							"CREDIT_VIEW_EFFECT_MAIN: Order complete. Finalizing..."
						);

						// Finalize order with backend
						(async () => {
							let finalizationErrorOccurred = false;
							let completedOrderData = null;
							try {
								completedOrderData = await completePaymentFlow(
									updatedTransactions
								);
								if (!isMountedRef.current) return;

								if (completedOrderData) {
									console.log("CREDIT_VIEW_EFFECT_MAIN: Backend successful.");
									// *** Navigate directly to Completion, passing payload ***
									const receiptPayload =
										completedOrderData.receipt_payload || null;
									console.log(
										`CREDIT_VIEW_EFFECT_MAIN: Navigating to Completion. Payload ${
											receiptPayload ? "exists" : "missing"
										}.`
									);
									handleNavigation("Completion", 1, {
										receiptPayload: receiptPayload,
									});
								} else {
									console.error(
										"CREDIT_VIEW_EFFECT_MAIN: Backend finalization failed."
									);
									toast.error("Failed to finalize order.");
									finalizationErrorOccurred = true;
								}
							} catch (finalizationError) {
								if (!isMountedRef.current) return;
								console.error(
									"CREDIT_VIEW_EFFECT_MAIN: Error during finalizeOrder:",
									finalizationError
								);
								setError(
									finalizationError.message || "Error finalizing order."
								);
								toast.error(
									`Error: ${finalizationError.message || "Finalization failed"}`
								);
								finalizationErrorOccurred = true;
							} finally {
								if (isMountedRef.current) {
									// Reset completion ref only if an error occurred
									if (finalizationErrorOccurred) {
										completionProcessedRef.current = false;
									}
									// Stop processing indicator after finalization attempt
									setViewProcessingState(false);
								}
							}
						})(); // End IIAFE
					} else if (
						state.splitMode &&
						!isNowComplete &&
						!completionProcessedRef.current
					) {
						// Intermediate Split Logic (remains the same)
						completionProcessedRef.current = true;
						console.log(
							"CREDIT_VIEW_EFFECT_MAIN: Intermediate split complete. Resetting..."
						);
						completeCustomerDisplayFlow();
						setFlowStarted(false);
						const orderTotalAmount = totalAmount;
						const amountPaidSoFar = paymentResult.newAmountPaid;
						const remainingAfterThisSplit = Math.max(
							0,
							orderTotalAmount - amountPaidSoFar
						);
						resetFlowForSplitContinuation({
							amountPaid: amountPaidSoFar,
							remainingAmount: remainingAfterThisSplit,
							currentPaymentAmount: amountChargedThisTxnNum,
						});
						setTimeout(() => {
							if (isMountedRef.current) {
								handleNavigation("Split", -1);
								completionProcessedRef.current = false;
								paymentProcessedRef.current = false;
							}
						}, 50);
						setViewProcessingState(false);
					} else if (completionProcessedRef.current) {
						console.log(
							"CREDIT_VIEW_EFFECT_MAIN: Completion already processed. Skipping."
						);
						if (viewProcessingState) setViewProcessingState(false);
					} else {
						console.error("CREDIT_VIEW_EFFECT_MAIN: Unexpected state.");
						setError("Unexpected payment state after processing.");
						completionProcessedRef.current = false;
						paymentProcessedRef.current = false;
						setViewProcessingState(false);
					}
				})
				.catch((err) => {
					// Catch errors from handlePayment itself
					if (!isMountedRef.current) return;
					console.error(
						"CREDIT_VIEW_EFFECT_MAIN: Error in handlePayment chain:",
						err
					);
					setError(err.message || "Error processing payment.");
					paymentProcessedRef.current = false;
					completionProcessedRef.current = false;
					completeCustomerDisplayFlow();
					setFlowStarted(false);
					setViewProcessingState(false);
				});
		} else {
			console.log(
				"CREDIT_VIEW_EFFECT_MAIN: Conditions NOT met or already processed. Skipping."
			);
		}
	}, [
		// Dependencies
		customerFlowStep,
		stepData.receiptComplete,
		stepData.payment?.status,
		stepData.payment?.transactionId,
		handlePayment,
		completePaymentFlow,
		handleNavigation,
		completeCustomerDisplayFlow,
		resetFlowForSplitContinuation,
		state.orderId,
		state.splitMode,
		totalAmount,
		amountChargedThisTxnNum,
		currentPaymentAmountNum,
		tipForThisPaymentNum,
	]);

	// Cancel Payment (remains the same)
	const cancelCardPayment = async () => {
		if (viewProcessingState) return;
		setViewProcessingState(true);
		setError(null);
		console.log("CREDIT VIEW: Attempting to cancel credit payment flow...");
		try {
			console.log("CREDIT VIEW: Calling cancelTerminalAction...");
			const cancelResult = await cancelTerminalAction();
			if (cancelResult.success) {
				console.log("CREDIT VIEW: cancelTerminalAction request sent.");
			} else {
				console.warn(
					"CREDIT VIEW: cancelTerminalAction failed.",
					cancelResult.error
				);
				setError(
					`Cancellation failed: ${
						cancelResult.error || "Could not reach service"
					}. Check terminal.`
				);
			}
			if (flowActive) {
				console.log("CREDIT VIEW: Resetting customer display flow.");
				completeCustomerDisplayFlow();
			}
			handleNavigation(state.splitMode ? "Split" : "InitialOptions", -1);
			customerDisplayManager.showCart();
		} catch (err) {
			console.error("CREDIT VIEW: Error during cancellation:", err);
			setError("Failed to execute cancellation cleanly.");
		} finally {
			if (isMountedRef.current) {
				setViewProcessingState(false);
				setFlowStarted(false);
				paymentProcessedRef.current = false;
				completionProcessedRef.current = false;
			}
		}
	};

	// --- Render Logic ---
	return (
		<motion.div
			key="credit-payment"
			className="absolute inset-0 p-4 space-y-3"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper>
				{/* Split payment indicator */}
				{state.splitMode && (
					<motion.div
						className="p-3 bg-amber-50 text-amber-700 rounded-lg mb-3 flex items-center justify-between text-sm shadow-sm"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<span>
							Split Payment: Paying{" "}
							<b>{formatPrice(currentPaymentAmountNum)}</b>
						</span>
						{!flowStarted && !viewProcessingState && (
							<button
								onClick={() => handleNavigation("Split", -1)}
								className="px-2 py-0.5 bg-white text-amber-700 border border-amber-200 rounded-md text-xs hover:bg-amber-50"
							>
								Back
							</button>
						)}
					</motion.div>
				)}

				{/* Error display */}
				{error && (
					<motion.div
						className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center text-sm shadow-sm border border-red-200"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<XCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" /> {error}
					</motion.div>
				)}

				{/* Amount display */}
				<div className="p-3 bg-blue-50 text-blue-700 rounded-lg shadow-sm border border-blue-100">
					<div className="font-medium text-sm mb-0.5 text-blue-800">
						Amount Due This Payment
					</div>
					<div className="text-xl font-bold text-blue-900">
						{formatPrice(currentPaymentAmountNum)}
					</div>
					{state.splitMode &&
						Math.abs(currentRemainingAmount - currentPaymentAmountNum) >
							epsilon && (
							<div className="text-xs mt-0.5 opacity-80 text-blue-600">
								Total Order Remaining: {formatPrice(currentRemainingAmount)}
							</div>
						)}
				</div>

				{/* Terminal Status Indicator */}
				<TerminalStatusIndicator />

				{/* Control Buttons / Status Display */}
				<div className="mt-4">
					{/* Show Start Button or Waiting Status */}
					{!flowStarted ? (
						<PaymentButton
							icon={CreditCardIcon}
							label={viewProcessingState ? "Starting..." : "Start Card Payment"}
							variant="primary"
							onClick={startCreditPaymentFlow}
							disabled={viewProcessingState || currentPaymentAmountNum <= 0}
							className="w-full py-3 text-lg"
						/>
					) : (
						<div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm text-center">
							<div className="text-sm font-medium text-slate-600 mb-2">
								Customer Interaction Required
							</div>
							<div className="flex items-center justify-center text-slate-800">
								<div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
								<span>
									{customerFlowStep
										? `Waiting for: ${customerFlowStep
												.replace(/_/g, " ")
												.toUpperCase()}`
										: "Initializing Flow..."}
								</span>
							</div>
							<p className="text-xs text-slate-500 mt-2">
								Guide customer through steps on their display.
							</p>
							<button
								onClick={cancelCardPayment}
								className="mt-4 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
								disabled={viewProcessingState}
							>
								{viewProcessingState
									? "Processing..."
									: "Cancel Payment Process"}
							</button>
						</div>
					)}
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CreditPaymentView.propTypes = commonPropTypes;
export default CreditPaymentView;
