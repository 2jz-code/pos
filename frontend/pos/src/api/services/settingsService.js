// src/api/services/settingsService.js
import axiosInstance from "../config/axiosConfig";

export const settingsService = {
	// Security Settings
	getSecuritySettings: async () => {
		try {
			const response = await axiosInstance.get("settings/security/");
			return response.data;
		} catch (error) {
			console.error("Error fetching security settings:", error);
			throw error;
		}
	},

	updateSecuritySettings: async (securityData) => {
		try {
			const response = await axiosInstance.post(
				"settings/security/",
				securityData
			);
			return response.data;
		} catch (error) {
			console.error("Error updating security settings:", error);
			throw error;
		}
	},

	// Terminal Locations
	getLocations: async (sync = false) => {
		try {
			const url = sync
				? "settings/terminal/locations/?sync=true"
				: "settings/terminal/locations/";
			const response = await axiosInstance.get(url);
			return response.data;
		} catch (error) {
			console.error("Error fetching terminal locations:", error);
			throw error;
		}
	},

	syncLocations: async () => {
		try {
			const response = await axiosInstance.post(
				"settings/terminal/locations/sync/"
			);
			return response.data;
		} catch (error) {
			console.error("Error syncing terminal locations:", error);
			throw error;
		}
	},

	createLocation: async (locationData) => {
		try {
			const response = await axiosInstance.post(
				"settings/terminal/locations/",
				locationData
			);
			return response.data;
		} catch (error) {
			console.error("Error creating terminal location:", error);
			throw error;
		}
	},

	updateLocation: async (locationId, locationData) => {
		try {
			const response = await axiosInstance.put(
				`settings/terminal/locations/${locationId}/`,
				locationData
			);
			return response.data;
		} catch (error) {
			console.error(`Error updating terminal location #${locationId}:`, error);
			throw error;
		}
	},

	deleteLocation: async (locationId) => {
		try {
			const response = await axiosInstance.delete(
				`settings/terminal/locations/${locationId}/`
			);
			return response.data;
		} catch (error) {
			console.error(`Error deleting terminal location #${locationId}:`, error);
			throw error;
		}
	},

	// Terminal Readers
	getTerminalReaders: async (sync = false) => {
		try {
			const url = sync
				? "settings/terminal/readers/?sync=true"
				: "settings/terminal/readers/";
			const response = await axiosInstance.get(url);
			return response.data;
		} catch (error) {
			console.error("Error fetching terminal readers:", error);
			throw error;
		}
	},

	syncReaders: async () => {
		try {
			const response = await axiosInstance.post(
				"settings/terminal/readers/sync/"
			);
			return response.data;
		} catch (error) {
			console.error("Error syncing terminal readers:", error);
			throw error;
		}
	},

	registerTerminalReader: async (readerData) => {
		try {
			if (
				!readerData.location ||
				!readerData.label ||
				!readerData.registration_code
			) {
				throw new Error(
					"Missing required fields: location, label, and registration_code are required"
				);
			}

			const response = await axiosInstance.post(
				"settings/terminal/readers/",
				readerData
			);
			return response.data;
		} catch (error) {
			console.error("Error registering terminal reader:", error);
			throw error;
		}
	},
};
