import axiosInstance from "../api/api";
import { useCartStore } from "../store/cartStore";

/**
 * Resumes an order by fetching details, storing items in Zustand, and navigating to POS.
 * @param {number} orderId - ID of the order to resume
 * @param {function} navigate - React Router navigation function
 */
export const resumeOrder = async (orderId, navigate) => {
	try {
		useCartStore.setState({ orderId });

		// ✅ Fetch order details
		const orderResponse = await axiosInstance.post(`orders/${orderId}/resume/`);
		const { items = [] } = orderResponse.data; // ✅ Default to empty array if missing

		// ✅ Ensure items exist before updating state
		if (!Array.isArray(items) || items.length === 0) {
			console.warn(`Warning: Order ${orderId} has no items.`);
			alert("This order has no items, please check the backend.");
			return;
		}

		// ✅ Update Zustand store
		useCartStore.setState({
			cart: items.map((item) => ({
				id: item.product.id,
				name: item.product.name,
				price: item.product.price,
				quantity: item.quantity,
			})),
		});

		// ✅ Redirect to POS
		navigate("/pos");
	} catch (error) {
		console.error("Error resuming order:", error);
		alert("Failed to resume order.");
	}
};

/**
 * Voids an order by updating its status to "voided".
 * @param {number} orderId - ID of the order to void
 * @param {function} navigate - React Router navigation function
 */
export const voidOrder = async (orderId, navigate) => {
	try {
		await axiosInstance.patch(`orders/${orderId}/`, { status: "voided" });
		alert("Order voided successfully!");
		navigate("/orders");
	} catch (error) {
		console.error("Error voiding order:", error);
		alert("Failed to void order.");
	}
};
