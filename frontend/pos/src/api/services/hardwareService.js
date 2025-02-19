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
		  const response = await axiosInstance.post(ENDPOINTS.HARDWARE.CASH_DRAWER.OPEN);
		  
		  if (response.data.status === "success") {
			return {
			  status: "success",
			  state: "open",
			  message: "Cash drawer opened successfully"
			};
		  }
		  
		  throw new Error(response.data.message || "Failed to open drawer");
		} catch (error) {
		  throw this.handleError(error, "Failed to open cash drawer");
		}
	  }

	  static async closeDrawer() {
		try {
		  // Add proper JSON body with action
		  const response = await axiosInstance.post(
			ENDPOINTS.HARDWARE.CASH_DRAWER.STATE, 
			{
			  action: 'close'
			}
		  );
		  
		  console.log('Hardware Service - Close Drawer Response:', response);
	  
		  return {
			status: response.data?.status || response.status,
			state: 'closed',
			message: response.data?.message || 'Drawer closed successfully'
		  };
		} catch (error) {
		  console.error('Hardware Service - Close Drawer Error:', {
			message: error.message,
			response: error.response
		  });
		  throw this.handleError(error, "Failed to close cash drawer");
		}
	  }

	static async getDrawerState() {
		try {
		  const response = await axiosInstance.get(ENDPOINTS.HARDWARE.CASH_DRAWER.STATE);
		  return response.data;
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
