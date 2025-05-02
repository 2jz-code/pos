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
import { useReceiptPrinter } from "../../../hooks/useReceiptPrinter";
import { calculateCartTotals } from "../../cart/utils/cartCalculations";
import { useTerminal } from "../hooks/useTerminal";
import { Decimal } from "decimal.js";
import customerDisplayManager from "../../customerDisplay/utils/windowManager";

const { pageVariants, pageTransition } = paymentAnimations;

const commonPropTypes = {
	state: PropTypes.shape({
		orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Allow string/number for orderId
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		transactions: PropTypes.array.isRequired,
		splitDetails: PropTypes.object,
		nextSplitAmount: PropTypes.number, // Still passed, but logic uses currentStepAmount
		currentStepAmount: PropTypes.number, // *** Expect this prop from state ***
		currentSplitMethod: PropTypes.string,
		totalTipAmount: PropTypes.number, // Expect this
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired, // Overall remaining
	handlePayment: PropTypes.func.isRequired,
	completePaymentFlow: PropTypes.func.isRequired,
	handleNavigation: PropTypes.func.isRequired,
	totalAmount: PropTypes.number.isRequired, // Overall total
};

const commonMotionProps = {
	variants: pageVariants,
	initial: "enter",
	animate: "center",
	exit: "exit",
	transition: pageTransition,
};

export const CreditPaymentView = ({
	state,
	remainingAmount: remainingAmountProp,
	handlePayment, // Renamed from processPayment for clarity in props
	completePaymentFlow,
	handleNavigation,
	totalAmount,
}) => {
	const [error, setError] = useState(null);
	const [viewProcessingState, setViewProcessingState] = useState(false); // For UI feedback (e.g., disabling buttons)
	const [flowStarted, setFlowStarted] = useState(false); // Tracks if customer display flow is active
	const { printReceipt } = useReceiptPrinter();
	const { cancelTerminalAction } = useTerminal();
	const {
		flowActive,
		currentStep: customerFlowStep,
		startFlow, // Not needed if goToStep handles it
		// goToStep,
		completeFlow: completeCustomerDisplayFlow,
		stepData,
		resetFlowForSplitContinuation,
	} = useCustomerFlow();

	// Refs to prevent duplicate processing within effect runs
	const paymentProcessedRef = useRef(false); // Tracks if handlePayment call was made for the current signal
	const completionProcessedRef = useRef(false); // Tracks if finalization/navigation logic has started
	const isMountedRef = useRef(false); // Tracks component mount status
	const epsilon = 0.01;

	// --- Calculations ---
	const currentRemainingAmount = remainingAmountProp;
	const currentPaymentAmount = useMemo(() => {
		// 1. Prioritize amount explicitly set for this step in the state
		if (
			state.splitMode &&
			state.currentStepAmount !== null &&
			state.currentStepAmount !== undefined &&
			state.currentStepAmount >= 0
		) {
			console.log(
				`CREDIT VIEW: Using currentStepAmount: ${state.currentStepAmount}`
			);
			return parseFloat(state.currentStepAmount.toFixed(2));
		}
		// 2. Fallback for non-split mode: use the total remaining order amount
		if (!state.splitMode) {
			const overallRemaining = Math.max(0, remainingAmountProp);
			console.log(
				`CREDIT VIEW: Using overall remaining (non-split): ${overallRemaining}`
			);
			return parseFloat(overallRemaining.toFixed(2));
		}
		// 3. Fallback IN split mode if currentStepAmount isn't set (should be rare)
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
	// --- End Calculations ---

	// --- Mount/Unmount ---
	useEffect(() => {
		isMountedRef.current = true;
		// Reset refs on mount/remount (e.g., if totalAmount changes)
		paymentProcessedRef.current = false;
		completionProcessedRef.current = false;
		setError(null); // Clear any previous errors
		setFlowStarted(false); // Ensure flow isn't considered started from previous mount
		return () => {
			isMountedRef.current = false;
			// No need to reset refs on unmount typically, handled on mount
		};
	}, [totalAmount]); // Reset logic depends on totalAmount changing

	// --- Start Customer Display Flow ---
	const startCreditPaymentFlow = useCallback(async () => {
		if (flowStarted || viewProcessingState || !isMountedRef.current) return;
		setViewProcessingState(true);
		setError(null);
		paymentProcessedRef.current = false;
		completionProcessedRef.current = false;

		try {
			const orderId = state.orderId || useCartStore.getState().orderId;
			if (!orderId) throw new Error("Order ID missing");

			console.log(
				"CREDIT VIEW: Starting POS and customer display flow via useCustomerFlow..."
			);

			// Prepare payload for customer display views
			const payloadForDisplay = {
				orderData: {
					total: currentPaymentAmountNum,
					isSplitPayment: state.splitMode,
					originalTotal: totalAmount,
				},
			};
			// Prepare arguments for useCustomerFlow's startFlow method
			const startFlowArgs = {
				orderId: orderId,
				initialStep: "tip",
				paymentMethod: "credit",
				amountDue: currentPaymentAmountNum, // Base amount for step
				isSplitPayment: state.splitMode,
				splitDetails: state.splitMode ? state.splitDetails : null,
				payload: payloadForDisplay,
				amountCharged: amountChargedThisTxnNum, // Pass total charged context if needed
			};

			// *** Call startFlow from the useCustomerFlow hook ***
			startFlow(startFlowArgs);
			console.log(
				"CREDIT VIEW: useCustomerFlow.startFlow called.",
				startFlowArgs
			);

			setFlowStarted(true); // Update local UI state
		} catch (err) {
			console.error("CREDIT VIEW: Error starting customer display flow:", err);
			setError(err.message || "Failed to start payment process.");
			setFlowStarted(false);
		} finally {
			if (isMountedRef.current) setViewProcessingState(false);
		}
	}, [
		// Dependencies
		state.orderId,
		state.splitMode,
		state.splitDetails,
		state.amountPaid, // Added amountPaid if needed for context
		currentPaymentAmountNum,
		totalAmount,
		amountChargedThisTxnNum, // Amounts
		flowStarted,
		viewProcessingState, // Local state
		// Add useCustomerFlow actions if needed, e.g. a hypothetical setCustomerFlowStep
	]);

	// --- Unified Effect: Handle Payment Result and Completion/Split Navigation ---
	useEffect(() => {
		const receiptStepSignalledComplete = stepData.receiptComplete === true;
		const paymentSuccess = stepData.payment?.status === "success";

		console.log(
			`CREDIT_VIEW_EFFECT_MAIN: Step=${customerFlowStep}, ReceiptDone=${receiptStepSignalledComplete}, PaymentOK=${paymentSuccess}, PaymentProcessedRef=${paymentProcessedRef.current}, CompletionProcessedRef=${completionProcessedRef.current}`
		);

		// Condition to initially process the payment signal from customer display
		if (
			customerFlowStep === "receipt" &&
			receiptStepSignalledComplete &&
			paymentSuccess &&
			!paymentProcessedRef.current // Check if handlePayment call was already made for this signal
		) {
			// Mark that we've initiated processing for this specific payment signal
			paymentProcessedRef.current = true;
			console.log(
				"CREDIT_VIEW_EFFECT_MAIN: Conditions MET. Setting PaymentProcessedRef=true. Processing payment..."
			);

			// Prepare details for handlePayment
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

			// Call handlePayment (processPayment from usePaymentFlow hook)
			handlePayment(amountChargedThisTxnNum, transactionDetails)
				.then((paymentResult) => {
					if (!isMountedRef.current) return; // Check mount status after async

					// Handle failure from handlePayment (e.g., state update error)
					if (!paymentResult || !paymentResult.success) {
						console.error(
							"CREDIT_VIEW_EFFECT_MAIN: handlePayment failed:",
							paymentResult?.error || "Unknown handlePayment error"
						);
						setError(
							paymentResult?.error || "Failed to record payment transaction."
						);
						paymentProcessedRef.current = false; // Allow retry ONLY if handlePayment itself failed
						completionProcessedRef.current = false; // Ensure completion ref is also reset
						completeCustomerDisplayFlow(); // Attempt to reset customer display
						setFlowStarted(false); // Update UI state
						return; // Stop further processing in this .then() block
					}

					// --- Payment was successfully processed by usePaymentFlow, now decide course of action ---
					console.log(
						"CREDIT_VIEW_EFFECT_MAIN: handlePayment succeeded. Result:",
						paymentResult
					);
					const { isNowComplete, updatedTransactions } = paymentResult; // Get completion status and final TX list

					// Double-check if completion/navigation hasn't already started from a rapid re-run
					if (completionProcessedRef.current) {
						console.log(
							"CREDIT_VIEW_EFFECT_MAIN: Completion/Navigation already in progress, skipping."
						);
						return;
					}

					console.log(
						`CREDIT_VIEW_EFFECT_MAIN: Checking completion status. isNowComplete=${isNowComplete}, state.splitMode=${state.splitMode}`
					);

					// ---- FINAL COMPLETION LOGIC ----
					if (isNowComplete) {
						// Mark that final completion logic is starting
						completionProcessedRef.current = true;
						paymentProcessedRef.current = true; // Ensure this remains true during finalization

						console.log(
							"CREDIT_VIEW_EFFECT_MAIN: Total payment complete according to handlePayment result. Finalizing..."
						);

						const finalizeOrder = async (transactionsToComplete) => {
							if (!isMountedRef.current) return; // Final check before async ops
							setViewProcessingState(true); // Indicate finalization processing

							try {
								// --- Print Receipt (Run asynchronously) ---
								try {
									const cartForReceipt = useCartStore.getState().cart;
									const discountForReceipt =
										useCartStore.getState().orderDiscount;
									const { subtotal, taxAmount } = calculateCartTotals(
										cartForReceipt,
										discountForReceipt
									);
									const latestTransaction =
										transactionsToComplete[transactionsToComplete.length - 1];
									const finalPaymentInfo =
										latestTransaction?.flowData?.payment || {};
									const finalTipTotal = transactionsToComplete.reduce(
										(sum, tx) => sum + Number(tx.tipAmount || 0),
										0
									);
									const finalGrandTotal = parseFloat(
										new Decimal(totalAmount)
											.plus(new Decimal(finalTipTotal))
											.toFixed(2)
									);

									const receiptData = {
										id: state.orderId || Math.floor(Date.now() / 1000),
										timestamp: new Date().toISOString(),
										items: cartForReceipt.map((item) => ({
											product_name: item.name,
											quantity: item.quantity,
											unit_price: item.price,
										})),
										total_price: finalGrandTotal,
										subtotal: subtotal,
										tax: taxAmount,
										tip: finalTipTotal,
										payment: {
											method: state.splitMode ? "Split" : "Credit",
											card_type: finalPaymentInfo.cardInfo?.brand || "Card",
											last_four: finalPaymentInfo.cardInfo?.last4 || "****",
										},
										is_split_payment: state.splitMode,
										// Add store details from config/context if available
										store_name: "Ajeen Restaurant",
										store_address: "123 Main Street",
										store_phone: "(123) 456-7890",
										receipt_footer: "Thank you for your purchase!",
									};
									console.log(
										"CREDIT_VIEW_EFFECT_MAIN: >>> Calling printReceipt <<<",
										receiptData
									);
									printReceipt({
										receipt_data: receiptData,
										open_drawer: false,
									})
										.then(() =>
											console.log(
												"CREDIT_VIEW_EFFECT_MAIN: Receipt print call initiated (async)."
											)
										)
										.catch((e) =>
											console.error(
												"CREDIT_VIEW_EFFECT_MAIN: Receipt printing failed (non-blocking):",
												e
											)
										);
								} catch (printPrepError) {
									console.error(
										"CREDIT_VIEW_EFFECT_MAIN: Error preparing receipt data (non-blocking):",
										printPrepError
									);
								}

								// --- Complete Backend Flow ---
								console.log(
									"CREDIT_VIEW_EFFECT_MAIN: Calling completePaymentFlow..."
								);
								const backendSuccess = await completePaymentFlow(
									transactionsToComplete
								); // Pass the correct transactions
								console.log(
									"CREDIT_VIEW_EFFECT_MAIN: completePaymentFlow result:",
									backendSuccess
								);

								if (!isMountedRef.current) return; // Check mount status again

								if (backendSuccess) {
									console.log(
										"CREDIT_VIEW_EFFECT_MAIN: Backend successful. Navigating..."
									);
									handleNavigation("Completion"); // Navigate on success
								} else {
									console.error("CREDIT_VIEW_EFFECT_MAIN: Backend failed.");
									setError("Failed to finalize order backend.");
									completionProcessedRef.current = false; // Allow potential retry? Reset completion ref
									paymentProcessedRef.current = false; // Also reset payment ref? Might allow full retry
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
								completionProcessedRef.current = false; // Allow potential retry? Reset completion ref
								paymentProcessedRef.current = false; // Reset payment ref too?
							} finally {
								if (isMountedRef.current) setViewProcessingState(false); // Stop processing indicator
							}
						}; // --- End finalizeOrder ---

						finalizeOrder(updatedTransactions); // Pass the fresh transactions from paymentResult
					}
					// ---- INTERMEDIATE SPLIT LOGIC ----
					// This runs if payment was processed successfully, but the total order is NOT complete, and it's split mode.
					else if (state.splitMode && !isNowComplete) {
						// Mark that we are starting the intermediate navigation process
						completionProcessedRef.current = true;
						console.log(
							"CREDIT_VIEW_EFFECT_MAIN: Intermediate split part complete (isNowComplete=false). Resetting for next split."
						);

						// Reset UI/Flow state for the next split part
						completeCustomerDisplayFlow();
						setFlowStarted(false);
						// paymentProcessedRef.current = false; // IMPORTANT: Reset payment ref for the NEXT payment signal

						const orderTotalAmount = totalAmount;
						const amountPaidSoFar = paymentResult.newAmountPaid;
						const remainingAfterThisSplit = Math.max(
							0,
							orderTotalAmount - amountPaidSoFar
						);

						resetFlowForSplitContinuation({
							amountPaid: amountPaidSoFar,
							remainingAmount: remainingAfterThisSplit,
							currentPaymentAmount: amountChargedThisTxnNum, // Amount of the split part just paid
						});

						// Navigate back to Split view after a short delay
						setTimeout(() => {
							if (isMountedRef.current) {
								handleNavigation("Split", -1);
								// Reset completion ref AFTER navigation starts
								completionProcessedRef.current = false;
							}
						}, 50); // Delay helps ensure state updates settle before navigation potentially unmounts
					} else if (!state.splitMode && !isNowComplete) {
						// This case should ideally not happen if totalAmount is correct
						console.error(
							"CREDIT_VIEW_EFFECT_MAIN: Payment processed but not complete and not split mode. Unexpected state."
						);
						setError("Unexpected payment state after processing.");
						completionProcessedRef.current = false; // Reset refs to allow potential recovery/cancel
						paymentProcessedRef.current = false;
					}
				})
				.catch((err) => {
					// Catch errors from the handlePayment promise itself
					if (!isMountedRef.current) return;
					console.error(
						"CREDIT_VIEW_EFFECT_MAIN: Error in handlePayment promise chain:",
						err
					);
					setError(err.message || "Error processing payment.");
					paymentProcessedRef.current = false; // Allow retry
					completionProcessedRef.current = false; // Ensure completion ref is reset
					completeCustomerDisplayFlow();
					setFlowStarted(false);
				});
		}
	}, [
		// Dependencies
		customerFlowStep,
		stepData.receiptComplete,
		stepData.payment?.status,
		stepData.payment?.transactionId,
		handlePayment,
		state.orderId,
		state.splitMode,
		totalAmount,
		amountChargedThisTxnNum,
		currentPaymentAmountNum,
		tipForThisPaymentNum,
		completeCustomerDisplayFlow,
		printReceipt,
		completePaymentFlow,
		handleNavigation,
		resetFlowForSplitContinuation,
		flowStarted, // Added flowStarted
		// state.amountPaid removed as primary trigger, completion decided by handlePayment result
	]);

	// --- Cancel Payment ---
	const cancelCardPayment = async () => {
		if (viewProcessingState) return;
		setViewProcessingState(true);
		setError(null);
		console.log(
			"CREDIT VIEW: Attempting to cancel credit payment flow via cancelTerminalAction (using reader_id only)."
		);

		try {
			// *** REMOVED the check for paymentIntentToCancel ***

			// *** Directly call cancelTerminalAction from context ***
			// This relies on TerminalProvider calling the backend API which uses
			// stripe.terminal.Reader.cancel_action(reader_id)
			console.log("CREDIT VIEW: Calling cancelTerminalAction from context...");
			const cancelResult = await cancelTerminalAction(); // Call without arguments

			// Handle the result from the backend API call
			if (cancelResult.success) {
				console.log(
					"CREDIT VIEW: cancelTerminalAction request sent successfully (check terminal)."
				);
				// The backend API using Reader.cancel_action succeeded.
				// Note: This doesn't guarantee the underlying Payment Intent (if any) was cancelled by Stripe.
			} else {
				console.warn(
					"CREDIT VIEW: cancelTerminalAction request failed.",
					cancelResult.error
				);
				setError(
					`Cancellation failed: ${
						cancelResult.error || "Could not reach cancellation service"
					}. Please check terminal.`
				);
			}

			// --- Reset UI and Navigate Back ---
			// This part runs regardless of whether the terminal action was confirmed cancelled,
			// allowing the user to get out of the current view.

			// Reset customer display
			if (flowActive) {
				console.log("CREDIT VIEW: Resetting customer display flow.");
				completeCustomerDisplayFlow(); // Resets display to welcome/default
			}
			// Navigate POS back
			handleNavigation(state.splitMode ? "Split" : "InitialOptions", -1);
			customerDisplayManager.showCart();
		} catch (err) {
			// Catch errors from the cancelTerminalAction promise itself
			console.error("CREDIT VIEW: Error during cancellation process:", err);
			setError("Failed to execute cancellation cleanly.");
		} finally {
			if (isMountedRef.current) {
				setViewProcessingState(false);
				setFlowStarted(false); // Reset flow started flag
				paymentProcessedRef.current = false; // Reset processing refs
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
						className="p-3 bg-amber-50 text-amber-700 rounded-lg mb-3 flex items-center justify-between text-sm"
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
						className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center text-sm"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<XCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" /> {error}
					</motion.div>
				)}

				{/* Amount display */}
				<div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
					<div className="font-medium text-sm mb-0.5">
						Amount Due This Payment
					</div>
					<div className="text-xl font-bold">
						{formatPrice(currentPaymentAmountNum)}
					</div>
					{state.splitMode &&
						Math.abs(currentRemainingAmount - currentPaymentAmountNum) >
							epsilon && (
							<div className="text-xs mt-0.5 opacity-80">
								Total Order Remaining: {formatPrice(currentRemainingAmount)}
							</div>
						)}
				</div>

				{/* Terminal Status */}
				<TerminalStatusIndicator />

				{/* Control Buttons / Status Display */}
				<div className="mt-4">
					{!flowStarted ? (
						<PaymentButton
							icon={CreditCardIcon}
							label={viewProcessingState ? "Starting..." : "Start Card Payment"}
							variant="primary"
							onClick={startCreditPaymentFlow}
							disabled={viewProcessingState || currentPaymentAmountNum <= 0}
							className="w-full py-2.5"
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
									? "Cancelling..."
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
