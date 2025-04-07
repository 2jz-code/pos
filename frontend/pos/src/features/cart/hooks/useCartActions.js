// src/features/cart/hooks/useCartActions.js
import { useCallback } from "react";
import { useCartStore } from "../../../store/cartStore";
import axiosInstance from "../../../api/config/axiosConfig";
import { toast } from "react-toastify";
import { calculateCartTotals } from "../utils/cartCalculations";

export const useCartActions = () => {
	// Add updateItemQuantity function
	const updateItemQuantity = useCallback((itemId, updates) => {
		if (typeof updates === "object") {
			// Handle object updates (can include discount or quantity)
			useCartStore.getState().updateItem(itemId, updates);
		} else {
			// Handle direct quantity updates (backward compatibility)
			useCartStore.getState().updateItemQuantity(itemId, updates);
		}
	}, []);

	const startOrder = useCallback(async () => {
		try {
			const response = await axiosInstance.post("orders/start/");
			const newOrderId = response.data.id;
			useCartStore.setState({ orderId: newOrderId, cart: [] });
			useCartStore.getState().setShowOverlay(false);
			return newOrderId;
		} catch (error) {
			console.error("Failed to start order:", error);
			toast.error("Failed to start new order");
		}
	}, []);

	const holdOrder = useCallback(async (orderId, cart) => {
		try {
			await axiosInstance.patch(`orders/${orderId}/`, {
				status: "saved",
				items: cart,
			});
			useCartStore.getState().clearCart();
			useCartStore.getState().setShowOverlay(true);
			toast.success("Order held successfully!");
		} catch (error) {
			console.error("Failed to hold order:", error);
			toast.error("Failed to hold order");
		}
	}, []);

	const completeOrder = useCallback(async (orderId, paymentDetails) => {
		try {
			console.log(
				"Starting order completion with payment details:",
				paymentDetails
			);

			// Get the rewards profile from the store
			const rewardsProfile = useCartStore.getState().rewardsProfile;

			// Get the order discount from the store
			const orderDiscount = useCartStore.getState().orderDiscount;

			// Get the cart and calculate totals INCLUDING TAX
			const cart = useCartStore.getState().cart;
			const { subtotal, taxAmount, total } = calculateCartTotals(
				cart,
				orderDiscount
			);

			// Create the payload with payment details
			const payload = {
				payment_status: "paid",
				payment_method:
					paymentDetails.paymentMethod ||
					(paymentDetails.transactions?.length > 0
						? paymentDetails.transactions[0].method
						: "cash"),
				payment_details: {
					...paymentDetails,
					completed_at: new Date().toISOString(),
				},
				// Include tax information
				subtotal: subtotal,
				tax_amount: taxAmount,
				total_amount: total, // This is the tax-inclusive total
			};

			// Add rewards profile information if available
			if (rewardsProfile) {
				payload.rewards_profile = {
					id: rewardsProfile.id,
					phone: rewardsProfile.phone,
				};
			}

			// Add discount information if available - either from state or from paymentDetails
			const discountId = orderDiscount?.id || paymentDetails.discount_id;
			if (discountId) {
				payload.discount_id = discountId;

				// Get the cart items to calculate the discount amount
				const cart = useCartStore.getState().cart;
				const subtotal = cart.reduce((sum, item) => {
					return sum + item.price * item.quantity;
				}, 0);

				// Calculate the discount amount
				let discountAmount = 0;
				if (orderDiscount) {
					if (orderDiscount.discount_type === "percentage") {
						discountAmount = subtotal * (orderDiscount.value / 100);
					} else {
						discountAmount = Math.min(orderDiscount.value, subtotal);
					}
				}

				payload.discount_amount = discountAmount.toFixed(2);
			}

			console.log("Sending payload to complete order:", payload);

			const response = await axiosInstance.post(
				`orders/${orderId}/complete/`,
				payload
			);

			console.log("Order completion response:", response);

			if (response.data.message === "Order completed successfully") {
				console.log("Order completed successfully");

				// IMPORTANT: Only reset the discount state AFTER successful order completion
				// This ensures the discount is properly applied to the order first
				setTimeout(() => {
					useCartStore.getState().setOrderDiscount(null);
				}, 500);

				return true;
			}
			return false;
		} catch (error) {
			console.error("Failed to complete order:", error);
			toast.error(error.message || "Failed to complete order");
			return false;
		}
	}, []);

	return {
		startOrder,
		holdOrder,
		completeOrder, // Add to returned object
		updateItemQuantity,
		...useCartStore.getState(),
	};
};
