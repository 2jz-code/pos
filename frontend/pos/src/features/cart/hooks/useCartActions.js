// src/features/cart/hooks/useCartActions.js
import { useCallback } from "react";
import { useCartStore } from "../../../store/cartStore";
import axiosInstance from "../../../api/config/axiosConfig";
import { toast } from "react-toastify";
// import { calculateCartTotals } from "../utils/cartCalculations"; // Make sure this import exists

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
		// paymentInfo is the object passed from usePaymentFlow.completePaymentFlow
		try {
			const storeState = useCartStore.getState();
			const currentOrderId = orderId || storeState.orderId; // Use passed orderId first
			const rewardsProfile = storeState.rewardsProfile;
			// Get discount from paymentInfo if passed, otherwise from store (ensure consistency)
			const orderDiscountId =
				paymentInfo.discount_id || storeState.orderDiscount?.id;
			const orderDiscountAmount =
				paymentInfo.discount_amount ||
				(storeState.orderDiscount ? storeState.discountAmount : "0.00");

			if (!currentOrderId) {
				throw new Error("Order ID is missing for completing order.");
			}
			if (!paymentInfo || typeof paymentInfo !== "object") {
				throw new Error("Payment information is missing or invalid.");
			}
			if (!Array.isArray(paymentInfo.transactions)) {
				console.warn(
					"completeOrder received paymentInfo without a valid transactions array:",
					paymentInfo
				);
				// Decide if this is an error or if an empty array is acceptable
				// For now, let it proceed but log warning. Backend expects it.
				// throw new Error("Payment transaction details are missing.");
			}

			console.log(
				`COMPLETE ORDER (Action - Step 1): Starting completion for Order ID: ${currentOrderId}`
			);
			console.log(
				"COMPLETE ORDER (Action - Step 1): Received paymentInfo:",
				JSON.stringify(paymentInfo, null, 2)
			);

			// --- Construct Backend Payload DIRECTLY from paymentInfo ---
			const payload = {
				payment_status: "paid", // Assume paid if reaching here
				payment_method: paymentInfo.paymentMethod || "unknown", // Get from paymentInfo
				// Subtotal/Tax might not be needed if backend recalculates, but send if available
				// If not in paymentInfo, maybe calculate from cart state as fallback? Risky.
				// Best if backend calculates final totals based on items + discount + tip.
				// Let's remove subtotal/tax from frontend payload to rely on backend calculation.
				// subtotal: parseFloat(subtotal.toFixed(2)),
				// tax_amount: parseFloat(taxAmount.toFixed(2)),
				discount_id: orderDiscountId, // Use resolved discount ID
				discount_amount: orderDiscountAmount, // Use resolved discount amount
				tip_amount: parseFloat(paymentInfo.totalTipAmount || 0).toFixed(2),
				total_amount: parseFloat(paymentInfo.totalPaid || 0).toFixed(2), // Use totalPaid from paymentInfo
				payment_details: {
					// Pass the relevant parts of paymentInfo
					transactions: paymentInfo.transactions || [], // Pass received transactions
					totalPaid: parseFloat(paymentInfo.totalPaid || 0).toFixed(2),
					baseAmountPaid: parseFloat(paymentInfo.baseAmountPaid || 0).toFixed(
						2
					),
					totalTipAmount: parseFloat(paymentInfo.totalTipAmount || 0).toFixed(
						2
					),
					paymentMethod: paymentInfo.paymentMethod || "unknown",
					splitPayment: paymentInfo.splitPayment || false,
					splitDetails: paymentInfo.splitDetails || null,
					completed_at: paymentInfo.completed_at || new Date().toISOString(),
				},
				rewards_profile_id: rewardsProfile?.id || null,
				// Remove redundant fields if backend doesn't need them directly in top level
				// transaction_id: ..., card_brand: ..., card_last4: ..., metadata: ...,
			};

			console.log(
				"COMPLETE ORDER (Action - Step 2): Sending final payload to backend:",
				JSON.stringify(payload, null, 2)
			);

			// Send to Backend
			const response = await axiosInstance.post(
				`orders/${currentOrderId}/complete/`,
				payload
			);
			console.log(
				"COMPLETE ORDER (Action - Step 3): Backend response:",
				response.data
			);

			if (
				response.status === 200 &&
				response.data?.status === "success" &&
				response.data?.order
			) {
				console.log(
					"COMPLETE ORDER (Action): Order completed successfully in backend."
				);
				storeState.setRewardsProfile(null);
				// Clear cart/discount state AFTER successful completion & potential printing
				storeState.clearCart();
				storeState.clearLocalOrderDiscountState();
				return response.data.order; // Return the order object
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
				return null; // Indicate failure
			}
		} catch (error) {
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
			return null; // Indicate failure
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
