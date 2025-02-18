// src/services/api.js
import axiosInstance from "./api";

const ENDPOINTS = {
	OPEN_DRAWER: "hardware/cash-drawer/open/",
	CLOSE_DRAWER: "hardware/cash-drawer/state/",
	DRAWER_STATE: "hardware/cash-drawer/state/",
	PRINT_RECEIPT: "hardware/receipt/print/",
	SIMULATE_ERROR: "hardware/debug/simulate-error/",
	SIMULATE_DELAY: "hardware/debug/simulate-delay/",
};

class HardwareAPI {
	static async openDrawer() {
		try {
			return await axiosInstance.post(ENDPOINTS.OPEN_DRAWER);
		} catch (error) {
			throw this.handleError(error, "Failed to open cash drawer");
		}
	}

	static async simulateError() {
		try {
			return await axiosInstance.post(ENDPOINTS.SIMULATE_ERROR);
		} catch (error) {
			throw this.handleError(error, "Failed to simulate error");
		}
	}

	static async simulateDelay() {
		try {
			return await axiosInstance.post(ENDPOINTS.SIMULATE_DELAY);
		} catch (error) {
			throw this.handleError(error, "Failed to simulate delay");
		}
	}

	static handleError(error, defaultMessage) {
		const errorMessage =
			error.response?.data?.message || error.message || defaultMessage;

		// Create custom error with additional context
		const customError = new Error(errorMessage);
		customError.originalError = error;
		customError.status = error.response?.status;
		customError.data = error.response?.data;

		return customError;
	}

	static async closeDrawer() {
		try {
			return await axiosInstance.post(ENDPOINTS.CLOSE_DRAWER, {
				action: "close",
			});
		} catch (error) {
			throw this.handleError(error, "Failed to close cash drawer");
		}
	}

	static async getDrawerState() {
		try {
			return await axiosInstance.get(ENDPOINTS.DRAWER_STATE);
		} catch (error) {
			throw this.handleError(error, "Failed to get drawer state");
		}
	}

	static async printReceipt(receiptData) {
		try {
			return await axiosInstance.post(ENDPOINTS.PRINT_RECEIPT, receiptData);
		} catch (error) {
			throw this.handleError(error, "Failed to print receipt");
		}
	}

	// src/api/hardwareApi.js
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

		// Return a cleanup function that clears the interval
		return () => clearInterval(intervalId);
	}
}

export default HardwareAPI;
