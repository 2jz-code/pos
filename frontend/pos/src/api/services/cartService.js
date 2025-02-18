// src/api/services/cartService.js
import axiosInstance from "../config/axiosConfig";
import { ENDPOINTS } from "../config/apiEndpoints";

export const cartService = {
	updateInProgressOrder: async (orderId, items) => {
		return axiosInstance.patch(ENDPOINTS.ORDERS.UPDATE_IN_PROGRESS, {
			order_id: orderId,
			items: items.map((item) => ({
				id: item.id,
				quantity: item.quantity,
			})),
		});
	},

	startOrder: async () => {
		return axiosInstance.post(ENDPOINTS.ORDERS.START);
	},

	getInProgressOrder: async (orderId) => {
		return axiosInstance.get(ENDPOINTS.ORDERS.DETAIL(orderId));
	},
};
