// Add to src/utils/paymentUtils.js
export const isPaymentComplete = (
	remainingAmount,
	currentPaymentAmount = 0,
	epsilon = 0.01
) => {
	// Calculate the remaining amount after this payment
	const calculatedRemainingAmount = Math.max(
		0,
		remainingAmount - currentPaymentAmount
	);

	// If the remaining amount is less than epsilon, consider payment complete
	return calculatedRemainingAmount < epsilon;
};
