// src/api/services/paymentService.js

import axiosInstance from "../config/axiosConfig";

export const paymentService = {
	// Get all payments with optional filters
	getPayments: async (filters = {}) => {
		try {
			const params = new URLSearchParams();
			if (filters.payment_method)
				params.append("payment_method", filters.payment_method);
			if (filters.status) params.append("status", filters.status);
			if (filters.order_id) params.append("order_id", filters.order_id);

			const queryString = params.toString();
			const url = queryString ? `payments/?${queryString}` : "payments/";

			const response = await axiosInstance.get(url);
			// Ensure data is always an array
			return Array.isArray(response.data) ? response.data : [];
		} catch (error) {
			console.error("Error fetching payments:", error);
			// Return empty array on error to prevent downstream issues
			return [];
			// Or rethrow if you handle errors upstream: throw error;
		}
	},

	// Get a single payment by ID (includes nested transactions)
	getPaymentById: async (paymentId) => {
		try {
			const response = await axiosInstance.get(`payments/${paymentId}/`);
			return response.data;
		} catch (error) {
			console.error(`Error fetching payment #${paymentId}:`, error);
			throw error; // Rethrow to be handled by caller
		}
	},

	// Process a refund for a SPECIFIC transaction within a payment
	processRefund: async (paymentId, refundData = {}) => {
		// refundData should include: { transaction_id: X, amount: Y, reason: Z }
		try {
			if (!refundData.transaction_id || !refundData.amount) {
				throw new Error(
					"Transaction ID and refund amount are required for processing refund."
				);
			}
			console.log(
				`paymentService: Refunding payment ${paymentId}, transaction ${refundData.transaction_id}, amount ${refundData.amount}`
			);
			// The backend endpoint expects transaction_id and amount in the request body
			const response = await axiosInstance.post(
				`payments/${paymentId}/refund/`,
				{
					transaction_id: refundData.transaction_id, // Pass the PaymentTransaction PK
					amount: refundData.amount,
					reason: refundData.reason || "requested_by_customer",
				}
			);
			// Assume backend returns success status and potentially refund details
			// Adding success property based on status code
			response.data.success = response.status >= 200 && response.status < 300;
			return response.data;
		} catch (error) {
			console.error(
				`Error processing refund for payment #${paymentId}, transaction #${refundData?.transaction_id}:`,
				error
			);
			// Attach error status for easier handling
			const processedError = new Error(
				error.response?.data?.error || error.message || "Refund failed"
			);
			processedError.response = error.response;
			throw processedError; // Rethrow for caller to handle
		}
	},

	// Get payments for a specific order
	getPaymentsByOrderId: async (orderId) => {
		try {
			const response = await axiosInstance.get(`payments/?order_id=${orderId}`);
			// Ensure data is always an array
			return Array.isArray(response.data) ? response.data : [];
		} catch (error) {
			console.error(`Error fetching payments for order #${orderId}:`, error);
			// Return empty array on error
			return [];
			// Or rethrow: throw error;
		}
	},
};
