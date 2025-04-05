// src/utils/receiptUtils.js
import { calculateCartTotals } from "../features/cart/utils/cartCalculations";
import { useCartStore } from "../store/cartStore";

export const formatReceiptData = (paymentDetails) => {
	const {
		orderId,
		paymentMethod,
		isSplitPayment,
		cardData,
		cashData,
		openDrawer = false,
		transactions = [],
	} = paymentDetails;

	// Get cart items from the cart store
	const cartItems = useCartStore.getState().cart;

	// Calculate the cart totals including tax
	const { subtotal, taxAmount, total } = calculateCartTotals(cartItems);

	// For split payments with multiple methods, calculate totals differently
	let paymentInfo = {};
	if (paymentMethod === "cash") {
		paymentInfo = {
			method: "cash",
			amount_tendered: cashData?.cashTendered || 0,
			change: cashData?.change || 0,
		};
	} else if (paymentMethod === "credit") {
		paymentInfo = {
			method: "credit",
			card_type: cardData?.cardType || "Credit Card",
			last_four: cardData?.lastFour || "****",
		};
	} else if (paymentMethod === "mixed") {
		// For mixed payment methods (multiple methods in split)
		const cashTotal = transactions
			.filter((t) => t.method === "cash")
			.reduce((sum, t) => sum + t.amount, 0);

		const creditTotal = transactions
			.filter((t) => t.method === "credit")
			.reduce((sum, t) => sum + t.amount, 0);

		paymentInfo = {
			method: "mixed",
			cash_amount: cashTotal,
			credit_amount: creditTotal,
			methods_used: transactions.map((t) => t.method),
		};
	}

	// Base receipt data
	return {
		id: orderId || Math.floor(Date.now() / 1000),
		timestamp: new Date().toISOString(),
		items: cartItems.map((item) => ({
			product_name: item.name,
			quantity: item.quantity,
			unit_price: item.price,
		})),
		total_price: total,
		subtotal: subtotal,
		tax: taxAmount,
		payment: paymentInfo,
		open_drawer: openDrawer,
		is_split_payment: isSplitPayment,
		store_name: "Ajeen Restaurant",
		store_address: "123 Main Street",
		store_phone: "(123) 456-7890",
		receipt_footer: "Thank you for your purchase!",
	};
};
