import axiosInstance from "../api/api";
import { useCartStore } from "../store/cartStore";

/**
 * Resumes an order by fetching details, storing items in Zustand, and navigating to POS.
 * @param {number} orderId - ID of the order to resume
 * @param {function} navigate - React Router navigation function
 */
export const resumeOrder = async (orderId, navigate) => {
	try {
		useCartStore.setState({ orderId: orderId });

		// ✅ Fetch order details
		const orderResponse = await axiosInstance.get(`orders/${orderId}/`);
		if (!orderResponse.data.items) {
			throw new Error("Order data is missing 'items'.");
		}

		// ✅ Update Zustand store
		useCartStore.setState({
			cart: orderResponse.data.items.map((item) => ({
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
