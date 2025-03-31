// src/pages/rewards/RewardsDashboard.jsx - Updated version
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { rewardsService } from "../../api/services/rewardsService";
import { useApi } from "../../api/hooks/useApi";
import {
	ChevronRightIcon,
	GiftIcon,
	ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import { toast } from "react-toastify";

export default function RewardsDashboard() {
	const [summaryStats, setSummaryStats] = useState({
		totalCustomers: 0,
		totalPointsIssued: 0,
		activeRewards: 0,
	});

	const { execute, isLoading } = useApi();

	// Get summary statistics
	useEffect(() => {
		const fetchSummaryStats = async () => {
			try {
				// Using Promise.all to fetch data in parallel
				const [profilesResponse, rewardsResponse] = await Promise.all([
					execute(() => rewardsService.getAllProfiles()),
					execute(() => rewardsService.getRewards()),
				]);

				// Safely handle the responses
				const profiles = Array.isArray(profilesResponse)
					? profilesResponse
					: [];
				const rewards = Array.isArray(rewardsResponse) ? rewardsResponse : [];

				// Calculate the total points issued
				const totalPoints = profiles.reduce(
					(sum, profile) => sum + (profile.lifetime_points || 0),
					0
				);

				// Count active rewards
				const activeRewardsCount = rewards.filter(
					(reward) => reward && reward.is_active
				).length;

				// Update the state with the calculated values
				setSummaryStats({
					totalCustomers: profiles.length,
					totalPointsIssued: totalPoints,
					activeRewards: activeRewardsCount,
				});
			} catch (error) {
				console.error("Error fetching rewards summary stats:", error);
				toast.error("Failed to load rewards statistics");

				// Ensure state has valid values even in case of error
				setSummaryStats({
					totalCustomers: 0,
					totalPointsIssued: 0,
					activeRewards: 0,
				});
			}
		};

		fetchSummaryStats();
	}, [execute]);

	if (
		isLoading &&
		!summaryStats.totalCustomers &&
		!summaryStats.activeRewards
	) {
		return (
			<div className="w-screen h-screen flex items-center justify-center bg-slate-50">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-slate-800">
					Rewards Program Management
				</h1>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
					onClick={() => (window.location.href = "/dashboard")}
				>
					<ArrowLeftIcon className="h-5 w-5" />
					Back to Dashboard
				</button>
			</div>

			{/* Stats Summary */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex items-center">
						<div className="p-3 rounded-full bg-blue-100 text-blue-600">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
						<div className="ml-4">
							<h3 className="text-gray-500 text-sm">Total Members</h3>
							<p className="text-2xl font-semibold">
								{summaryStats.totalCustomers}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex items-center">
						<div className="p-3 rounded-full bg-green-100 text-green-600">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div className="ml-4">
							<h3 className="text-gray-500 text-sm">Total Points Issued</h3>
							<p className="text-2xl font-semibold">
								{summaryStats.totalPointsIssued.toLocaleString()}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex items-center">
						<div className="p-3 rounded-full bg-purple-100 text-purple-600">
							<GiftIcon className="h-8 w-8" />
						</div>
						<div className="ml-4">
							<h3 className="text-gray-500 text-sm">Active Rewards</h3>
							<p className="text-2xl font-semibold">
								{summaryStats.activeRewards}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Quick Access Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
				<Link
					to="/rewards/reward-items"
					className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
				>
					<div className="flex justify-between items-center">
						<div>
							<h3 className="text-lg font-semibold mb-2">Reward Items</h3>
							<p className="text-gray-600">
								Create and manage available rewards
							</p>
						</div>
						<ChevronRightIcon className="h-6 w-6 text-gray-400" />
					</div>
				</Link>

				<Link
					to="/rewards/rules"
					className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
				>
					<div className="flex justify-between items-center">
						<div>
							<h3 className="text-lg font-semibold mb-2">Points Rules</h3>
							<p className="text-gray-600">
								Configure how points are earned and redeemed
							</p>
						</div>
						<ChevronRightIcon className="h-6 w-6 text-gray-400" />
					</div>
				</Link>

				<Link
					to="/rewards/verify"
					className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
				>
					<div className="flex justify-between items-center">
						<div>
							<h3 className="text-lg font-semibold mb-2">Verify Redemption</h3>
							<p className="text-gray-600">
								Verify and process reward redemption codes
							</p>
						</div>
						<ChevronRightIcon className="h-6 w-6 text-gray-400" />
					</div>
				</Link>
			</div>
		</div>
	);
}
