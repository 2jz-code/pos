// src/features/cart/hooks/useCartActions.js
import { useCallback } from "react";
import { useCartStore } from "../../../store/cartStore";
import axiosInstance from "../../../api/config/axiosConfig";
import { toast } from "react-toastify";
import { calculateCartTotals } from "../utils/cartCalculations"; // Make sure this import exists

export const useCartActions = () => {
	// Add item to cart (assuming this exists in your store)
	const addToCart = useCallback((item) => {
		useCartStore.getState().addToCart(item);
	}, []);

	// Remove item from cart
	const removeFromCart = useCallback((itemId) => {
		// <-- ADD THIS FUNCTION
		useCartStore.getState().removeFromCart(itemId);
	}, []);

	// Update item quantity or discount
	const updateItemQuantity = useCallback((itemId, updates) => {
		if (typeof updates === "object") {
			useCartStore.getState().updateItem(itemId, updates);
		} else {
			useCartStore.getState().updateItemQuantity(itemId, updates);
		}
	}, []);

	// Start a new order
	const startOrder = useCallback(async () => {
		try {
			const response = await axiosInstance.post("orders/start/");
			const newOrderId = response.data.id;
			useCartStore.setState({
				orderId: newOrderId,
				cart: [],
				orderDiscount: null,
				rewardsProfile: null,
			});
			useCartStore.getState().setShowOverlay(false);
			return newOrderId;
		} catch (error) {
			console.error("Failed to start order:", error);
			toast.error("Failed to start new order");
			return null;
		}
	}, []);

	// Hold the current order
	const holdOrder = useCallback(async (orderId, cart) => {
		if (!orderId || !cart || cart.length === 0) {
			toast.warn("Cannot hold an empty order.");
			return;
		}
		try {
			await axiosInstance.patch(`orders/${orderId}/`, {
				status: "saved",
				items: cart,
			});
			useCartStore.getState().clearCart();
			useCartStore.getState().setOrderId(null);
			useCartStore.getState().setShowOverlay(true);
			toast.success("Order held successfully!");
		} catch (error) {
			console.error("Failed to hold order:", error);
			toast.error("Failed to hold order");
		}
	}, []);

	const completeOrder = useCallback(async (orderId, paymentInfo) => {
		// paymentInfo contains { transactions, totalPaid, baseAmountPaid, totalTipAmount, ... }
		try {
			const storeState = useCartStore.getState();
			const currentOrderId = orderId || storeState.orderId;
			const rewardsProfile = storeState.rewardsProfile;
			const orderDiscount = storeState.orderDiscount;
			const cart = storeState.cart;

			if (!currentOrderId) {
				throw new Error("Order ID is missing for completing order.");
			}

			console.log(
				`COMPLETE ORDER (Action): Starting completion for Order ID: ${currentOrderId}`
			);
			console.log(
				"COMPLETE ORDER (Action): Received paymentInfo:",
				JSON.stringify(paymentInfo, null, 2)
			);

			// Calculate base subtotal, tax, and discount from cart context
			const { subtotal, taxAmount, discountAmount } = calculateCartTotals(
				cart,
				orderDiscount
			);

			// --- Extract ACCURATE totals from paymentInfo ---
			// These totals are calculated correctly in usePaymentFlow
			const baseAmountPaid = paymentInfo.baseAmountPaid || 0;
			const totalTipAmount = paymentInfo.totalTipAmount || 0;
			// Use totalPaid directly from paymentInfo as it's base + total tip
			const totalPaid =
				paymentInfo.totalPaid || baseAmountPaid + totalTipAmount;

			console.log(
				`COMPLETE ORDER (Action): Base Paid: ${baseAmountPaid}, Total Tip: ${totalTipAmount}, Total Paid: ${totalPaid}`
			);

			// --- Extract Payment Details (remain same) ---
			const primaryMethod = paymentInfo.paymentMethod || "unknown";
			const isSplit =
				paymentInfo.splitPayment || paymentInfo.transactions?.length > 1;
			const lastCreditTxn = paymentInfo.transactions
				?.slice()
				.reverse()
				.find((t) => t.method === "credit");
			const stripeTransactionId =
				lastCreditTxn?.transactionId || paymentInfo?.transactionId || null;
			const stripeCardBrand =
				lastCreditTxn?.cardInfo?.brand || paymentInfo?.cardBrand || null;
			const stripeCardLast4 =
				lastCreditTxn?.cardInfo?.last4 || paymentInfo?.cardLast4 || null;
			const stripePaymentStatus =
				lastCreditTxn?.flowData?.payment?.status ||
				lastCreditTxn?.status ||
				paymentInfo?.status ||
				"completed";
			console.log("COMPLETE ORDER (Action): Extracted Stripe Details:", {
				stripeTransactionId,
				stripeCardBrand,
				stripeCardLast4,
				stripePaymentStatus,
			});

			// --- Construct the Backend Payload ---
			const payload = {
				payment_status: "paid",
				payment_method: primaryMethod,
				subtotal: parseFloat(subtotal.toFixed(2)),
				tax_amount: parseFloat(taxAmount.toFixed(2)),
				discount_id: orderDiscount?.id || null,
				discount_amount:
					parseFloat(discountAmount.toFixed(2)).toFixed(2) || "0.00",

				// *** FIX: Use ACCUMULATED totals for top-level fields ***
				tip_amount: parseFloat(totalTipAmount.toFixed(2)), // Use total accumulated tip
				total_amount: parseFloat(totalPaid.toFixed(2)), // Use total accumulated paid (base + tax + tip)
				// *** END FIX ***

				// Send detailed transaction data inside payment_details
				payment_details: {
					transactions: paymentInfo?.transactions || [],
					totalPaid: parseFloat(totalPaid.toFixed(2)),
					baseAmountPaid: parseFloat(baseAmountPaid.toFixed(2)),
					totalTipAmount: parseFloat(totalTipAmount.toFixed(2)),
					paymentMethod: primaryMethod,
					splitPayment: isSplit,
					splitDetails: paymentInfo?.splitDetails || null,
					completed_at: paymentInfo.completed_at || new Date().toISOString(),
				},

				transaction_id: stripeTransactionId, // Optional top-level convenience
				card_brand: stripeCardBrand,
				card_last4: stripeCardLast4,

				metadata: JSON.stringify({
					card_brand: stripeCardBrand,
					card_last4: stripeCardLast4,
					stripe_payment_status: stripePaymentStatus,
					num_transactions: paymentInfo?.transactions?.length || 0,
					split_payment: isSplit,
					total_tip_amount: parseFloat(totalTipAmount.toFixed(2)),
				}),

				rewards_profile_id: rewardsProfile?.id || null,
			};

			console.log(
				"COMPLETE ORDER (Action): Sending final payload to backend:",
				JSON.stringify(payload, null, 2)
			);

			// --- Send to Backend ---
			const response = await axiosInstance.post(
				`orders/${currentOrderId}/complete/`,
				payload
			);
			console.log("COMPLETE ORDER (Action): Backend response:", response.data);

			// ... (success/error handling remains same) ...
			if (response.status === 200 && response.data?.status === "success") {
				console.log(
					"COMPLETE ORDER (Action): Order completed successfully in backend."
				);
				storeState.removeOrderDiscount();
				storeState.setRewardsProfile(null);
				return true;
			} else {
				console.warn(
					"COMPLETE ORDER (Action): Backend success=false or status mismatch:",
					response.data
				);
				const backendError =
					response.data?.message ||
					response.data?.error ||
					JSON.stringify(response.data);
				toast.error(`Order completion issue: ${backendError}`);
				return false;
			}
		} catch (error) {
			// ... (error handling remains same) ...
			const errorResponseData = error?.response?.data;
			const errorStatus = error?.response?.status;
			const errorMessage =
				typeof errorResponseData === "string"
					? errorResponseData
					: errorResponseData?.message ||
					  errorResponseData?.error ||
					  error?.message ||
					  "An unknown error occurred";
			console.error(
				`COMPLETE ORDER (Action): Failed to complete order (Status: ${errorStatus}). Error: ${errorMessage}`,
				error
			);
			if (errorResponseData)
				console.error("Backend Error Details:", errorResponseData);
			toast.error(
				`Failed to complete order: ${errorMessage.substring(0, 100)}`
			);
			return false;
		}
	}, []);

	// Return all the actions
	return {
		startOrder,
		holdOrder,
		completeOrder,
		addToCart, // Assuming addToCart exists in store
		removeFromCart, // Added back
		updateItemQuantity,
		// Expose store state/actions directly IF NEEDED, otherwise prefer specific actions.
		// Example: Use useCartStore directly in components for state like 'cart', 'orderId' etc.
		// clearCart: useCartStore.getState().clearCart, // If needed directly
		// setShowOverlay: useCartStore.getState().setShowOverlay, // If needed directly
		// setOrderId: useCartStore.getState().setOrderId, // If needed directly
	};
};
