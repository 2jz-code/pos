// src/api/services/paymentService.js
import axiosInstance from "../config/axiosConfig";
import { ENDPOINTS } from "../config/apiEndpoints";

export const paymentService = {
	processPayment: async (orderId, paymentData) => {
		return axiosInstance.post(ENDPOINTS.ORDERS.COMPLETE(orderId), {
			...paymentData,
			completed_at: new Date().toISOString(),
		});
	},

	getHardwareState: async () => {
		return axiosInstance.get(ENDPOINTS.HARDWARE.CASH_DRAWER.STATE);
	},

	openCashDrawer: async () => {
		return axiosInstance.post(ENDPOINTS.HARDWARE.CASH_DRAWER.OPEN);
	},

	printReceipt: async (receiptData) => {
		return axiosInstance.post(ENDPOINTS.HARDWARE.RECEIPT.PRINT, receiptData);
	},
};
