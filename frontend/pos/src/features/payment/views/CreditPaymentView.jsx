import { motion } from "framer-motion";
import { CreditCardIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { useCardPayment } from "../../../hooks/useCardPayment";

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
	isPaymentComplete,
	completePaymentFlow,
	handleNavigation,
}) => {
	const {
		isProcessing,
		status,
		error: cardError,
		cardData,
		processPayment,
		cancelPayment,
	} = useCardPayment();

	const [error, setError] = useState(null);
	const displayError = cardError || error;

	const handleCardPayment = async () => {
		setError(null);

		try {
			const cardResult = await processPayment(remainingAmount);

			if (cardResult) {
				// Process the payment through the main payment handler
				const success = await handlePayment(remainingAmount, {
					method: "credit",
					cardData: cardResult,
				});

				if (success) {
					if (isPaymentComplete()) {
						await completePaymentFlow();
						handleNavigation("Completion");
					}
				} else {
					throw new Error("Payment processing failed");
				}
			}
		} catch (err) {
			setError(err.message || "Failed to process card payment");
			console.error("Card payment error:", err);
		}
	};

	const getStatusMessage = () => {
		switch (status) {
			case "waiting_for_card":
				return "Please insert or swipe card";
			case "processing":
				return "Processing payment...";
			case "cancelled":
				return "Payment cancelled";
			default:
				return "Payment will be processed via card terminal";
		}
	};

	const getStatusSubMessage = () => {
		switch (status) {
			case "waiting_for_card":
				return "Follow the instructions on the terminal";
			case "processing":
				return "Please do not remove card";
			case "cancelled":
				return "You can try the payment again";
			default:
				return "Please follow the instructions on the terminal";
		}
	};

	return (
		<motion.div
			key="credit-payment"
			className="absolute inset-0 p-4 space-y-4"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper>
				{displayError && (
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
						{displayError}
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
						<div className="text-xs text-emerald-600">
							Transaction ID: {cardData.transactionId}
						</div>
					</motion.div>
				)}

				<div className="space-y-4 mt-4">
					<PaymentButton
						icon={CreditCardIcon}
						label={isProcessing ? "Processing..." : "Pay Full Amount"}
						variant="primary"
						onClick={handleCardPayment}
						disabled={isProcessing || remainingAmount === 0}
					/>

					{isProcessing && (
						<PaymentButton
							label="Cancel Payment"
							variant="danger"
							onClick={cancelPayment}
							disabled={status !== "waiting_for_card"}
						/>
					)}

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
								{getStatusMessage()}
							</p>
						</div>
						<p className="text-xs text-slate-500 ml-7">
							{getStatusSubMessage()}
						</p>
					</div>
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CreditPaymentView.propTypes = commonPropTypes;

export default CreditPaymentView;
