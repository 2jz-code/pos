import axios from "axios";

// Backend API URL
const API_URL = "http://localhost:8000/api/";

// Axios instance with credentials (Cookies)
const axiosInstance = axios.create({
	baseURL: API_URL,
	headers: { "Content-Type": "application/json" },
	withCredentials: true, // Important for sending cookies
});

// Auto-refresh token before request if expired
axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		if (
			error.response &&
			error.response.status === 401 &&
			!originalRequest._retry
		) {
			originalRequest._retry = true;
			try {
				await axiosInstance.post("auth/token/refresh/");
				return axiosInstance(originalRequest); // Retry the original request
			} catch (refreshError) {
				console.error("Session expired, redirecting to login.", refreshError); // ✅ Log the error
				window.location.href = "/login";
			}
		}
		return Promise.reject(error);
	}
);

export default axiosInstance;
