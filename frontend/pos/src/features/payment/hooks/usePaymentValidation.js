// src/features/payment/hooks/usePaymentValidation.js
import { useMemo } from "react";
import { calculatePaymentTotals } from "../utils/paymentCalculations";

export const usePaymentValidation = (state, totalAmount) => {
	const { payableAmount } = calculatePaymentTotals(totalAmount);

	const validation = useMemo(
		() => ({
			canProcessPayment: state.amountPaid < payableAmount,
			isValidCustomAmount: (amount) => {
				const numberAmount = Number(amount);
				return (
					!isNaN(numberAmount) &&
					numberAmount > 0 &&
					numberAmount <= payableAmount
				);
			},
			hasValidTransactions:
				state.transactions.length > 0 &&
				state.transactions.every((t) => t.amount > 0),
			isPaymentComplete: state.amountPaid >= payableAmount,
		}),
		[state.amountPaid, state.transactions, payableAmount]
	);

	const getValidationError = () => {
		if (!validation.canProcessPayment) return "Payment already complete";
		if (!validation.hasValidTransactions) return "Invalid transaction amounts";
		return null;
	};

	return {
		...validation,
		getValidationError,
	};
};
