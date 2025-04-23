// useOrderCancellation.js - Custom Hook
import { useState } from "react";
import { toast } from "react-toastify";
import { useCartStore } from "../store/cartStore";

export const useOrderCancellation = (axiosInstance) => {
	const [isLoading, setIsLoading] = useState(false);
	const clearCart = useCartStore((state) => state.clearCart);
	const setOrderId = useCartStore((state) => state.setOrderId); // Renamed for clarity
	const setShowOverlay = useCartStore((state) => state.setShowOverlay);

	const cancelOrder = async (activeOrderId) => {
		// Remove parameters that are now accessed directly
		if (!activeOrderId) {
			toast.warning("No active order to cancel");
			return;
		}

		setIsLoading(true);
		try {
			// Call the backend API to delete/void the order
			// Assuming delete means cancel/void here. Adjust if needed.
			await axiosInstance.delete(`orders/${activeOrderId}/`);

			// Reset state using functions obtained from the store
			clearCart();
			setOrderId(null); // Use the function from the store
			setShowOverlay(true); // Use the function from the store

			toast.success("Order cancelled successfully");
		} catch (error) {
			console.error("Failed to cancel order:", error);
			const errorMessage =
				error.response?.status === 404
					? "Order not found"
					: "Failed to cancel order. Please try again.";
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	// Return only what's needed externally
	return { cancelOrder, isLoading };
};
