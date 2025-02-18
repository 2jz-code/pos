// utils/useOrderValidation.js
export const useOrderValidation = (cart, orderId) => {
	const canHoldOrder = Boolean(
		orderId && cart.length > 0 && cart.every((item) => item.quantity > 0)
	);

	const getHoldOrderError = () => {
		if (!orderId) return "No active order to hold";
		if (cart.length === 0) return "Cart is empty";
		if (!cart.every((item) => item.quantity > 0))
			return "Invalid item quantities";
		return null;
	};

	return { canHoldOrder, getHoldOrderError };
};
