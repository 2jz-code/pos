// src/features/cart/hooks/useCartActions.js
import { useCallback } from "react";
import { useCartStore } from "../../../store/cartStore";
import axiosInstance from "../../../api/config/axiosConfig";
import { toast } from "react-toastify";

export const useCartActions = () => {
	// Add updateItemQuantity function
	const updateItemQuantity = useCallback((itemId, updates) => {
		useCartStore
			.getState()
			.updateItemQuantity(
				itemId,
				typeof updates === "object" ? updates.quantity : updates
			);
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

	return {
		startOrder,
		holdOrder,
		updateItemQuantity, // Add this to the returned object
		...useCartStore.getState(),
	};
};
