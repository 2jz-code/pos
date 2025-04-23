// src/features/cart/utils/cartCalculations.js

// Tax rate as a decimal
export const TAX_RATE = 0.1;

// Helper to safely convert currency string/number to cents (integer)
const toCents = (amount) => {
	const num = Number(amount) || 0;
	return Math.round(num * 100);
};

// Helper to convert cents back to dollars (float)
const toDollars = (cents) => {
	return (Number(cents) || 0) / 100;
};

// Calculate the total for a single item *in cents*, applying any item-specific discount
export const calculateItemTotalCents = (item) => {
	const priceCents = toCents(item.price);
	const quantity = Number(item.quantity) || 1;
	const itemDiscountPercent = Number(item.discount) || 0; // Assuming item.discount is percentage
	const basePriceCents = priceCents * quantity;
	const itemDiscountCents = Math.floor(
		basePriceCents * (itemDiscountPercent / 100)
	);
	return basePriceCents - itemDiscountCents;
};

// Calculate totals for the entire cart
export const calculateCartTotals = (cart = [], orderDiscount = null) => {
	const subtotalCents = cart.reduce(
		(acc, item) => acc + calculateItemTotalCents(item),
		0
	);

	let orderDiscountAmountCents = 0;
	if (orderDiscount && orderDiscount.is_active) {
		const discountValue = Number(orderDiscount.value) || 0;
		const applyTo = orderDiscount.apply_to;
		const discountType = orderDiscount.discount_type;

		if (applyTo === "order") {
			if (discountType === "percentage") {
				orderDiscountAmountCents = Math.floor(
					subtotalCents * (discountValue / 100)
				);
			} else if (discountType === "fixed") {
				orderDiscountAmountCents = Math.min(
					toCents(discountValue),
					subtotalCents
				);
			}
		} else if (applyTo === "product") {
			const applicableProductIds = new Set(orderDiscount.products || []);
			cart.forEach((item) => {
				if (applicableProductIds.has(item.id)) {
					const itemTotalCents = calculateItemTotalCents(item);
					let itemDiscountCents = 0;
					if (discountType === "percentage") {
						itemDiscountCents = Math.floor(
							itemTotalCents * (discountValue / 100)
						);
					} else if (discountType === "fixed") {
						itemDiscountCents = Math.min(
							toCents(discountValue),
							itemTotalCents
						);
					}
					orderDiscountAmountCents += itemDiscountCents;
				}
			});
		} else if (applyTo === "category") {
			// --- MODIFICATION: Access item.categoryId ---
			const applicableCategoryIds = new Set(orderDiscount.categories || []);
			cart.forEach((item) => {
				const itemCategoryId = item.categoryId; // <-- Access the ID stored by cartStore
				if (itemCategoryId && applicableCategoryIds.has(itemCategoryId)) {
					const itemTotalCents = calculateItemTotalCents(item);
					let itemDiscountCents = 0;
					if (discountType === "percentage") {
						itemDiscountCents = Math.floor(
							itemTotalCents * (discountValue / 100)
						);
					} else if (discountType === "fixed") {
						itemDiscountCents = Math.min(
							toCents(discountValue),
							itemTotalCents
						);
					}
					orderDiscountAmountCents += itemDiscountCents;
				}
			});
		}
		orderDiscountAmountCents = Math.min(
			orderDiscountAmountCents,
			subtotalCents
		);
	}

	const discountedSubtotalCents = Math.max(
		0,
		subtotalCents - orderDiscountAmountCents
	);
	const taxAmountCents = Math.round(discountedSubtotalCents * TAX_RATE);
	const totalCents = discountedSubtotalCents + taxAmountCents;

	return {
		subtotal: toDollars(subtotalCents),
		discountAmount: toDollars(orderDiscountAmountCents),
		taxAmount: toDollars(taxAmountCents),
		total: toDollars(totalCents),
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
