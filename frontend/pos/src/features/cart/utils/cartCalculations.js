// src/features/cart/utils/cartCalculations.js
export const TAX_RATE = 0.1;

export const calculateItemTotal = (item) => {
	const basePrice = Number(item.price) * (Number(item.quantity) || 1);
	const discount = (basePrice * (Number(item.discount) || 0)) / 100;
	return basePrice - discount;
};

export const calculateCartTotals = (cart = []) => {
	const subtotal = cart.reduce(
		(acc, item) => acc + calculateItemTotal(item),
		0
	);
	const taxAmount = subtotal * TAX_RATE;
	const total = subtotal + taxAmount;

	return {
		subtotal,
		taxAmount,
		total,
	};
};
