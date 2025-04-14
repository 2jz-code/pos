// src/features/cart/utils/cartCalculations.js

// Tax rate as a decimal
export const TAX_RATE = 0.1;

// Helper to safely convert currency string/number to cents (integer)
const toCents = (amount) => {
	const num = Number(amount) || 0;
	// Round to 2 decimal places first to handle potential float issues, then multiply
	return Math.round(num * 100);
};

// Helper to convert cents back to dollars (float) for display or final use
const toDollars = (cents) => {
	return (Number(cents) || 0) / 100;
};

// Calculate the total for a single item *in cents*, applying item discount
export const calculateItemTotalCents = (item) => {
	const priceCents = toCents(item.price);
	const quantity = Number(item.quantity) || 1;
	const discountPercent = Number(item.discount) || 0;

	const basePriceCents = priceCents * quantity;

	// Calculate discount in cents, using Math.floor to avoid fractional cents on discount
	const discountCents = Math.floor(basePriceCents * (discountPercent / 100));

	return basePriceCents - discountCents;
};

// Calculate totals for the entire cart
export const calculateCartTotals = (cart = [], orderDiscount = null) => {
	// 1. Calculate Subtotal in Cents (sum of item totals after item discounts)
	const subtotalCents = cart.reduce(
		(acc, item) => acc + calculateItemTotalCents(item),
		0
	);

	// 2. Calculate Order-Level Discount in Cents
	let orderDiscountAmountCents = 0;
	if (orderDiscount) {
		const discountValue = Number(orderDiscount.value) || 0;
		if (orderDiscount.discount_type === "percentage") {
			// Calculate percentage discount, round down to avoid giving too much discount
			orderDiscountAmountCents = Math.floor(
				subtotalCents * (discountValue / 100)
			);
		} else if (orderDiscount.discount_type === "fixed") {
			const fixedDiscountCents = toCents(discountValue);
			// Fixed amount cannot exceed the subtotal
			orderDiscountAmountCents = Math.min(fixedDiscountCents, subtotalCents);
		}
	}

	// 3. Calculate Discounted Subtotal in Cents
	const discountedSubtotalCents = subtotalCents - orderDiscountAmountCents;

	// 4. Calculate Tax in Cents based on the discounted subtotal
	// Use Math.round here for standard rounding of tax amounts
	const taxAmountCents = Math.round(discountedSubtotalCents * TAX_RATE);

	// 5. Calculate Final Total in Cents
	const totalCents = discountedSubtotalCents + taxAmountCents;

	// 6. Convert back to dollars for return value
	return {
		subtotal: toDollars(subtotalCents), // Original subtotal before order discount/tax
		discountAmount: toDollars(orderDiscountAmountCents), // Order-level discount amount
		taxAmount: toDollars(taxAmountCents),
		total: toDollars(totalCents), // Final payable amount
	};
};

// --- Keep original functions if they are used elsewhere, but prefer using the Cents versions internally ---
// export const calculateItemTotal = (item) => {
// 	const basePrice = Number(item.price) * (Number(item.quantity) || 1);
// 	const discount = (basePrice * (Number(item.discount) || 0)) / 100;
// 	return basePrice - discount;
// };

// export const calculateCartTotals_OLD = (cart = [], orderDiscount = null) => {
// 	const subtotal = cart.reduce(
// 		(acc, item) => acc + calculateItemTotal(item),
// 		0
// 	);
// 	let discountAmount = 0;
// 	if (orderDiscount) {
// 		if (orderDiscount.discount_type === "percentage") {
// 			discountAmount = subtotal * (Number(orderDiscount.value || 0) / 100);
// 		} else {
// 			discountAmount = Math.min(Number(orderDiscount.value || 0), subtotal);
// 		}
// 	}
// 	const discountedSubtotal = subtotal - discountAmount;
// 	const taxAmount = discountedSubtotal * TAX_RATE;
// 	const total = discountedSubtotal + taxAmount;
// 	return { subtotal, discountAmount, taxAmount, total };
// };
