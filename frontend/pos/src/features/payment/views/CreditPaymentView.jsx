// Enhanced CreditPaymentView.jsx
import { motion } from "framer-motion";
import { CreditCardIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useState, useEffect, useRef, useCallback } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { useCustomerFlow } from "../../../features/customerDisplay/hooks/useCustomerFlow";
import { CUSTOMER_FLOW_STEPS } from "../constants/paymentFlowSteps";
import { formatPrice } from "../../../utils/numberUtils";
import TerminalStatusIndicator from "../components/TerminalStatusIndicator";
import { useCartStore } from "../../../store/cartStore";
import customerDisplayManager from "../../customerDisplay/utils/windowManager";

const { pageVariants, pageTransition } = paymentAnimations;

const commonPropTypes = {
	state: PropTypes.shape({
		orderId: PropTypes.number,
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		transactions: PropTypes.arrayOf(
			PropTypes.shape({
				method: PropTypes.oneOf(["cash", "credit"]).isRequired,
				amount: PropTypes.number.isRequired,
				cashTendered: PropTypes.number,
				change: PropTypes.number,
				splitPayment: PropTypes.bool,
			})
		).isRequired,
		customAmount: PropTypes.string.isRequired,
		// Add split payment related props
		splitDetails: PropTypes.shape({
			mode: PropTypes.oneOf(["equal", "custom", "remaining"]),
			numberOfSplits: PropTypes.number,
			customAmount: PropTypes.number,
			currentSplitIndex: PropTypes.number,
			completedSplits: PropTypes.array,
		}),
		nextSplitAmount: PropTypes.number,
		currentSplitMethod: PropTypes.string,
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired,
	handlePayment: PropTypes.func.isRequired,
	isPaymentComplete: PropTypes.func.isRequired,
	completePaymentFlow: PropTypes.func.isRequired,
	handleNavigation: PropTypes.func.isRequired,
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
	remainingAmount,
	handlePayment,
	completePaymentFlow,
	handleNavigation,
}) => {
	// State management
	const [error, setError] = useState(null);
	const [processingPayment, setProcessingPayment] = useState(false);
	const [cardData, setCardData] = useState(null);
	const [isCancelling, setIsCancelling] = useState(false);
	const [splitOrderData, setSplitOrderData] = useState(null);

	// References for tracking component state
	const isCompletingPaymentRef = useRef(false);
	const hasNavigatedRef = useRef(false);

	// Use the customer flow hook
	const {
		flowActive,
		currentStep,
		startFlow,
		goToStep,
		completeFlow,
		stepData,
		updateFlowData,
		resetFlowForSplitContinuation, // Add this
	} = useCustomerFlow();

	// Calculate current payment amount based on split mode
	const currentPaymentAmount =
		state.splitMode && state.nextSplitAmount
			? state.nextSplitAmount
			: remainingAmount;

	// Debug logging on mount
	useEffect(() => {
		console.log("CreditPaymentView mounted with state:", {
			splitMode: state.splitMode,
			remainingAmount,
			currentPaymentAmount,
			amountPaid: state.amountPaid,
			splitDetails: state.splitDetails,
			flowActive,
		});

		return () => {
			console.log("CreditPaymentView unmounting");
		};
	}, []);

	// Debug button visibility
	useEffect(() => {
		console.log("Button visibility check:", {
			flowActive,
			shouldShowButton: !flowActive,
			processingPayment,
			remainingAmount,
			isButtonDisabled: processingPayment || remainingAmount === 0,
		});
	}, [flowActive, processingPayment, remainingAmount]);

	// Prepare split order data but don't start flow automatically
	useEffect(() => {
		if (state.splitMode && !flowActive) {
			console.log("Preparing data for split payment");

			// Create a modified order data object for split payments
			const splitData = {
				subtotal: currentPaymentAmount * 0.9,
				tax: currentPaymentAmount * 0.1,
				total: currentPaymentAmount,
				isSplitPayment: true,
				originalTotal: remainingAmount + state.amountPaid,
			};

			// Store this data for later use when the user clicks the button
			setSplitOrderData(splitData);
		}
	}, [
		state.splitMode,
		flowActive,
		currentPaymentAmount,
		remainingAmount,
		state.amountPaid,
	]);

	// Effect to update flow data when split details change
	useEffect(() => {
		if (flowActive && state.splitMode && currentStep) {
			// Update flow data with latest split information
			updateFlowData({
				isSplitPayment: true,
				splitDetails: state.splitDetails,
				currentPaymentAmount: currentPaymentAmount,
				remainingAmount: remainingAmount,
			});

			console.log("Updated flow data with latest split information", {
				currentStep,
				splitDetails: state.splitDetails,
				currentPaymentAmount,
				remainingAmount,
			});
		}
	}, [
		flowActive,
		state.splitMode,
		state.splitDetails,
		currentStep,
		currentPaymentAmount,
		remainingAmount,
		updateFlowData,
	]);

	const handleSplitContinuation = useCallback(() => {
		if (state.splitMode) {
			console.log("SPLIT CHAIN: Returning to split view from credit payment");

			// CRITICAL FIX: Calculate the remaining amount after THIS payment
			const updatedAmountPaid = state.amountPaid + currentPaymentAmount;
			const calculatedRemainingAmount = Math.max(
				0,
				remainingAmount - currentPaymentAmount
			);

			console.log("SPLIT CHAIN: Split continuation calculation:", {
				currentPaymentAmount,
				previousAmountPaid: state.amountPaid,
				updatedAmountPaid,
				remainingBeforePayment: remainingAmount,
				calculatedRemainingAmount,
			});

			// Check if there's remaining amount to pay (with small epsilon for floating point errors)
			const epsilon = 0.01;
			if (calculatedRemainingAmount < epsilon) {
				console.log(
					"SPLIT CHAIN: No remaining amount, proceeding to completion instead"
				);
				completePaymentFlow().then(() => {
					handleNavigation("Completion");
				});
				return;
			}

			// IMPORTANT: Reset flow state before navigating to ensure a fresh start
			completeFlow();

			// CRITICAL FIX: Call resetFlowForSplitContinuation with the proper payment information
			resetFlowForSplitContinuation({
				amountPaid: updatedAmountPaid,
				remainingAmount: calculatedRemainingAmount,
				currentPaymentAmount: currentPaymentAmount,
			});

			// Reset any local payment processing state
			setProcessingPayment(false);
			setCardData(null);
			hasNavigatedRef.current = false;
			isCompletingPaymentRef.current = false;

			// Add a small delay before navigation to ensure flow is properly cleaned up
			setTimeout(() => {
				console.log(
					"SPLIT CHAIN: Navigating back to split view for next payment selection"
				);
				handleNavigation("Split", -1);
			}, 1000); // Longer delay to ensure complete cleanup
		}
	}, [
		state.splitMode,
		state.amountPaid,
		currentPaymentAmount,
		remainingAmount,
		handleNavigation,
		completeFlow,
		completePaymentFlow,
		resetFlowForSplitContinuation,
	]);

	useEffect(() => {
		// Only proceed if we have receipt completion and haven't already started processing
		if (
			stepData.receipt &&
			stepData.receipt.status === "complete" &&
			!isCompletingPaymentRef.current &&
			!hasNavigatedRef.current
		) {
			// Set flag to prevent concurrent/repeated executions
			isCompletingPaymentRef.current = true;

			console.log(
				"PAYMENT CHAIN: Starting payment completion (receipt complete)"
			);
			console.log("PAYMENT CHAIN: Receipt completion data:", stepData.receipt);

			// Process the actual payment using the collected flow data
			handlePayment(currentPaymentAmount, {
				method: "credit",
				flowData: stepData,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
				orderId: state.orderId, // Ensure orderId is included
			})
				.then((success) => {
					if (success && !hasNavigatedRef.current) {
						console.log("PAYMENT CHAIN: Payment processing successful");

						// CRITICAL FIX: More precise check for split payment completion
						const epsilon = 0.01;

						// Calculate the remaining amount after THIS payment
						// Don't rely on the state.amountPaid value which might be updated incorrectly
						const updatedAmountPaid = state.amountPaid + currentPaymentAmount;
						const calculatedRemainingAmount = Math.max(
							0,
							remainingAmount - currentPaymentAmount
						);

						// Check if this was the final payment in the split
						const isAllPaymentsComplete = calculatedRemainingAmount < epsilon;

						console.log("PAYMENT CHAIN: Payment completion status", {
							isAllPaymentsComplete,
							originalRemainingAmount: remainingAmount,
							currentPaymentAmount,
							calculatedRemainingAmount,
							updatedAmountPaid,
							orderId: state.orderId,
						});

						if (state.splitMode && !isAllPaymentsComplete) {
							// Force completion of current flow to start fresh
							completeFlow();

							// Wait a moment before navigating to ensure UI updates properly
							setTimeout(() => {
								// Set a flag to prevent any automatic processing
								hasNavigatedRef.current = true;

								// CRITICAL FIX: Call the split continuation handler
								handleSplitContinuation();
							}, 1000);

							return false; // Don't complete the payment flow yet
						} else {
							// For fully paid transactions (split or not), proceed to completion
							console.log(
								"PAYMENT CHAIN: All payments complete, calling completePaymentFlow"
							);

							// Return a promise chain to ensure proper async handling
							return completePaymentFlow();
						}
					} else {
						throw new Error("Payment processing failed or already completed");
					}
				})
				.then((shouldNavigate) => {
					if (shouldNavigate && !hasNavigatedRef.current) {
						console.log(
							"PAYMENT CHAIN: Flow completed, navigating to completion view"
						);
						hasNavigatedRef.current = true;
						handleNavigation("Completion");
					}
				})
				.catch((err) => {
					console.error("PAYMENT CHAIN: Payment completion error:", err);
					setError(err.message || "Failed to process payment");
				})
				.finally(() => {
					isCompletingPaymentRef.current = false;
				});
		}
	}, [
		stepData,
		currentStep,
		goToStep,
		handlePayment,
		currentPaymentAmount,
		remainingAmount,
		completePaymentFlow,
		handleNavigation,
		state.splitMode,
		state.splitDetails,
		state.orderId,
		state.amountPaid,
		updateFlowData,
		handleSplitContinuation,
		completeFlow,
	]);

	// Function to cancel payment process
	const cancelCardPayment = async () => {
		setIsCancelling(true);
		setError(null);

		try {
			console.log("Cancelling card payment process");

			// Get the current cart data
			const cart = useCartStore.getState().cart;

			// If we're in an active flow, complete/reset it
			if (flowActive) {
				completeFlow();
				console.log("Customer flow reset");

				// Reset customer display to cart view
				try {
					if (cart && cart.length > 0) {
						// Reset to cart view
						customerDisplayManager.showCart(cart);
						console.log("Customer display reset to cart view");
					} else {
						// If cart is empty, show welcome screen
						customerDisplayManager.showWelcome();
						console.log("Customer display reset to welcome (empty cart)");
					}
				} catch (displayErr) {
					console.error("Error resetting customer display:", displayErr);
				}
			}

			// Reset local component state
			setProcessingPayment(false);
			setCardData(null);

			// If in split mode, go back to split view
			if (state.splitMode) {
				handleNavigation("Split", -1);
			} else {
				// Show cancellation message
				setError("Payment process cancelled");
			}
		} catch (err) {
			console.error("Error cancelling payment:", err);
			setError("Failed to cancel payment: " + err.message);
		} finally {
			setIsCancelling(false);
		}
	};

	// Enhanced processCardPayment to handle split payments
	const processCardPayment = async () => {
		setProcessingPayment(true);
		setError(null);

		try {
			// Use the stored split order data or create a new one
			const orderData = state.splitMode
				? splitOrderData || {
						subtotal: currentPaymentAmount * 0.9,
						tax: currentPaymentAmount * 0.1,
						total: currentPaymentAmount,
						isSplitPayment: true,
						originalTotal: remainingAmount + state.amountPaid,
						orderId: state.orderId, // EXPLICITLY ADD ORDER ID HERE
				  }
				: null;

			console.log("Starting credit card payment process with data:", {
				orderId: state.orderId,
				paymentMethod: "credit",
				amount: currentPaymentAmount,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
				splitOrderData: orderData,
			});

			// If we're in split mode, ensure we're using the correct amount
			const paymentAmount = state.splitMode
				? currentPaymentAmount
				: remainingAmount;

			// Start the customer flow - EXPLICITLY PASS ORDER ID AS FIRST PARAMETER
			startFlow(
				state.orderId, // Make sure this is not undefined
				"credit",
				paymentAmount,
				state.splitMode,
				state.splitDetails,
				orderData
			);

			// Skip directly to rewards step with complete split payment data
			goToStep("rewards", {
				orderId: state.orderId, // EXPLICITLY ADD ORDER ID HERE
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
				splitOrderData: orderData,
				currentPaymentAmount: paymentAmount,
				totalRemainingAmount: remainingAmount,
			});

			// Store minimal card info for display purposes only
			const cardDisplayInfo = {
				cardType: "Credit Card",
				lastFour: "****",
				transactionStatus: "Pending",
				amount: paymentAmount,
				orderId: state.orderId, // EXPLICITLY ADD ORDER ID HERE
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails ? { ...state.splitDetails } : null,
			};

			setCardData(cardDisplayInfo);
			setProcessingPayment(false);
		} catch (err) {
			console.error("Error starting credit card payment:", err);
			setError(err.message || "Failed to prepare payment");
			setProcessingPayment(false);
			if (flowActive) {
				completeFlow(); // End the flow on error
			}
		}
	};

	// Get the current step label for display
	const getCurrentStepLabel = () => {
		if (!flowActive) return "Ready to process payment";

		const step = CUSTOMER_FLOW_STEPS.find((s) => s.id === currentStep);
		switch (currentStep) {
			case "cart":
				return "Customer reviewing cart...";
			case "payment":
				return "Processing payment...";
			case "rewards":
				return "Customer registering for rewards...";
			case "receipt":
				return "Generating receipt...";
			default:
				return step ? `Step: ${step.label}` : "Processing...";
		}
	};

	// Cleanup on unmount - also reset the display
	useEffect(() => {
		return () => {
			// Clean up any active flow if component unmounts
			if (flowActive && !isCancelling) {
				console.log("CreditPaymentView unmounting, cleaning up active flow");

				// Get the current cart
				const cart = useCartStore.getState().cart;

				// Complete the flow
				completeFlow();

				// Reset display to cart if we have items
				try {
					if (cart && cart.length > 0) {
						customerDisplayManager.showCart(cart);
					} else {
						customerDisplayManager.showWelcome();
					}
				} catch (err) {
					console.error("Error resetting display on unmount:", err);
				}
				isCompletingPaymentRef.current = false;
				hasNavigatedRef.current = false;
			}
		};
	}, [flowActive, completeFlow, isCancelling]);

	return (
		<motion.div
			key="credit-payment"
			className="absolute inset-0 p-4 space-y-4"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper>
				<TerminalStatusIndicator />
				{/* Add split payment indicator if in split mode */}
				{state.splitMode && (
					<motion.div
						className="p-4 bg-amber-50 text-amber-700 rounded-lg mb-4 flex items-center justify-between"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<div>
							<div className="font-medium">Split Payment</div>
							<div className="text-sm">
								{state.splitDetails?.mode === "equal"
									? `Payment ${
											(state.splitDetails?.currentSplitIndex || 0) + 1
									  } of ${state.splitDetails?.numberOfSplits}`
									: state.splitDetails?.mode === "remaining"
									? "Remaining Amount"
									: "Custom split amount"}
							</div>
						</div>
						<button
							onClick={() => handleNavigation("Split", -1)}
							className="px-2 py-1 bg-white text-amber-700 border border-amber-200 rounded-lg text-sm hover:bg-amber-50"
						>
							Change
						</button>
					</motion.div>
				)}
				{error && (
					<motion.div
						className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 mr-2"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
								clipRule="evenodd"
							/>
						</svg>
						{error}
					</motion.div>
				)}

				<motion.div
					className="p-4 bg-blue-50 text-blue-700 rounded-lg mb-4"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<div className="font-medium mb-1">Amount to Pay</div>
					<div className="text-2xl font-bold">
						${currentPaymentAmount.toFixed(2)}
					</div>
					{state.splitMode && remainingAmount !== currentPaymentAmount && (
						<div className="text-sm mt-1">
							Total remaining: ${remainingAmount.toFixed(2)}
						</div>
					)}
				</motion.div>

				{cardData && (
					<motion.div
						className="p-4 bg-emerald-50 text-emerald-700 rounded-lg space-y-2"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<div className="flex items-center">
							<CreditCardIcon className="h-5 w-5 mr-2" />
							<span className="font-medium">
								{cardData.cardType} ending in {cardData.lastFour}
							</span>
						</div>
						{cardData.transactionId && (
							<div className="text-xs text-emerald-600">
								Transaction ID: {cardData.transactionId}
							</div>
						)}
						{cardData.tipAmount > 0 && (
							<div className="text-xs text-emerald-600">
								Tip: ${formatPrice(cardData.tipAmount)}
							</div>
						)}
						{cardData.totalWithTip && (
							<div className="text-xs text-emerald-600">
								Total with tip: ${formatPrice(cardData.totalWithTip)}
							</div>
						)}
						<div className="text-xs text-emerald-600">
							Status: {cardData.transactionStatus}
						</div>
						{state.splitMode && (
							<div className="text-xs text-emerald-600">
								Split payment: {state.splitDetails?.mode || "custom"} mode
							</div>
						)}
					</motion.div>
				)}

				{/* Customer flow status with cancel button */}
				{flowActive && (
					<motion.div
						className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm mb-4"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<div className="mb-2">
							<div className="flex justify-between items-center">
								<div className="text-sm font-medium text-slate-600">
									Customer Progress
								</div>

								{/* Add cancel button */}
								{!isCancelling && (
									<button
										onClick={cancelCardPayment}
										className="text-red-600 hover:text-red-800 text-sm flex items-center"
										disabled={isCancelling}
									>
										<XCircleIcon className="h-4 w-4 mr-1" />
										Cancel
									</button>
								)}
							</div>

							<div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
								<motion.div
									className="h-full bg-blue-500"
									initial={{ width: 0 }}
									animate={{
										width: `${
											((CUSTOMER_FLOW_STEPS.findIndex(
												(s) => s.id === currentStep
											) +
												1) /
												CUSTOMER_FLOW_STEPS.length) *
											100
										}%`,
									}}
									transition={{ duration: 0.5 }}
								/>
							</div>
						</div>

						<div className="flex items-center">
							<div
								className={`w-3 h-3 rounded-full mr-2 ${
									processingPayment || isCancelling
										? "bg-blue-500 animate-pulse"
										: "bg-emerald-500"
								}`}
							></div>
							<span className="text-sm text-slate-700">
								{isCancelling ? "Cancelling payment..." : getCurrentStepLabel()}
							</span>
						</div>
					</motion.div>
				)}

				<div className="space-y-4 mt-4">
					{/* Always show the button when not in an active flow */}
					{!flowActive ? (
						<PaymentButton
							icon={CreditCardIcon}
							label={
								processingPayment ? "Processing..." : "Process Card Payment"
							}
							variant="primary"
							onClick={processCardPayment}
							disabled={processingPayment || remainingAmount === 0}
						/>
					) : null}
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CreditPaymentView.propTypes = commonPropTypes;

export default CreditPaymentView;
