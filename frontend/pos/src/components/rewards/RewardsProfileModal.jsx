// src/components/rewards/RewardsProfileModal.jsx
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
	XMarkIcon,
	GiftIcon,
	ClockIcon,
	UserMinusIcon,
} from "@heroicons/react/24/outline";
import { rewardsService } from "../../api/services/rewardsService";

const RewardsProfileModal = ({ profile, onClose, onRemoveProfile }) => {
	const [isLoading, setIsLoading] = useState(false);
	const [availableRewards, setAvailableRewards] = useState([]);
	const [transactions, setTransactions] = useState([]);
	const [activeTab, setActiveTab] = useState("profile");

	useEffect(() => {
		const fetchRewardsData = async () => {
			setIsLoading(true);
			try {
				// Fetch available rewards
				const rewards = await rewardsService.getRewards();
				setAvailableRewards(
					rewards.filter(
						(reward) => reward.points_required <= profile.points_balance
					)
				);

				// Optionally fetch transaction history if API supports it
				if (profile.id) {
					try {
						const txHistory = await rewardsService.getProfileTransactions(
							profile.id
						);
						setTransactions(txHistory);
					} catch (err) {
						console.error("Could not fetch transaction history:", err);
					}
				}
			} catch (error) {
				console.error("Error fetching rewards data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchRewardsData();
	}, [profile.id, profile.points_balance]);

	// Calculate tier progress
	const getTierProgress = () => {
		const tiers = {
			bronze: { min: 0, max: 1000 },
			silver: { min: 1000, max: 5000 },
			gold: { min: 5000, max: 10000 },
			platinum: { min: 10000, max: 10000 },
		};

		const currentTier = profile.tier.toLowerCase();
		const nextTier =
			currentTier === "bronze"
				? "silver"
				: currentTier === "silver"
				? "gold"
				: currentTier === "gold"
				? "platinum"
				: null;

		if (!nextTier) return { progress: 100, nextTier: null, pointsNeeded: 0 };

		const currentMin = tiers[currentTier].min;
		const nextMin = tiers[nextTier].min;
		const range = nextMin - currentMin;
		const progress = Math.min(
			100,
			Math.floor(((profile.lifetime_points - currentMin) / range) * 100)
		);
		const pointsNeeded = nextMin - profile.lifetime_points;

		return { progress, nextTier, pointsNeeded };
	};

	const tierProgress = getTierProgress();

	return (
		<div className="fixed inset-0 bg-white/80 bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden">
				{/* Loading overlay */}
				{isLoading && (
					<div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
					</div>
				)}

				{/* Header with tier-specific gradient */}
				<div
					className={`p-6 text-black relative`}
					style={{
						background:
							profile.tier.toLowerCase() === "bronze"
								? "linear-gradient(135deg, #cd7f32, #b06a20)"
								: profile.tier.toLowerCase() === "silver"
								? "linear-gradient(135deg, #c0c0c0, #9e9e9e)"
								: profile.tier.toLowerCase() === "gold"
								? "linear-gradient(135deg, #ffd700, #e6bc00)"
								: "linear-gradient(135deg, #e5e4e2, #9d9d9c)",
					}}
				>
					<div className="absolute top-4 right-4 flex items-center space-x-2">
						{/* Add Remove Member button */}
						{onRemoveProfile && (
							<button
								onClick={() => {
									onRemoveProfile();
									onClose();
								}}
								className="text-white hover:text-red-200 transition-colors flex items-center"
								title="Remove member from order"
							>
								<UserMinusIcon className="h-5 w-5" />
							</button>
						)}

						{/* Close button */}
						<button
							onClick={onClose}
							className="text-white hover:text-gray-200 transition-colors"
						>
							<XMarkIcon className="h-6 w-6" />
						</button>
					</div>

					<h2 className="text-2xl font-bold">
						{profile.first_name} {profile.last_name}
					</h2>
					<div className="flex items-center mt-1">
						<span className="text-sm font-medium bg-white bg-opacity-20 px-2 py-0.5 rounded">
							{profile.tier.toUpperCase()} TIER
						</span>
						<span className="ml-2 text-sm">
							{profile.points_balance} points available
						</span>
					</div>
				</div>

				{/* Tabs */}
				<div className="flex border-b">
					<button
						className={`flex-1 py-3 font-medium text-center ${
							activeTab === "profile"
								? "text-blue-600 border-b-2 border-blue-600"
								: "text-gray-500 hover:text-gray-700"
						}`}
						onClick={() => setActiveTab("profile")}
					>
						Profile
					</button>
					<button
						className={`flex-1 py-3 font-medium text-center ${
							activeTab === "rewards"
								? "text-blue-600 border-b-2 border-blue-600"
								: "text-gray-500 hover:text-gray-700"
						}`}
						onClick={() => setActiveTab("rewards")}
					>
						Rewards
					</button>
					<button
						className={`flex-1 py-3 font-medium text-center ${
							activeTab === "history"
								? "text-blue-600 border-b-2 border-blue-600"
								: "text-gray-500 hover:text-gray-700"
						}`}
						onClick={() => setActiveTab("history")}
					>
						History
					</button>
				</div>

				{/* Tab Content */}
				<div className="p-6 max-h-96 overflow-y-auto">
					{/* Profile Tab */}
					{activeTab === "profile" && (
						<div className="space-y-6">
							<div>
								<h3 className="text-lg font-semibold text-gray-800">
									Membership Details
								</h3>
								<div className="mt-2 space-y-2">
									<div className="flex justify-between">
										<span className="text-gray-600">Member since:</span>
										<span className="font-medium">
											{new Date(profile.created_at).toLocaleDateString()}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Points balance:</span>
										<span className="font-medium">
											{profile.points_balance}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Lifetime points:</span>
										<span className="font-medium">
											{profile.lifetime_points}
										</span>
									</div>
								</div>
							</div>

							{/* Tier Progress */}
							{tierProgress.nextTier && (
								<div>
									<div className="flex justify-between items-center">
										<h3 className="text-lg font-semibold text-gray-800">
											Tier Progress
										</h3>
										<span className="text-sm text-gray-500">
											{tierProgress.pointsNeeded} points to{" "}
											{tierProgress.nextTier}
										</span>
									</div>
									<div className="mt-2 bg-gray-200 rounded-full h-2.5">
										<div
											className="h-2.5 rounded-full"
											style={{
												width: `${tierProgress.progress}%`,
												background:
													profile.tier.toLowerCase() === "bronze"
														? "#cd7f32"
														: profile.tier.toLowerCase() === "silver"
														? "#c0c0c0"
														: profile.tier.toLowerCase() === "gold"
														? "#ffd700"
														: "#e5e4e2",
											}}
										></div>
									</div>
								</div>
							)}

							{/* Tier Benefits */}
							<div>
								<h3 className="text-lg font-semibold text-gray-800">
									{profile.tier.toUpperCase()} Tier Benefits
								</h3>
								<ul className="mt-2 space-y-2">
									{profile.tier.toLowerCase() === "bronze" && (
										<>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Earn 1 point per dollar spent</span>
											</li>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Birthday reward (free item)</span>
											</li>
										</>
									)}
									{profile.tier.toLowerCase() === "silver" && (
										<>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Earn 1.1× points per dollar spent</span>
											</li>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Birthday reward (free item)</span>
											</li>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Exclusive silver member promotions</span>
											</li>
										</>
									)}
									{profile.tier.toLowerCase() === "gold" && (
										<>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Earn 1.25× points per dollar spent</span>
											</li>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Birthday reward (free item)</span>
											</li>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Exclusive gold member promotions</span>
											</li>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Free size upgrade on drinks</span>
											</li>
										</>
									)}
									{profile.tier.toLowerCase() === "platinum" && (
										<>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Earn 1.5× points per dollar spent</span>
											</li>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Birthday reward (free item)</span>
											</li>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Exclusive platinum member promotions</span>
											</li>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Free size upgrade on drinks</span>
											</li>
											<li className="flex items-start">
												<span className="text-blue-500 mr-2">•</span>
												<span>Priority service</span>
											</li>
										</>
									)}
								</ul>
							</div>
						</div>
					)}

					{/* Rewards Tab */}
					{activeTab === "rewards" && (
						<div>
							<h3 className="text-lg font-semibold text-gray-800 mb-4">
								Available Rewards
							</h3>

							{availableRewards.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<GiftIcon className="h-12 w-12 mx-auto text-gray-400" />
									<p className="mt-2">No rewards available yet</p>
									<p className="text-sm">Earn more points to unlock rewards!</p>
								</div>
							) : (
								<div className="space-y-4">
									{availableRewards.map((reward) => (
										<div
											key={reward.id}
											className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
										>
											<div className="flex justify-between">
												<h4 className="font-medium text-gray-800">
													{reward.name}
												</h4>
												<span className="text-blue-600 font-medium">
													{reward.points_required} pts
												</span>
											</div>
											<p className="text-gray-600 text-sm mt-1">
												{reward.description}
											</p>
											<button className="mt-3 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors">
												Redeem Reward
											</button>
										</div>
									))}
								</div>
							)}

							{/* Upcoming Rewards */}
							<h3 className="text-lg font-semibold text-gray-800 mt-6 mb-4">
								Upcoming Rewards
							</h3>
							<div className="space-y-4 opacity-70">
								{/* Show rewards that the user doesn't have enough points for */}
								{availableRewards.length === 0 ? (
									<div className="text-center py-4 text-gray-500">
										<p>Keep earning points to unlock exciting rewards!</p>
									</div>
								) : (
									<div className="border border-gray-200 rounded-lg p-4">
										<div className="flex justify-between">
											<h4 className="font-medium text-gray-800">
												Free Drink Reward
											</h4>
											<span className="text-blue-600 font-medium">500 pts</span>
										</div>
										<p className="text-gray-600 text-sm mt-1">
											Get any drink of your choice for free
										</p>
										<div className="mt-3 bg-gray-200 rounded-full h-2">
											<div
												className="bg-blue-600 h-2 rounded-full"
												style={{
													width: `${Math.min(
														100,
														(profile.points_balance / 500) * 100
													)}%`,
												}}
											></div>
										</div>
										<p className="text-xs text-gray-500 text-right mt-1">
											{Math.max(0, 500 - profile.points_balance)} points to go
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* History Tab */}
					{activeTab === "history" && (
						<div>
							<h3 className="text-lg font-semibold text-gray-800 mb-4">
								Points History
							</h3>

							{transactions.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<ClockIcon className="h-12 w-12 mx-auto text-gray-400" />
									<p className="mt-2">No transaction history yet</p>
									<p className="text-sm">
										Your points activity will appear here
									</p>
								</div>
							) : (
								<div className="space-y-3">
									{transactions.map((transaction) => (
										<div
											key={transaction.id}
											className="border-b border-gray-100 py-3 flex justify-between items-center"
										>
											<div>
												<p className="font-medium text-gray-800">
													{transaction.transaction_type === "earn"
														? "Earned Points"
														: "Redeemed Points"}
												</p>
												<p className="text-sm text-gray-600">
													{transaction.reference}
												</p>
												<p className="text-xs text-gray-500">
													{new Date(
														transaction.created_at
													).toLocaleDateString()}{" "}
													at
													{" " +
														new Date(
															transaction.created_at
														).toLocaleTimeString()}
												</p>
											</div>
											<span
												className={`font-medium ${
													transaction.transaction_type === "earn"
														? "text-green-600"
														: "text-red-600"
												}`}
											>
												{transaction.transaction_type === "earn" ? "+" : "-"}
												{Math.abs(transaction.points)}
											</span>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

RewardsProfileModal.propTypes = {
	profile: PropTypes.shape({
		id: PropTypes.number,
		first_name: PropTypes.string,
		last_name: PropTypes.string,
		points_balance: PropTypes.number,
		lifetime_points: PropTypes.number,
		tier: PropTypes.string,
		created_at: PropTypes.string,
	}).isRequired,
	onClose: PropTypes.func.isRequired,
	onRemoveProfile: PropTypes.func.isRequired,
};

export default RewardsProfileModal;
