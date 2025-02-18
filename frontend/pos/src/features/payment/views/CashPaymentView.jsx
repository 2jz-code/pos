// src/components/payment/views/CashPaymentView.jsx
import { motion } from "framer-motion";
import { useState } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";

const { pageVariants, pageTransition } = paymentAnimations;

const commonMotionProps = {
	variants: pageVariants,
	initial: "enter",
	animate: "center",
	exit: "exit",
	transition: pageTransition,
};

export const CashPaymentView = ({
	state,
	remainingAmount,
	handlePayment, // This will be the processPayment function from PaymentFlow
	setState,
}) => {
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState(null);

	const getLatestTransaction = () => {
		if (state.transactions.length === 0) return null;
		return state.transactions[state.transactions.length - 1];
	};

	const shouldShowChangeCalculation = () => {
		const latestTransaction = getLatestTransaction();
		return (
			latestTransaction &&
			latestTransaction.method === "cash" &&
			typeof latestTransaction.cashTendered === "number"
		);
	};

	const handlePresetAmount = async (amount) => {
		setIsProcessing(true);
		setError(null);
		try {
			// Calculate valid payment amount
			const validAmount = Math.min(amount, remainingAmount);
			const change = amount - validAmount;

			// Process the payment with cash-specific details
			const success = await handlePayment(validAmount, {
				method: "cash",
				cashTendered: amount,
				change: change,
			});

			if (!success) {
				throw new Error("Payment processing failed");
			}
		} catch (err) {
			console.error("Cash payment error:", err);
			setError(err.message || "Failed to process payment");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleCustomAmount = async () => {
		const amount = parseFloat(state.customAmount);
		if (!amount || amount <= 0) {
			setError("Please enter a valid amount");
			return;
		}

		setIsProcessing(true);
		setError(null);
		try {
			// Calculate valid payment amount
			const validAmount = Math.min(amount, remainingAmount);
			const change = amount - validAmount;

			// Process the payment
			const success = await handlePayment(validAmount, {
				method: "cash",
				cashTendered: amount,
				change: change,
			});

			if (success) {
				setState((prev) => ({ ...prev, customAmount: "" }));
			} else {
				throw new Error("Payment processing failed");
			}
		} catch (err) {
			setError(err.message || "Failed to process payment");
			console.error("Cash payment error:", err);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<motion.div
			key="cash-payment"
			className="absolute inset-0 p-4 space-y-4"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper>
				{error && (
					<motion.div
						className="p-3 bg-red-50 text-red-600 rounded-lg"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						{error}
					</motion.div>
				)}

				<motion.div
					className="p-3 bg-blue-50 text-blue-700 rounded-lg"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					Remaining Balance: ${remainingAmount.toFixed(2)}
				</motion.div>

				<div className="grid grid-cols-2 gap-3">
					{[5, 10, 20, 50].map((amount) => (
						<PaymentButton
							key={amount}
							label={`$${amount}`}
							onClick={() => handlePresetAmount(amount)}
							disabled={isProcessing || remainingAmount === 0}
							className={isProcessing ? "opacity-50 cursor-not-allowed" : ""}
						>
							{isProcessing ? "Processing..." : `$${amount}`}
						</PaymentButton>
					))}
				</div>

				<div className="flex gap-2">
					<input
						type="number"
						className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="Enter custom amount"
						min="0.01"
						max={remainingAmount}
						value={state.customAmount}
						onChange={(e) =>
							setState((prev) => ({ ...prev, customAmount: e.target.value }))
						}
						disabled={isProcessing || remainingAmount === 0}
						onKeyPress={(e) => {
							if (e.key === "Enter" && !isProcessing) {
								handleCustomAmount();
							}
						}}
					/>
					<PaymentButton
						label={isProcessing ? "Processing..." : "Pay"}
						variant="primary"
						onClick={handleCustomAmount}
						disabled={
							isProcessing || !state.customAmount || remainingAmount === 0
						}
					/>
				</div>

				{shouldShowChangeCalculation() && (
					<motion.div
						className="p-3 bg-green-50 text-green-700 rounded-lg space-y-2"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<div className="flex justify-between items-center">
							<span className="font-medium">Cash Tendered:</span>
							<span className="text-lg">
								${getLatestTransaction().cashTendered.toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between items-center font-bold">
							<span>Change Due:</span>
							<span className="text-lg">
								${getLatestTransaction().change.toFixed(2)}
							</span>
						</div>
					</motion.div>
				)}
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CashPaymentView.propTypes = {
	state: PropTypes.shape({
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		transactions: PropTypes.arrayOf(
			PropTypes.shape({
				method: PropTypes.string.isRequired,
				amount: PropTypes.number.isRequired,
				cashTendered: PropTypes.number,
				change: PropTypes.number,
			})
		).isRequired,
		customAmount: PropTypes.string.isRequired,
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired,
	handlePayment: PropTypes.func.isRequired,
	setState: PropTypes.func.isRequired,
};

export default CashPaymentView;
