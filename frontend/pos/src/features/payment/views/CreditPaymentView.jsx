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
						className="p-3 bg-red-50 text-red-600 rounded-lg"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						{displayError}
					</motion.div>
				)}

				<motion.div
					className="p-3 bg-blue-50 text-blue-700 rounded-lg"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					Amount to Pay: ${remainingAmount.toFixed(2)}
				</motion.div>

				{cardData && (
					<motion.div
						className="p-3 bg-green-50 text-green-700 rounded-lg space-y-1"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<div className="font-medium">
							{cardData.cardType} ending in {cardData.lastFour}
						</div>
						<div className="text-xs text-green-600">
							Transaction ID: {cardData.transactionId}
						</div>
					</motion.div>
				)}

				<div className="space-y-4">
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
							variant="default" // Using existing default variant
							onClick={cancelPayment}
							disabled={status !== "waiting_for_card"}
							className="w-full text-gray-700 border border-gray-300"
						/>
					)}

					<div className="p-3 bg-gray-50 rounded-lg space-y-2">
						<p className="text-sm text-gray-600">{getStatusMessage()}</p>
						<p className="text-xs text-gray-500">{getStatusSubMessage()}</p>
					</div>
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CreditPaymentView.propTypes = commonPropTypes;

export default CreditPaymentView;
