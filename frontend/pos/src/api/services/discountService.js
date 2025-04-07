// src/api/services/discountService.js
import axiosInstance from "../config/axiosConfig";
import { ENDPOINTS } from "../config/apiEndpoints";

export const discountService = {
	// Get all discounts
	getDiscounts: async () => {
		try {
			const response = await axiosInstance.get(ENDPOINTS.DISCOUNTS.LIST);
			return response.data;
		} catch (error) {
			console.error("Error fetching discounts:", error);
			throw error;
		}
	},

	// Get a specific discount
	getDiscount: async (discountId) => {
		try {
			const response = await axiosInstance.get(
				ENDPOINTS.DISCOUNTS.DETAIL(discountId)
			);
			return response.data;
		} catch (error) {
			console.error(`Error fetching discount #${discountId}:`, error);
			throw error;
		}
	},

	// Create a new discount
	createDiscount: async (discountData) => {
		try {
			const response = await axiosInstance.post(
				ENDPOINTS.DISCOUNTS.LIST,
				discountData
			);
			return response.data;
		} catch (error) {
			console.error("Error creating discount:", error);
			throw error;
		}
	},

	// Update a discount
	updateDiscount: async (discountId, discountData) => {
		try {
			const response = await axiosInstance.put(
				ENDPOINTS.DISCOUNTS.DETAIL(discountId),
				discountData
			);
			return response.data;
		} catch (error) {
			console.error(`Error updating discount #${discountId}:`, error);
			throw error;
		}
	},

	// Delete a discount
	deleteDiscount: async (discountId) => {
		try {
			const response = await axiosInstance.delete(
				ENDPOINTS.DISCOUNTS.DETAIL(discountId)
			);
			return response.data;
		} catch (error) {
			console.error(`Error deleting discount #${discountId}:`, error);
			throw error;
		}
	},

	// Validate a discount code
	validateDiscountCode: async (code, orderAmount) => {
		try {
			const response = await axiosInstance.post(ENDPOINTS.DISCOUNTS.VALIDATE, {
				code,
				order_amount: orderAmount,
			});
			return response.data;
		} catch (error) {
			console.error("Error validating discount code:", error);
			throw error;
		}
	},
};
