import axiosInstance from "../api/api";
import { useCartStore } from "../store/cartStore";

/**
 * Resumes an order by fetching details, storing items in Zustand, and navigating to POS.
 * @param {number} orderId - ID of the order to resume
 * @param {function} navigate - React Router navigation function
 */
export const resumeOrder = async (orderId, navigate) => {
  try {
    // ✅ Fetch order details
    const orderResponse = await axiosInstance.get(`orders/${orderId}/`);

    console.log("Resumed Order Data:", orderResponse.data); // Debugging

    // ✅ Ensure `orderResponse.data` has `items`
    const orderData = orderResponse.data;
    if (!orderData || !orderData.items) {
      throw new Error("Order data is missing 'items'.");
    }

    // ✅ Store the resumed order ID
    useCartStore.setState({ orderId });

    // ✅ Format items for the cart
    const formattedItems = orderData.items.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
    }));

    console.log("Formatted Cart Items:", formattedItems); // Debugging

    // ✅ Update Zustand store
    useCartStore.setState({ cart: formattedItems });

    // ✅ Resume the order
    await axiosInstance.post(`orders/${orderId}/resume/`);

    // ✅ Redirect to POS page
    alert("Order resumed successfully!");
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
