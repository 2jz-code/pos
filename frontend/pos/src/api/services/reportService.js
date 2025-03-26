// src/api/services/reportService.js
import axiosInstance from "../config/axiosConfig";

export const reportService = {
	// Get dashboard summary
	getDashboardSummary: async () => {
		try {
			const response = await axiosInstance.get("reports/dashboard-summary/");
			return response.data;
		} catch (error) {
			console.error("Error fetching dashboard summary:", error);
			throw error;
		}
	},

	// Get saved reports
	getSavedReports: async () => {
		try {
			const response = await axiosInstance.get("reports/saved/");
			return response.data;
		} catch (error) {
			console.error("Error fetching saved reports:", error);
			throw error;
		}
	},

	// Get a specific saved report
	getSavedReport: async (reportId) => {
		try {
			const response = await axiosInstance.get(`reports/saved/${reportId}/`);
			return response.data;
		} catch (error) {
			console.error(`Error fetching saved report #${reportId}:`, error);
			throw error;
		}
	},

	// Delete a saved report
	deleteSavedReport: async (reportId) => {
		try {
			const response = await axiosInstance.delete(`reports/saved/${reportId}/`);
			return response.data;
		} catch (error) {
			console.error(`Error deleting saved report #${reportId}:`, error);
			throw error;
		}
	},

	// Generate sales report
	generateSalesReport: async (params) => {
		try {
			const response = await axiosInstance.post("reports/sales/", params);
			return response.data;
		} catch (error) {
			console.error("Error generating sales report:", error);
			throw error;
		}
	},

	// Generate product report
	generateProductReport: async (params) => {
		try {
			const response = await axiosInstance.post("reports/products/", params);
			return response.data;
		} catch (error) {
			console.error("Error generating product report:", error);
			throw error;
		}
	},

	// Get product categories
	getProductCategories: async () => {
		try {
			const response = await axiosInstance.get(
				"reports/products/?categories=true"
			);
			return response.data;
		} catch (error) {
			console.error("Error fetching product categories:", error);
			throw error;
		}
	},

	// Generate payment report
	generatePaymentReport: async (params) => {
		try {
			const response = await axiosInstance.post("reports/payments/", params);
			return response.data;
		} catch (error) {
			console.error("Error generating payment report:", error);
			throw error;
		}
	},

	// Generate operational insights
	generateOperationalInsights: async (params) => {
		try {
			const response = await axiosInstance.post("reports/operational/", params);
			return response.data;
		} catch (error) {
			console.error("Error generating operational insights:", error);
			throw error;
		}
	},
};
