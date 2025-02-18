// src/api/services/hardwareService.js
import axiosInstance from "../config/axiosConfig";
import { ENDPOINTS } from "../config/apiEndpoints";

class HardwareService {
	static handleError(error, defaultMessage) {
		const errorMessage =
			error.response?.data?.message || error.message || defaultMessage;

		const customError = new Error(errorMessage);
		customError.originalError = error;
		customError.status = error.response?.status;
		customError.data = error.response?.data;

		return customError;
	}

	static async openDrawer() {
		try {
			return await axiosInstance.post(ENDPOINTS.HARDWARE.CASH_DRAWER.OPEN);
		} catch (error) {
			throw this.handleError(error, "Failed to open cash drawer");
		}
	}

	static async closeDrawer() {
		try {
			return await axiosInstance.post(ENDPOINTS.HARDWARE.CASH_DRAWER.CLOSE, {
				action: "close",
			});
		} catch (error) {
			throw this.handleError(error, "Failed to close cash drawer");
		}
	}

	static async getDrawerState() {
		try {
			return await axiosInstance.get(ENDPOINTS.HARDWARE.CASH_DRAWER.STATE);
		} catch (error) {
			throw this.handleError(error, "Failed to get drawer state");
		}
	}

	static async printReceipt(receiptData) {
		try {
			return await axiosInstance.post(
				ENDPOINTS.HARDWARE.RECEIPT.PRINT,
				receiptData
			);
		} catch (error) {
			throw this.handleError(error, "Failed to print receipt");
		}
	}

	static async simulateError() {
		try {
			return await axiosInstance.post(ENDPOINTS.HARDWARE.DEBUG.SIMULATE_ERROR);
		} catch (error) {
			throw this.handleError(error, "Failed to simulate error");
		}
	}

	static async simulateDelay() {
		try {
			return await axiosInstance.post(ENDPOINTS.HARDWARE.DEBUG.SIMULATE_DELAY);
		} catch (error) {
			throw this.handleError(error, "Failed to simulate delay");
		}
	}

	static pollDrawerState(callback, interval = 1000) {
		const intervalId = setInterval(async () => {
			try {
				const response = await this.getDrawerState();
				if (response.data.state === "closed") {
					clearInterval(intervalId);
					callback(null, response.data);
				}
			} catch (error) {
				clearInterval(intervalId);
				callback(error);
			}
		}, interval);

		return () => clearInterval(intervalId);
	}
}

export const hardwareService = HardwareService;
