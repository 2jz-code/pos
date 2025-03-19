// src/features/payment/views/CreditPaymentView.jsx

import { motion } from "framer-motion";
import { CreditCardIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useState, useEffect, useRef } from "react";
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
			})
		).isRequired,
		customAmount: PropTypes.string.isRequired,
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
	const [error, setError] = useState(null);
	const [processingPayment, setProcessingPayment] = useState(false);
	const [cardData, setCardData] = useState(null);
	const [isCancelling, setIsCancelling] = useState(false);
	const previousStepRef = useRef({ rewards: null, tip: null });
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
	} = useCustomerFlow();

	// Handle flow completion (when all steps are done)
	useEffect(() => {
		// Only proceed if the data has actually changed
		const rewardsChanged = stepData.rewards !== previousStepRef.current.rewards;
		const tipChanged = stepData.tip !== previousStepRef.current.tip;

		if (stepData.rewards && rewardsChanged && currentStep !== "tip") {
			goToStep("tip");
			previousStepRef.current.rewards = stepData.rewards;
		} else if (stepData.tip && tipChanged && currentStep !== "payment") {
			goToStep("payment");
			previousStepRef.current.tip = stepData.tip;

			if (stepData.tip.tipAmount > 0) {
				setCardData((prevData) => ({
					...prevData,
					tipAmount: stepData.tip.tipAmount,
					tipPercentage: stepData.tip.tipPercentage,
					totalWithTip: stepData.tip.totalWithTip,
				}));
			}
		} else if (
			stepData.receipt &&
			stepData.receipt.status === "complete" &&
			!isCompletingPaymentRef.current &&
			!hasNavigatedRef.current
		) {
			// Set flag to prevent concurrent/repeated executions
			isCompletingPaymentRef.current = true;

			console.log("Starting payment completion (receipt complete)");

			// Process the actual payment using the collected flow data
			handlePayment(remainingAmount, {
				method: "credit",
				flowData: stepData,
			})
				.then((success) => {
					if (success && !hasNavigatedRef.current) {
						console.log("Payment successful, completing flow");

						// Complete the payment flow
						return completePaymentFlow();
					} else {
						throw new Error("Payment processing failed or already completed");
					}
				})
				.then(() => {
					if (!hasNavigatedRef.current) {
						console.log("Flow completed, navigating to completion view");
						hasNavigatedRef.current = true;
						handleNavigation("Completion");
					}
				})
				.catch((err) => {
					console.error("Payment completion error:", err);
					setError(err.message || "Failed to process payment");
				})
				.finally(() => {
					// Reset the completion flag
					isCompletingPaymentRef.current = false;
				});
		}
	}, [
		stepData,
		currentStep,
		goToStep,
		handlePayment,
		remainingAmount,
		completePaymentFlow,
		handleNavigation,
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

			// Show cancellation message
			setError("Payment process cancelled");
		} catch (err) {
			console.error("Error cancelling payment:", err);
			setError("Failed to cancel payment: " + err.message);
		} finally {
			setIsCancelling(false);
		}
	};

	const processCardPayment = async () => {
		setProcessingPayment(true);
		setError(null);

		try {
			// Start the customer flow if not active
			if (!flowActive) {
				startFlow();
			}

			// Skip directly to rewards step (bypassing payment for now)
			goToStep("rewards");

			// Store minimal card info for display purposes only
			const cardDisplayInfo = {
				cardType: "Credit Card",
				lastFour: "****",
				transactionStatus: "Pending",
			};

			setCardData(cardDisplayInfo);
			setProcessingPayment(false);
		} catch (err) {
			setError(err.message || "Failed to prepare payment");
			setProcessingPayment(false);
			completeFlow(); // End the flow on error
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
						${remainingAmount.toFixed(2)}
					</div>
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
