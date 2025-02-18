// src/api/services/authService.js
import axiosInstance from "../config/axiosConfig";
import { ENDPOINTS } from "../config/apiEndpoints";

export const authService = {
	/**
	 * Check authentication status
	 * @returns {Promise<{authenticated: boolean, username: string, is_admin: boolean}>}
	 */
	checkStatus: async () => {
		try {
			const response = await axiosInstance.get(ENDPOINTS.AUTH.CHECK_STATUS);
			return response.data;
		} catch (error) {
			console.log(error);
			return { authenticated: false, is_admin: false };
		}
	},

	login: async (credentials) => {
		return axiosInstance.post(ENDPOINTS.AUTH.LOGIN, credentials);
	},

	logout: async () => {
		return axiosInstance.post(ENDPOINTS.AUTH.LOGOUT);
	},

	refreshToken: async () => {
		return axiosInstance.post(ENDPOINTS.AUTH.REFRESH_TOKEN);
	},
};
