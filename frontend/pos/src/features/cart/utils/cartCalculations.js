// src/features/cart/utils/cartCalculations.js
export const TAX_RATE = 0.1;

export const calculateItemTotal = (item) => {
	const basePrice = Number(item.price) * (Number(item.quantity) || 1);
	const discount = (basePrice * (Number(item.discount) || 0)) / 100;
	return basePrice - discount;
};

export const calculateCartTotals = (cart = [], orderDiscount = null) => {
	// Calculate subtotal from items (with their individual discounts)
	const subtotal = cart.reduce(
		(acc, item) => acc + calculateItemTotal(item),
		0
	);

	// Calculate order-level discount if applicable
	let discountAmount = 0;
	if (orderDiscount) {
		if (orderDiscount.discount_type === "percentage") {
			discountAmount = subtotal * (orderDiscount.value / 100);
		} else {
			// For fixed amount discounts, don't exceed the subtotal
			discountAmount = Math.min(orderDiscount.value, subtotal);
		}
	}

	// Apply discount before tax
	const discountedSubtotal = subtotal - discountAmount;
	const taxAmount = discountedSubtotal * TAX_RATE;
	const total = discountedSubtotal + taxAmount;

	return {
		subtotal,
		discountAmount,
		taxAmount,
		total,
	};
};
