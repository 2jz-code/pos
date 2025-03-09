// src/features/payment/views/CreditPaymentView.jsx

import { motion } from "framer-motion";
import { CreditCardIcon } from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { useCustomerFlow } from "../../../features/customerDisplay/hooks/useCustomerFlow";
import { CUSTOMER_FLOW_STEPS } from "../constants/paymentFlowSteps";
import { formatPrice } from "../../../utils/numberUtils";
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
	// handlePayment,
	// isPaymentComplete,
	// completePaymentFlow,
	// handleNavigation,
}) => {
	const [error, setError] = useState(null);
	const [processingPayment, setProcessingPayment] = useState(false);
	const [cardData, setCardData] = useState(null);

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
		if (stepData.rewards) {
			// After rewards step is completed, move to tip step
			goToStep("tip");
		} else if (stepData.tip) {
			// After tip step is completed, move to payment step
			goToStep("payment");

			// Store the tip information
			if (stepData.tip.tipAmount > 0) {
				setCardData((prevData) => ({
					...prevData,
					tipAmount: stepData.tip.tipAmount,
					tipPercentage: stepData.tip.tipPercentage,
					totalWithTip: stepData.tip.totalWithTip,
				}));
			}
		}
	}, [stepData, goToStep]);

	const processCardPayment = async () => {
		setProcessingPayment(true);
		setError(null);

		try {
			// Start the customer flow if not active
			if (!flowActive) {
				startFlow();
			}

			// Skip directly to rewards step (bypassing payment for now)
			// This is the key change - we're going to rewards first
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
	// const finalizePayment = async () => {
	// 	try {
	// 	  setProcessingPayment(true);

	// 	  // Process the actual payment using the collected flow data
	// 	  const success = await handlePayment(remainingAmount, {
	// 		method: "credit",
	// 		flowData: stepData, // Pass all the collected flow data
	// 	  });

	// 	  if (success) {
	// 		completePaymentFlow().then(() => {
	// 		  handleNavigation("Completion");
	// 		});
	// 	  } else {
	// 		throw new Error("Payment processing failed");
	// 	  }
	// 	} catch (err) {
	// 	  setError(err.message || "Failed to process payment");
	// 	  setProcessingPayment(false);
	// 	}
	//   };
	return (
		<motion.div
			key="credit-payment"
			className="absolute inset-0 p-4 space-y-4"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper>
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

				{/* Customer flow status */}
				{flowActive && (
					<motion.div
						className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm mb-4"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<div className="mb-2">
							<div className="text-sm font-medium text-slate-600">
								Customer Progress
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
									processingPayment
										? "bg-blue-500 animate-pulse"
										: "bg-emerald-500"
								}`}
							></div>
							<span className="text-sm text-slate-700">
								{getCurrentStepLabel()}
							</span>
						</div>
					</motion.div>
				)}

				<div className="space-y-4 mt-4">
					<PaymentButton
						icon={CreditCardIcon}
						label={
							flowActive
								? "Processing Customer Flow..."
								: processingPayment
								? "Processing..."
								: "Process Card Payment"
						}
						variant="primary"
						onClick={processCardPayment}
						disabled={flowActive || processingPayment || remainingAmount === 0}
					/>

					<div className="p-4 bg-slate-50 rounded-lg space-y-2 border border-slate-200">
						<div className="flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 mr-2 text-slate-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<p className="text-sm font-medium text-slate-700">
								{flowActive
									? getCurrentStepLabel()
									: cardData
									? "Payment approved"
									: "Click 'Process Card Payment' to start"}
							</p>
						</div>
						<p className="text-xs text-slate-500 ml-7">
							{flowActive
								? "Customer flow in progress"
								: cardData
								? "Transaction has been completed successfully"
								: "This will guide the customer through the checkout process"}
						</p>
					</div>
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CreditPaymentView.propTypes = commonPropTypes;

export default CreditPaymentView;
