// src/api/services/rewardsService.js
import axiosInstance from "../config/axiosConfig";
import { ENDPOINTS } from "../config/apiEndpoints";

export const rewardsService = {
	// Get all rewards profiles (admin)
	getAllProfiles: async () => {
		try {
			const response = await axiosInstance.get(ENDPOINTS.REWARDS.PROFILES.LIST);
			return Array.isArray(response.data) ? response.data : [];
		} catch (error) {
			console.error("Error fetching rewards profiles:", error);
			return [];
		}
	},

	// Get a specific profile
	getProfile: async (profileId) => {
		try {
			const response = await axiosInstance.get(
				ENDPOINTS.REWARDS.PROFILES.DETAIL(profileId)
			);
			return response.data;
		} catch (error) {
			console.error(`Error fetching rewards profile #${profileId}:`, error);
			throw error;
		}
	},

	// Find rewards profile by user ID
	getProfileByUserId: async (userId) => {
		try {
			const response = await axiosInstance.get(
				ENDPOINTS.REWARDS.PROFILES.BY_USER(userId)
			);
			return response.data;
		} catch (error) {
			console.error(
				`Error fetching rewards profile for user #${userId}:`,
				error
			);
			throw error;
		}
	},

	// Adjust points for a profile
	adjustPoints: async (profileId, pointsData) => {
		try {
			const response = await axiosInstance.post(
				ENDPOINTS.REWARDS.PROFILES.ADJUST_POINTS(profileId),
				pointsData
			);
			return response.data;
		} catch (error) {
			console.error(`Error adjusting points for profile #${profileId}:`, error);
			throw error;
		}
	},

	// Get all rewards
	getRewards: async () => {
		try {
			const response = await axiosInstance.get(ENDPOINTS.REWARDS.REWARDS.LIST);
			return Array.isArray(response.data) ? response.data : [];
		} catch (error) {
			console.error("Error fetching rewards:", error);
			return [];
		}
	},

	// Create a new reward
	createReward: async (rewardData) => {
		try {
			const response = await axiosInstance.post(
				ENDPOINTS.REWARDS.REWARDS.LIST,
				rewardData
			);
			return response.data;
		} catch (error) {
			console.error("Error creating reward:", error);
			throw error;
		}
	},

	// Update a reward
	updateReward: async (rewardId, rewardData) => {
		try {
			const response = await axiosInstance.put(
				ENDPOINTS.REWARDS.REWARDS.DETAIL(rewardId),
				rewardData
			);
			return response.data;
		} catch (error) {
			console.error(`Error updating reward #${rewardId}:`, error);
			throw error;
		}
	},

	// Delete a reward
	deleteReward: async (rewardId) => {
		try {
			const response = await axiosInstance.delete(
				ENDPOINTS.REWARDS.REWARDS.DETAIL(rewardId)
			);
			return response.data;
		} catch (error) {
			console.error(`Error deleting reward #${rewardId}:`, error);
			throw error;
		}
	},

	// Get all points rules
	getPointsRules: async () => {
		try {
			const response = await axiosInstance.get(ENDPOINTS.REWARDS.RULES.LIST);
			return response.data;
		} catch (error) {
			console.error("Error fetching points rules:", error);
			return [];
		}
	},

	// Create a new points rule
	createPointsRule: async (ruleData) => {
		try {
			const response = await axiosInstance.post(
				ENDPOINTS.REWARDS.RULES.LIST,
				ruleData
			);
			return response.data;
		} catch (error) {
			console.error("Error creating points rule:", error);
			throw error;
		}
	},

	// Update a points rule
	updatePointsRule: async (ruleId, ruleData) => {
		try {
			const response = await axiosInstance.put(
				ENDPOINTS.REWARDS.RULES.DETAIL(ruleId),
				ruleData
			);
			return response.data;
		} catch (error) {
			console.error(`Error updating points rule #${ruleId}:`, error);
			throw error;
		}
	},

	// Delete a points rule
	deletePointsRule: async (ruleId) => {
		try {
			const response = await axiosInstance.delete(
				ENDPOINTS.REWARDS.RULES.DETAIL(ruleId)
			);
			return response.data;
		} catch (error) {
			console.error(`Error deleting points rule #${ruleId}:`, error);
			throw error;
		}
	},

	// Verify a redemption code
	verifyRedemptionCode: async (code) => {
		try {
			const response = await axiosInstance.post(ENDPOINTS.REWARDS.VERIFY_CODE, {
				code,
			});
			return response.data;
		} catch (error) {
			console.error("Error verifying redemption code:", error);
			throw error;
		}
	},

	// Get transactions for a profile
	getProfileTransactions: async (profileId) => {
		try {
			const response = await axiosInstance.get(
				ENDPOINTS.REWARDS.PROFILES.TRANSACTIONS(profileId)
			);
			return response.data;
		} catch (error) {
			console.error(
				`Error fetching transactions for profile #${profileId}:`,
				error
			);
			throw error;
		}
	},

	// Get redemptions for a profile
	getProfileRedemptions: async (profileId) => {
		try {
			const response = await axiosInstance.get(
				ENDPOINTS.REWARDS.PROFILES.REDEMPTIONS(profileId)
			);
			return response.data;
		} catch (error) {
			console.error(
				`Error fetching redemptions for profile #${profileId}:`,
				error
			);
			throw error;
		}
	},

	findProfileByPhone: async (phoneNumber) => {
		try {
			const response = await axiosInstance.get(
				`rewards/profiles/by-phone/${phoneNumber}/`
			);
			return response.data;
		} catch (error) {
			console.error(`Error finding rewards profile by phone:`, error);
			throw error;
		}
	},

	// Register a new rewards member
	registerRewardsMember: async (memberData) => {
		try {
			const response = await axiosInstance.post(
				"rewards/profiles/register/",
				memberData
			);
			return response.data;
		} catch (error) {
			console.error("Error registering rewards member:", error);
			throw error;
		}
	},
};
