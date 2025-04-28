import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types"; // Import PropTypes
import { rewardsService } from "../../api/services/rewardsService";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	ChevronRightIcon,
	GiftIcon, // Keep GiftIcon
	UsersIcon, // For Total Members
	StarIcon, // For Total Points
	Bars3Icon, // For Dashboard button
	ArrowPathIcon, // For Retry
	ExclamationTriangleIcon, // For Error
	Cog8ToothIcon, // For Rules
	QrCodeIcon, // For Verify
	ListBulletIcon, // For Reward Items list
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";

// Stat Card Component (similar to DiscountList)
const StatCard = ({ title, value, icon: Icon, color = "gray" }) => {
	const colors = {
		blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
		green: {
			bg: "bg-emerald-50",
			text: "text-emerald-600",
			iconBg: "bg-emerald-100",
		},
		purple: {
			bg: "bg-purple-50",
			text: "text-purple-600",
			iconBg: "bg-purple-100",
		},
		slate: {
			bg: "bg-slate-50",
			text: "text-slate-600",
			iconBg: "bg-slate-100",
		},
	};
	const selectedColor = colors[color] || colors.slate;

	return (
		<div
			className={`flex items-center rounded-lg border border-slate-200 ${selectedColor.bg} p-4 shadow-sm`}
		>
			<div
				className={`mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${selectedColor.iconBg} ${selectedColor.text}`}
			>
				<Icon className="h-5 w-5" />
			</div>
			<div>
				<dt className="truncate text-xs font-medium text-slate-500">{title}</dt>
				<dd className="text-xl font-semibold text-slate-800">{value}</dd>
			</div>
		</div>
	);
};
StatCard.propTypes = {
	title: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	icon: PropTypes.elementType.isRequired,
	color: PropTypes.string,
};

// Navigation Card Component
const NavCard = ({ to, title, description, icon: Icon }) => (
	<Link
		to={to}
		className="group block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
	>
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-3">
				<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
					<Icon className="h-5 w-5" />
				</div>
				<h3 className="text-base font-semibold text-slate-800">{title}</h3>
			</div>
			<ChevronRightIcon className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-focus:translate-x-1" />
		</div>
		<p className="mt-2 text-sm text-slate-600">{description}</p>
	</Link>
);
NavCard.propTypes = {
	to: PropTypes.string.isRequired,
	title: PropTypes.string.isRequired,
	description: PropTypes.string.isRequired,
	icon: PropTypes.elementType.isRequired,
};

export default function RewardsDashboard() {
	const [summaryStats, setSummaryStats] = useState({
		totalCustomers: 0,
		totalPointsIssued: 0,
		activeRewards: 0,
	});
	const navigate = useNavigate();
	// eslint-disable-next-line no-unused-vars
	const { execute, isLoading, error } = useApi(); // Use error state from hook
	const [fetchError, setFetchError] = useState(null); // Local state for fetch-specific errors

	// Fetch summary statistics
	const fetchData = useCallback(async () => {
		setFetchError(null); // Clear previous errors
		try {
			const [profilesResponse, rewardsResponse] = await Promise.all([
				execute(() => rewardsService.getAllProfiles()),
				execute(() => rewardsService.getRewards()),
			]);

			const profiles = Array.isArray(profilesResponse) ? profilesResponse : [];
			const rewards = Array.isArray(rewardsResponse) ? rewardsResponse : [];

			const totalPoints = profiles.reduce(
				(sum, profile) => sum + (profile.lifetime_points || 0),
				0
			);
			const activeRewardsCount = rewards.filter(
				(reward) => reward?.is_active
			).length;

			setSummaryStats({
				totalCustomers: profiles.length,
				totalPointsIssued: totalPoints,
				activeRewards: activeRewardsCount,
			});
		} catch (err) {
			// Error might be caught by useApi hook already, but set local state too
			console.error("Error fetching rewards summary stats:", err);
			const message =
				err.message || "Failed to load rewards statistics. Please try again.";
			setFetchError(message);
			toast.error(message); // Show toast notification
			setSummaryStats({
				totalCustomers: 0,
				totalPointsIssued: 0,
				activeRewards: 0,
			}); // Reset stats
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [execute]); // execute is stable

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Loading state: Show spinner only on initial load when stats are zero
	const showLoadingSpinner =
		isLoading &&
		summaryStats.totalCustomers === 0 &&
		summaryStats.activeRewards === 0 &&
		!fetchError;

	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 p-4 text-slate-900 sm:p-6">
			{/* Header Section */}
			<header className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 sm:text-2xl">
					<GiftIcon className="h-6 w-6 text-purple-600" /> {/* Updated Icon */}
					Rewards Management
				</h1>
				<button
					className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					onClick={() => navigate("/dashboard")}
				>
					<Bars3Icon className="h-4 w-4" />
					<span className="hidden sm:inline">Dashboard</span>
				</button>
			</header>

			{/* Main Content Area */}
			<div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pb-6">
				{/* Loading State */}
				{showLoadingSpinner && (
					<div className="flex items-center justify-center py-10">
						<LoadingSpinner size="md" />
					</div>
				)}

				{/* Error State */}
				{fetchError && !isLoading && (
					<div className="rounded-md border border-red-200 bg-red-50 p-4">
						<div className="flex items-center">
							<ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
							<div className="flex-1">
								<p className="text-sm font-medium text-red-700">
									Error Loading Data
								</p>
								<p className="text-xs text-red-600 mt-1">{fetchError}</p>
								<button
									onClick={fetchData}
									disabled={isLoading}
									className="mt-2 flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
								>
									<ArrowPathIcon className="h-3 w-3" /> Retry
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Content visible when not initial loading or on error */}
				{!showLoadingSpinner && !fetchError && (
					<>
						{/* Stats Summary */}
						<section aria-labelledby="stats-heading">
							<h2
								id="stats-heading"
								className="sr-only"
							>
								Statistics
							</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<StatCard
									title="Total Members"
									value={summaryStats.totalCustomers.toLocaleString()}
									icon={UsersIcon}
									color="blue"
								/>
								<StatCard
									title="Total Points Issued"
									value={summaryStats.totalPointsIssued.toLocaleString()}
									icon={StarIcon}
									color="green"
								/>
								<StatCard
									title="Active Reward Items"
									value={summaryStats.activeRewards.toLocaleString()}
									icon={GiftIcon}
									color="purple"
								/>
							</div>
						</section>

						{/* Quick Access Cards */}
						<section aria-labelledby="actions-heading">
							<h2
								id="actions-heading"
								className="text-base font-semibold text-slate-700 mb-3"
							>
								Quick Actions
							</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<NavCard
									to="/rewards/reward-items"
									title="Manage Reward Items"
									description="Create, edit, and manage available rewards customers can redeem."
									icon={ListBulletIcon}
								/>
								<NavCard
									to="/rewards/rules"
									title="Configure Points Rules"
									description="Set up how customers earn points (e.g., per dollar spent)."
									icon={Cog8ToothIcon}
								/>
								<NavCard
									to="/rewards/verify"
									title="Verify Redemption"
									description="Verify and mark reward redemption codes as used."
									icon={QrCodeIcon}
								/>
							</div>
						</section>
					</>
				)}
			</div>
		</div>
	);
}
