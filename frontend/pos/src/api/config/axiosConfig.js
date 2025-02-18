// src/api/config/axiosConfig.js
import axios from "axios";

const API_URL = "http://localhost:8000/api/";

const axiosInstance = axios.create({
	baseURL: API_URL,
	headers: { "Content-Type": "application/json" },
	withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
	failedQueue.forEach((prom) => {
		if (error) {
			prom.reject(error);
		} else {
			prom.resolve(token);
		}
	});
	failedQueue = [];
};

axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		if (error.response?.status === 401 && !originalRequest._retry) {
			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				})
					.then(() => axiosInstance(originalRequest))
					.catch((err) => Promise.reject(err));
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				await axiosInstance.post("auth/token/refresh/");
				processQueue(null);
				return axiosInstance(originalRequest);
			} catch (refreshError) {
				processQueue(refreshError, null);
				window.location.href = "/login";
				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}

		return Promise.reject(error);
	}
);

export default axiosInstance;
