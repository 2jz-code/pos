// frontend/features/payment/views/CreditPaymentView.jsx

import { motion } from "framer-motion";
import { CreditCardIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useState, useEffect, useRef, useCallback } from "react";
import PaymentButton from "../PaymentButton";
// Assuming paymentAnimations is correctly imported if used
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

const { pageVariants, pageTransition } = paymentAnimations; // Keep if used

const commonPropTypes = {
	state: PropTypes.shape({
		orderId: PropTypes.number,
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		transactions: PropTypes.array.isRequired,
		splitDetails: PropTypes.object,
		nextSplitAmount: PropTypes.number,
		currentSplitMethod: PropTypes.string,
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired, // This is base_remaining
	handlePayment: PropTypes.func.isRequired, // This is processPayment from usePaymentFlow
	completePaymentFlow: PropTypes.func.isRequired,
	handleNavigation: PropTypes.func.isRequired,
	totalAmount: PropTypes.number.isRequired, // This is base_total for the whole order
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
	remainingAmount: remainingAmountProp, // Renamed to avoid conflict
	handlePayment,
	completePaymentFlow,
	handleNavigation,
	totalAmount, // This is the base total for the entire order
}) => {
	const [error, setError] = useState(null);
	const [viewProcessingState, setViewProcessingState] = useState(false);
	const [flowStarted, setFlowStarted] = useState(false);
	const { printReceipt } = useReceiptPrinter();
	const { cancelTerminalAction } = useTerminal();
	const {
		flowActive,
		currentStep: customerFlowStep,
		startFlow,
		goToStep,
		completeFlow: completeCustomerDisplayFlow,
		stepData,
		resetFlowForSplitContinuation,
	} = useCustomerFlow();
	const paymentProcessedRef = useRef(false);
	const isMountedRef = useRef(false);
	const epsilon = 0.01; // Tolerance for float comparison

	// --- Calculations ---
	const currentRemainingAmount = remainingAmountProp;
	const currentPaymentAmount =
		state.splitMode && state.nextSplitAmount != null
			? state.nextSplitAmount
			: currentRemainingAmount;
	const tipForThisPayment = stepData?.tip?.tipAmount || 0;

	// Use Decimal for precision and store as number
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
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	// --- Start Customer Display Flow ---
	const startCreditPaymentFlow = useCallback(async () => {
		// ... (startCreditPaymentFlow logic remains the same) ...
		if (flowStarted || viewProcessingState || !isMountedRef.current) return;
		setViewProcessingState(true);
		setError(null);
		paymentProcessedRef.current = false;

		try {
			const orderId = state.orderId || useCartStore.getState().orderId;
			if (!orderId) throw new Error("Order ID missing for credit payment.");

			console.log("CREDIT VIEW: Starting customer flow...");
			const cart = useCartStore.getState().cart;
			const orderDiscount = useCartStore.getState().orderDiscount;
			const {
				subtotal,
				taxAmount,
				total: orderTotalFromCart,
				discountAmount,
			} = calculateCartTotals(cart, orderDiscount);

			const paymentAmountForFlow =
				state.splitMode && state.nextSplitAmount != null
					? state.nextSplitAmount
					: currentRemainingAmount;

			const initialFlowData = {
				paymentMethod: "credit",
				currentPaymentAmount: paymentAmountForFlow,
				totalRemainingAmount: currentRemainingAmount,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
				orderId,
				cartData: {
					items: cart,
					orderId,
					subtotal,
					taxAmount,
					total: orderTotalFromCart,
					orderDiscount,
					discountAmount,
				},
			};

			const splitOrderDataForDisplay = state.splitMode
				? {
						total: paymentAmountForFlow,
						isSplitPayment: true,
						originalTotal: orderTotalFromCart,
						subtotal:
							paymentAmountForFlow /
							(1 + calculateCartTotals([], null).TAX_RATE),
						tax:
							(paymentAmountForFlow /
								(1 + calculateCartTotals([], null).TAX_RATE)) *
							calculateCartTotals([], null).TAX_RATE,
						discountAmount: 0,
						orderDiscount: null,
				  }
				: null;

			startFlow(
				orderId,
				"credit",
				paymentAmountForFlow,
				state.splitMode,
				state.splitDetails,
				splitOrderDataForDisplay
			);
			goToStep("tip", initialFlowData);
			setFlowStarted(true);
		} catch (err) {
			console.error("CREDIT VIEW: Error starting credit card flow:", err);
			setError(err.message || "Failed to start payment process.");
			setFlowStarted(false);
		} finally {
			if (isMountedRef.current) setViewProcessingState(false);
		}
	}, [
		state.orderId,
		state.splitMode,
		state.splitDetails,
		state.nextSplitAmount,
		state.amountPaid,
		totalAmount,
		currentRemainingAmount, // Use currentRemainingAmount here
		flowStarted,
		viewProcessingState,
		startFlow,
		goToStep,
	]);

	// --- Effect to handle step completion from Customer Display ---
	useEffect(() => {
		// ** FIX: Declare flag outside the condition **
		let isProcessingThisReceiptEvent = false;

		const receiptCompleted = stepData.receipt?.status === "complete";
		const paymentSuccess = stepData.payment?.status === "success";

		if (
			customerFlowStep === "receipt" &&
			receiptCompleted &&
			paymentSuccess &&
			!paymentProcessedRef.current
		) {
			paymentProcessedRef.current = true;
			isProcessingThisReceiptEvent = true; // Set flag for this run

			console.log(
				"CREDIT VIEW (Unified Effect): Receipt step completed & Payment success confirmed. Processing result.",
				stepData
			);

			const paymentInfo = stepData.payment;

			// ** FIX: Use consistently named numeric variables **
			const nestedPaymentObject = {
				status: "success",
				transactionId: paymentInfo.transactionId,
				amount: amountChargedThisTxnNum, // Use numeric version
				timestamp: paymentInfo.timestamp || new Date().toISOString(),
				cardInfo: paymentInfo.cardInfo || { brand: "Card", last4: "****" },
				reader: paymentInfo.reader || null,
				splitPayment: state.splitMode,
				splitAmount: state.splitMode ? currentPaymentAmountNum : null, // Use numeric version
				originalTotal: currentPaymentAmountNum, // Use numeric version
				orderId: state.orderId,
				tipAmount: tipForThisPaymentNum, // Use numeric version
			};
			console.log(
				"CREDIT VIEW (Unified Effect): Constructed nestedPaymentObject:",
				nestedPaymentObject
			);

			const transactionDetails = {
				method: "credit",
				cardInfo: paymentInfo.cardInfo,
				transactionId: paymentInfo.transactionId,
				flowData: { ...stepData, payment: nestedPaymentObject },
			};

			console.log(
				"CREDIT VIEW (Unified Effect): Calling handlePayment with amount:",
				amountChargedThisTxnNum
			); // Use numeric version

			handlePayment(amountChargedThisTxnNum, transactionDetails) // Use numeric version
				.then(async (paymentResult) => {
					if (!isMountedRef.current || !isProcessingThisReceiptEvent) return;

					if (paymentResult.success) {
						const newAmountPaid = paymentResult.newAmountPaid;
						console.log(
							`CREDIT VIEW (Unified Effect): Transaction recorded locally. New amount paid: ${newAmountPaid}. Checking completion...`
						);

						// *** CORRECTED COMPLETION CHECK LOGIC ***
						const checkTotalAmount = totalAmount;
						const isTotalPaymentCompleteAfterTxn =
							newAmountPaid >= checkTotalAmount - epsilon;

						console.log(`CREDIT VIEW --- COMPARE START ---`);
						console.log(
							`COMPARE: totalAmount Prop (Overall Order Base) = ${checkTotalAmount} (Type: ${typeof checkTotalAmount})`
						);
						console.log(
							`COMPARE: newAmountPaid (Total Paid So Far) = ${newAmountPaid} (Type: ${typeof newAmountPaid})`
						);
						console.log(
							`COMPARE: Is newAmountPaid >= checkTotalAmount (-epsilon)? ${isTotalPaymentCompleteAfterTxn}`
						);
						console.log(`CREDIT VIEW --- COMPARE END ---`);
						// *** END CORRECTION ***

						console.log(
							"CREDIT VIEW (Unified Effect - Check): Is total order payment complete?",
							isTotalPaymentCompleteAfterTxn
						);

						// --- Logic based on corrected completion check ---
						if (state.splitMode && !isTotalPaymentCompleteAfterTxn) {
							// Handle Split Continuation
							console.log(
								"CREDIT VIEW (Unified Effect): Split part complete. Resetting for next split."
							);
							completeCustomerDisplayFlow();
							setFlowStarted(false);
							resetFlowForSplitContinuation({
								amountPaid: newAmountPaid,
								remainingAmount: checkTotalAmount - newAmountPaid,
								currentPaymentAmount: amountChargedThisTxnNum, // Pass amount just paid
							});
							setTimeout(() => {
								if (isMountedRef.current) handleNavigation("Split", -1);
							}, 50);
						} else if (isTotalPaymentCompleteAfterTxn) {
							// Handle Final Completion
							console.log(
								"CREDIT VIEW (Unified Effect): Final payment complete. Finalizing."
							);
							try {
								// Print Receipt
								try {
									const cartForReceipt = useCartStore.getState().cart;
									const discountForReceipt =
										useCartStore.getState().orderDiscount;
									const { subtotal, taxAmount } = calculateCartTotals(
										cartForReceipt,
										discountForReceipt
									);
									const finalTotalPaid = newAmountPaid;
									// Recalculate total tip from all transactions in the *current* flow state
									const finalTipTotal =
										state.transactions.reduce((sum, tx) => {
											const tipInTx =
												tx.flowData?.tip?.tipAmount ??
												tx.tipAmount ??
												tx.flowData?.payment?.tipAmount ??
												0;
											return sum + (Number(tipInTx) || 0);
										}, 0) + tipForThisPaymentNum; // Add tip from current step

									const receiptData = {
										id: state.orderId || Math.floor(Date.now() / 1000),
										timestamp: new Date().toISOString(),
										items: cartForReceipt.map((item) => ({
											product_name: item.name,
											quantity: item.quantity,
											unit_price: item.price,
										})),
										total_price: finalTotalPaid,
										subtotal: subtotal,
										tax: taxAmount,
										tip: finalTipTotal,
										payment: {
											method: state.splitMode ? "Split" : "Credit",
											card_type: paymentInfo.cardInfo?.brand || "Card",
											last_four: paymentInfo.cardInfo?.last4 || "****",
										},
										open_drawer: false,
										is_split_payment: state.splitMode,
										store_name: "Ajeen Restaurant",
										store_address: "123 Main Street",
										store_phone: "(123) 456-7890",
										receipt_footer: "Thank you for your purchase!",
									};
									await printReceipt(receiptData);
									console.log("CREDIT VIEW (Unified Effect): Receipt printed.");
								} catch (printError) {
									console.error(
										"CREDIT VIEW (Unified Effect): Receipt printing failed:",
										printError
									);
								}

								const backendSuccess = await completePaymentFlow();

								if (!isMountedRef.current) return;

								if (backendSuccess) {
									console.log(
										"CREDIT VIEW (Unified Effect): Backend completion successful."
									);
									// Navigation is handled by completePaymentFlow
								} else {
									console.error(
										"CREDIT VIEW (Unified Effect): Backend completion failed."
									);
									setError("Failed to finalize order with the backend.");
									paymentProcessedRef.current = false; // Allow retry? maybe not after successful payment.
								}
							} catch (completionError) {
								console.error(
									"CREDIT VIEW (Unified Effect): Error during final completion:",
									completionError
								);
								setError(
									completionError.message || "Error finalizing payment."
								);
								paymentProcessedRef.current = false;
							} finally {
								if (isMountedRef.current) {
									setFlowStarted(false);
								}
							}
						}
						// Removed the final 'else' block that logged the "unexpected completion check failure"
					} else {
						throw new Error(
							paymentResult.error || "handlePayment reported failure."
						);
					}
				})
				.catch((err) => {
					if (!isMountedRef.current) return;
					console.error(
						"CREDIT VIEW (Unified Effect): Error processing/finalizing:",
						err
					);
					setError(
						err.message || "An error occurred recording/finalizing the payment."
					);
					completeCustomerDisplayFlow();
					setFlowStarted(false);
					paymentProcessedRef.current = false;
				});
		}
		// Handling payment failure from terminal
		else if (
			customerFlowStep === "receipt" &&
			stepData.payment?.status &&
			stepData.payment.status !== "success" &&
			!paymentProcessedRef.current
		) {
			paymentProcessedRef.current = true;
			console.error(
				"CREDIT VIEW (Unified Effect): Payment failed on terminal step.",
				stepData.payment
			);
			setError("Payment failed on the terminal.");
			completeCustomerDisplayFlow();
			setFlowStarted(false);
		}

		// ** FIX: Correctly define cleanup function for the effect **
		return () => {
			// This cleanup runs when dependencies change OR component unmounts
			// Resetting the local flag ensures the effect can run again if needed
			// after dependency changes, but not for the *same* event trigger.
			isProcessingThisReceiptEvent = false;
		};
	}, [
		// --- Trigger Dependencies ---
		customerFlowStep,
		stepData, // Specifically stepData.receipt.status and stepData.payment.status

		// --- State/Props used in Calculations/Logic ---
		state.splitMode,
		state.orderId,
		state.splitDetails,
		state.nextSplitAmount,
		state.amountPaid,
		state.transactions, // Added transactions
		currentRemainingAmount,
		totalAmount, // Derived props
		tipForThisPaymentNum,
		amountChargedThisTxnNum,
		currentPaymentAmountNum, // Calculated numeric values

		// --- Stable Functions & Hooks ---
		handlePayment,
		completePaymentFlow,
		handleNavigation,
		printReceipt,
		completeCustomerDisplayFlow,
		resetFlowForSplitContinuation,

		// --- Constants ---
		epsilon,
	]);

	// --- Cancel Payment ---
	const cancelCardPayment = async () => {
		// ... (cancelCardPayment logic remains the same) ...
		if (viewProcessingState) return;
		setViewProcessingState(true);
		setError(null);
		console.log("CREDIT VIEW: Attempting to cancel credit payment flow.");

		try {
			const paymentIntentToCancel =
				stepData?.payment?.transactionId ||
				state?.transactions?.find((t) => t.method === "credit")
					?.transactionId ||
				null;
			if (paymentIntentToCancel) {
				console.log(
					`CREDIT VIEW: Attempting to cancel terminal action for PI: ${paymentIntentToCancel}...`
				);
				const cancelResult = await cancelTerminalAction();
				if (cancelResult.success)
					console.log("CREDIT VIEW: Terminal action cancelled.");
				else
					console.warn(
						"CREDIT VIEW: Could not cancel terminal action.",
						cancelResult.error
					);
			} else {
				console.log(
					"CREDIT VIEW: No active payment intent found to cancel on terminal."
				);
			}

			if (flowActive) {
				console.log("CREDIT VIEW: Resetting customer display flow.");
				completeCustomerDisplayFlow();
			}
			handleNavigation(state.splitMode ? "Split" : "InitialOptions", -1);
		} catch (err) {
			console.error("CREDIT VIEW: Error during cancellation:", err);
			setError("Failed to cancel payment cleanly.");
		} finally {
			if (isMountedRef.current) {
				setViewProcessingState(false);
				setFlowStarted(false);
				paymentProcessedRef.current = false;
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
