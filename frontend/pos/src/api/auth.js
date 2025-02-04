import axiosInstance from "./api";

/**
 * Fetches user authentication status.
 * @returns {Promise<{authenticated: boolean, username: string, is_admin: boolean}>}
 */
export const checkAuthStatus = async () => {
	try {
		const response = await axiosInstance.get("auth/check-auth/");
		return response.data; // { authenticated: true, username: "...", is_admin: true/false }
	} catch (error) {
		return { authenticated: false, is_admin: false }; // Default response if unauthorized
	}
};
