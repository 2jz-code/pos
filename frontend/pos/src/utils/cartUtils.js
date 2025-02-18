export const checkOrderStatus = async (orderId, axiosInstance) => {
	try {
		if (!orderId) return { isValid: false };

		const response = await axiosInstance.get(`orders/${orderId}/`);
		return {
			isValid: response.data.status === "in_progress",
			status: response.data.status,
			data: response.data,
		};
	} catch (error) {
		console.error("Error checking order status:", error);
		return { isValid: false, error };
	}
};
