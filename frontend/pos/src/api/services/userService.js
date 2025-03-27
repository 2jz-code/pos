// src/api/services/userService.js
import axiosInstance from "../config/axiosConfig";

export const userService = {
	// Get all users
	getUsers: async () => {
		try {
			const response = await axiosInstance.get("auth/users/");
			return response.data;
		} catch (error) {
			console.error("Error fetching users:", error);
			throw error;
		}
	},

	// Get a single user by ID
	getUserById: async (userId) => {
		try {
			const response = await axiosInstance.get(`auth/users/${userId}/`);
			return response.data;
		} catch (error) {
			console.error(`Error fetching user #${userId}:`, error);
			throw error;
		}
	},

	// Create a new user
	createUser: async (userData) => {
		try {
			const response = await axiosInstance.post("auth/register/", userData);
			return response.data;
		} catch (error) {
			console.error("Error creating user:", error);
			throw error;
		}
	},

	// Update a user
	updateUser: async (userId, userData) => {
		try {
			const response = await axiosInstance.put(
				`auth/users/${userId}/update/`,
				userData
			);
			return response.data;
		} catch (error) {
			console.error(`Error updating user #${userId}:`, error);
			throw error;
		}
	},

	// Delete a user
	deleteUser: async (userId) => {
		try {
			const response = await axiosInstance.delete(
				`auth/users/${userId}/delete/`
			);
			return response.data;
		} catch (error) {
			console.error(`Error deleting user #${userId}:`, error);
			throw error;
		}
	},
};
