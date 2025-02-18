// src/features/payment/utils/paymentCalculations.js
export const TAX_RATE = 0.1;

export const calculatePaymentTotals = (totalAmount, amountPaid = 0) => {
	// totalAmount coming in is already including tax from the cart
	const subtotal = totalAmount / (1 + TAX_RATE); // Extract original subtotal
	const taxAmount = subtotal * TAX_RATE; // Calculate tax
	const payableAmount = totalAmount; // Use original total
	const remainingAmount = Math.max(0, payableAmount - amountPaid);

	return {
		subtotal,
		taxAmount,
		payableAmount,
		remainingAmount,
	};
};

export const calculateChange = (amountTendered, amountDue) => {
	const change = Math.max(0, amountTendered - amountDue);
	const validPaymentAmount = Math.min(amountTendered, amountDue);

	return {
		change,
		validPaymentAmount,
	};
};
