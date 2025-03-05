// src/features/payment/views/CreditPaymentView.jsx
import { motion } from "framer-motion";
import { CreditCardIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import SimulatedCardPayment from "../components/SimulatedCardPayment";

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
	const [showCardTerminal, setShowCardTerminal] = useState(false);
	const [error, setError] = useState(null);
	const [processingPayment, setProcessingPayment] = useState(false);
	const [cardData, setCardData] = useState(null);

	const startCardPayment = () => {
		setShowCardTerminal(true);
		setError(null);
	};

	const handlePaymentComplete = async (paymentResult) => {
		setProcessingPayment(true);
		setCardData(paymentResult.cardData);

		try {
			console.log("Payment result received:", paymentResult);

			// IMPORTANT: Only pass the base amount without the tip
			// The remaining amount is what we're actually charging to the card
			const paymentAmount = remainingAmount;

			// Pass the tip as a separate field that won't be added to the amount
			const success = await handlePayment(paymentAmount, {
				method: "credit",
				cardData: paymentResult.cardData,
				tipAmount: paymentResult.tipAmount,
				// Don't include totalAmount as it might cause confusion
			});

			if (success) {
				// Keep terminal visible briefly to show success message
				setTimeout(() => {
					setShowCardTerminal(false);
					setProcessingPayment(false);

					if (isPaymentComplete()) {
						completePaymentFlow().then(() => {
							handleNavigation("Completion");
						});
					}
				}, 2000);
			} else {
				throw new Error("Payment processing failed");
			}
		} catch (err) {
			setError(err.message || "Failed to process card payment");
			setProcessingPayment(false);
			setShowCardTerminal(false);
		}
	};

	const handleCancelPayment = () => {
		setShowCardTerminal(false);
		setProcessingPayment(false);
	};

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
						<div className="text-xs text-emerald-600">
							Transaction ID: {cardData.transactionId}
						</div>
						{cardData.tipAmount > 0 && (
							<div className="text-xs text-emerald-600">
								Tip: ${cardData.tipAmount.toFixed(2)}
							</div>
						)}
					</motion.div>
				)}

				<div className="space-y-4 mt-4">
					<PaymentButton
						icon={CreditCardIcon}
						label={processingPayment ? "Processing..." : "Process Card Payment"}
						variant="primary"
						onClick={startCardPayment}
						disabled={processingPayment || remainingAmount === 0}
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
								{processingPayment
									? "Payment in progress..."
									: cardData
									? "Payment approved"
									: "Click 'Process Card Payment' to start"}
							</p>
						</div>
						<p className="text-xs text-slate-500 ml-7">
							{cardData
								? "Transaction has been completed successfully"
								: "Follow the prompts on the card terminal"}
						</p>
					</div>
				</div>
			</ScrollableViewWrapper>

			{/* Card Payment Terminal Modal */}
			{showCardTerminal && (
				<SimulatedCardPayment
					amount={remainingAmount}
					onPaymentComplete={handlePaymentComplete}
					onCancel={handleCancelPayment}
				/>
			)}
		</motion.div>
	);
};

CreditPaymentView.propTypes = commonPropTypes;

export default CreditPaymentView;
