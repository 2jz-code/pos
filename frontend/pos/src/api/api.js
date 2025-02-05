import axios from "axios";

// Backend API URL
const API_URL = "http://localhost:8000/api/";

// Axios instance with credentials (Cookies)
const axiosInstance = axios.create({
	baseURL: API_URL,
	headers: { "Content-Type": "application/json" },
	withCredentials: true, // Important for sending cookies
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;

axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		// Check for 401 (Unauthorized) or 403 (Forbidden) errors
		if (
			error.response &&
			(error.response.status === 401 || error.response.status === 403) &&
			!originalRequest._retry
		) {
			originalRequest._retry = true;

			// Prevent multiple simultaneous refresh requests
			if (isRefreshing) return Promise.reject(error);
			isRefreshing = true;

			try {
				// Attempt to refresh the token
				await axiosInstance.post("auth/token/refresh/");
				isRefreshing = false;
				return axiosInstance(originalRequest); // Retry the original request
			} catch (refreshError) {
				// If refresh fails, redirect to login
				console.error("Session expired, redirecting to login.", refreshError);
				isRefreshing = false;
				window.location.href = "/login";
			}
		}

		return Promise.reject(error);
	}
);

export default axiosInstance;
