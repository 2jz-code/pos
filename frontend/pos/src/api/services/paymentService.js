// src/api/services/paymentService.js

import axiosInstance from "../config/axiosConfig";

export const paymentService = {
	// Get all payments with optional filters
	getPayments: async (filters = {}) => {
		try {
			// Build query parameters from filters
			const params = new URLSearchParams();
			if (filters.payment_method)
				params.append("payment_method", filters.payment_method);
			if (filters.status) params.append("status", filters.status);
			if (filters.order_id) params.append("order_id", filters.order_id);

			const queryString = params.toString();
			const url = queryString ? `payments/?${queryString}` : "payments/";

			const response = await axiosInstance.get(url);
			return response.data;
		} catch (error) {
			console.error("Error fetching payments:", error);
			throw error;
		}
	},

	// Get a single payment by ID
	getPaymentById: async (paymentId) => {
		try {
			const response = await axiosInstance.get(`payments/${paymentId}/`);
			return response.data;
		} catch (error) {
			console.error(`Error fetching payment #${paymentId}:`, error);
			throw error;
		}
	},

	// Process a refund
	processRefund: async (paymentId, refundData = {}) => {
		try {
			const response = await axiosInstance.post(
				`payments/${paymentId}/refund/`,
				refundData
			);
			return response.data;
		} catch (error) {
			console.error(
				`Error processing refund for payment #${paymentId}:`,
				error
			);
			throw error;
		}
	},

	// Get payments for a specific order
	getPaymentsByOrderId: async (orderId) => {
		try {
			const response = await axiosInstance.get(`payments/?order_id=${orderId}`);
			return response.data;
		} catch (error) {
			console.error(`Error fetching payments for order #${orderId}:`, error);
			throw error;
		}
	},
};
