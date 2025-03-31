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

	const completeOrder = useCallback(async (orderId, paymentDetails) => {
		try {
			console.log(
				"Starting order completion with payment details:",
				paymentDetails
			);

			// Get the rewards profile from the store
			const rewardsProfile = useCartStore.getState().rewardsProfile;

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
			};

			// Add rewards profile information if available - at the root level of the payload
			if (rewardsProfile) {
				payload.rewards_profile = {
					id: rewardsProfile.id,
					phone: rewardsProfile.phone,
				};
			}

			console.log("Sending payload to complete order:", payload);

			const response = await axiosInstance.post(
				`orders/${orderId}/complete/`,
				payload
			);

			console.log("Order completion response:", response);

			if (response.data.message === "Order completed successfully") {
				console.log("Order completed successfully");
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
