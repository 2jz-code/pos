// useOrderCancellation.js - Custom Hook
import { useState } from "react";
import { toast } from "react-toastify";

export const useOrderCancellation = (axiosInstance) => {
	const [isLoading, setIsLoading] = useState(false);

	const cancelOrder = async (
		activeOrderId,
		setActiveOrderId,
		clearCart,
		setShowOverlay
	) => {
		if (!activeOrderId) {
			toast.warning("No active order to cancel");
			return;
		}

		setIsLoading(true);
		try {
			await axiosInstance.delete(`orders/${activeOrderId}/`);

			// Reset local state
			clearCart();
			setActiveOrderId(null);
			setShowOverlay(true);

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

	return { cancelOrder, isLoading };
};
