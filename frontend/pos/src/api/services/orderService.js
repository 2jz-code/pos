// src/api/services/orderService.js
import axiosInstance from "../config/axiosConfig";
import { ENDPOINTS } from "../config/apiEndpoints";

export const orderService = {
	getOrders: () => axiosInstance.get(ENDPOINTS.ORDERS.LIST),

	getOrderDetails: (orderId) =>
		axiosInstance.get(ENDPOINTS.ORDERS.DETAIL(orderId)),

	resumeOrder: (orderId) =>
		axiosInstance.post(ENDPOINTS.ORDERS.RESUME(orderId)),

	completeOrder: (orderId, orderData) =>
		axiosInstance.post(ENDPOINTS.ORDERS.COMPLETE(orderId), orderData),

	voidOrder: (orderId) =>
		axiosInstance.patch(ENDPOINTS.ORDERS.DETAIL(orderId), { status: "voided" }),

	cancelOrder: (orderId) =>
		axiosInstance.delete(ENDPOINTS.ORDERS.DETAIL(orderId)),
};
