// src/pages/rewards/RewardItems.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { rewardsService } from "../../api/services/rewardsService";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	ArrowLeftIcon,
	PlusIcon,
	PencilIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import ConfirmationModal from "../../components/ConfirmationModal";

export default function RewardItems() {
	const navigate = useNavigate();
	const { execute, isLoading } = useApi();

	const [rewards, setRewards] = useState([]);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentReward, setCurrentReward] = useState(null);
	const [rewardForm, setRewardForm] = useState({
		name: "",
		description: "",
		points_required: 0,
		is_active: true,
		discount_type: "",
		discount_value: 0,
		free_product: false,
		product_id: null,
	});

	// Fetch rewards
	useEffect(() => {
		const fetchRewards = async () => {
			try {
				const data = await execute(() => rewardsService.getRewards());
				// Ensure data is an array before setting state
				setRewards(Array.isArray(data) ? data : []);
			} catch (error) {
				console.error("Error fetching rewards:", error);
				toast.error("Failed to load rewards");
				// Ensure rewards is an empty array in case of error
				setRewards([]);
			}
		};

		fetchRewards();
	}, [execute]);

	const handleAddReward = () => {
		setRewardForm({
			name: "",
			description: "",
			points_required: 0,
			is_active: true,
			discount_type: "",
			discount_value: 0,
			free_product: false,
			product_id: null,
		});
		setShowAddModal(true);
	};

	const handleEditReward = (reward) => {
		if (!reward) return;

		setCurrentReward(reward);
		setRewardForm({
			name: reward.name || "",
			description: reward.description || "",
			points_required: reward.points_required || 0,
			is_active: Boolean(reward.is_active),
			discount_type: reward.discount_type || "",
			discount_value: reward.discount_value || 0,
			free_product: Boolean(reward.free_product),
			product_id: reward.product_id || null,
		});
		setShowEditModal(true);
	};

	const handleDeleteReward = (reward) => {
		if (!reward) return;

		setCurrentReward(reward);
		setShowDeleteModal(true);
	};

	const handleFormChange = (e) => {
		const { name, value, type, checked } = e.target;

		if (type === "checkbox") {
			setRewardForm((prev) => ({
				...prev,
				[name]: checked,
			}));
		} else if (
			name === "points_required" ||
			name === "discount_value" ||
			name === "product_id"
		) {
			setRewardForm((prev) => ({
				...prev,
				[name]: value === "" ? null : Number(value),
			}));
		} else {
			setRewardForm((prev) => ({
				...prev,
				[name]: value,
			}));
		}
	};

	const handleSubmitAdd = async (e) => {
		e.preventDefault();

		try {
			const newReward = await execute(
				() => rewardsService.createReward(rewardForm),
				{ successMessage: "Reward created successfully" }
			);

			if (newReward) {
				setRewards([...rewards, newReward]);
			}
			setShowAddModal(false);
		} catch (error) {
			console.error("Error creating reward:", error);
		}
	};

	const handleSubmitEdit = async (e) => {
		e.preventDefault();

		if (!currentReward || !currentReward.id) {
			toast.error("Invalid reward selected for editing");
			return;
		}

		try {
			const updatedReward = await execute(
				() => rewardsService.updateReward(currentReward.id, rewardForm),
				{ successMessage: "Reward updated successfully" }
			);

			if (updatedReward) {
				setRewards(
					rewards.map((r) => (r.id === currentReward.id ? updatedReward : r))
				);
			}
			setShowEditModal(false);
		} catch (error) {
			console.error("Error updating reward:", error);
		}
	};

	const handleConfirmDelete = async () => {
		if (!currentReward || !currentReward.id) {
			toast.error("Invalid reward selected for deletion");
			return;
		}

		try {
			await execute(() => rewardsService.deleteReward(currentReward.id), {
				successMessage: "Reward deleted successfully",
			});

			setRewards(rewards.filter((r) => r.id !== currentReward.id));
			setShowDeleteModal(false);
		} catch (error) {
			console.error("Error deleting reward:", error);
		}
	};

	// Display loading spinner if loading and no rewards yet
	if (isLoading && (!rewards || rewards.length === 0)) {
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
				<h1 className="text-2xl font-bold text-slate-800">Reward Items</h1>
				<div className="flex space-x-4">
					<button
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
						onClick={handleAddReward}
					>
						<PlusIcon className="h-5 w-5" />
						Add Reward
					</button>
					<button
						className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
						onClick={() => navigate("/rewards")}
					>
						<ArrowLeftIcon className="h-5 w-5" />
						Back to Rewards
					</button>
				</div>
			</div>

			{/* Rewards List */}
			<div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-200">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Reward Name
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Points Required
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Type
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Value
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-slate-200">
							{!rewards || rewards.length === 0 ? (
								<tr>
									<td
										colSpan="6"
										className="px-6 py-4 text-center text-slate-500"
									>
										No rewards found. Create your first reward!
									</td>
								</tr>
							) : (
								rewards.map((reward) => (
									<tr
										key={reward.id || Math.random()}
										className="hover:bg-slate-50"
									>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
											{reward.name || ""}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{reward.points_required || 0}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{reward.free_product
												? "Free Product"
												: reward.discount_type === "percentage"
												? "Discount %"
												: reward.discount_type === "fixed"
												? "Fixed Discount"
												: "N/A"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{reward.free_product
												? reward.product_id
													? `Product #${reward.product_id}`
													: "Any Product"
												: reward.discount_type === "percentage"
												? `${reward.discount_value || 0}%`
												: reward.discount_type === "fixed"
												? `$${(reward.discount_value || 0).toFixed(2)}`
												: "N/A"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													reward.is_active
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{reward.is_active ? "ACTIVE" : "INACTIVE"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-right">
											<button
												onClick={() => handleEditReward(reward)}
												className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors mr-2"
											>
												<PencilIcon className="h-4 w-4 inline" />
											</button>
											<button
												onClick={() => handleDeleteReward(reward)}
												className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-colors"
											>
												<TrashIcon className="h-4 w-4 inline" />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Add Reward Modal */}
			{showAddModal && (
				<div className="fixed inset-0 bg-white/80 bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
						<div className="p-6">
							<h2 className="text-xl font-semibold mb-4">Add New Reward</h2>
							<form onSubmit={handleSubmitAdd}>
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Reward Name
										</label>
										<input
											type="text"
											name="name"
											value={rewardForm.name}
											onChange={handleFormChange}
											className="w-full px-3 py-2 border border-gray-300 rounded-md"
											required
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Description
										</label>
										<textarea
											name="description"
											value={rewardForm.description}
											onChange={handleFormChange}
											className="w-full px-3 py-2 border border-gray-300 rounded-md"
											rows="3"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Points Required
										</label>
										<input
											type="number"
											name="points_required"
											value={rewardForm.points_required || 0}
											onChange={handleFormChange}
											className="w-full px-3 py-2 border border-gray-300 rounded-md"
											required
											min="0"
										/>
									</div>

									<div className="flex items-center">
										<input
											type="checkbox"
											name="is_active"
											checked={rewardForm.is_active}
											onChange={handleFormChange}
											className="h-4 w-4 text-blue-600 border-gray-300 rounded"
										/>
										<label className="ml-2 block text-sm text-gray-700">
											Active
										</label>
									</div>

									<div className="flex items-center">
										<input
											type="checkbox"
											name="free_product"
											checked={rewardForm.free_product}
											onChange={handleFormChange}
											className="h-4 w-4 text-blue-600 border-gray-300 rounded"
										/>
										<label className="ml-2 block text-sm text-gray-700">
											Free Product
										</label>
									</div>

									{rewardForm.free_product ? (
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Product ID (optional)
											</label>
											<input
												type="number"
												name="product_id"
												value={rewardForm.product_id || ""}
												onChange={handleFormChange}
												className="w-full px-3 py-2 border border-gray-300 rounded-md"
												min="1"
											/>
											<p className="text-xs text-gray-500 mt-1">
												Leave empty for any product
											</p>
										</div>
									) : (
										<>
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Discount Type
												</label>
												<select
													name="discount_type"
													value={rewardForm.discount_type || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
												>
													<option value="">Select Type</option>
													<option value="percentage">Percentage</option>
													<option value="fixed">Fixed Amount</option>
												</select>
											</div>

											{rewardForm.discount_type && (
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">
														{rewardForm.discount_type === "percentage"
															? "Discount Percentage (%)"
															: "Discount Amount ($)"}
													</label>
													<input
														type="number"
														name="discount_value"
														value={rewardForm.discount_value || ""}
														onChange={handleFormChange}
														className="w-full px-3 py-2 border border-gray-300 rounded-md"
														min="0"
														step={
															rewardForm.discount_type === "percentage"
																? "1"
																: "0.01"
														}
													/>
												</div>
											)}
										</>
									)}
								</div>

								<div className="mt-6 flex justify-end space-x-3">
									<button
										type="button"
										onClick={() => setShowAddModal(false)}
										className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={isLoading}
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
									>
										{isLoading ? "Creating..." : "Create Reward"}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Edit Reward Modal */}
			{showEditModal && (
				<div className="fixed inset-0 bg-white/80 bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
						<div className="p-6">
							<h2 className="text-xl font-semibold mb-4">Edit Reward</h2>
							<form onSubmit={handleSubmitEdit}>
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Reward Name
										</label>
										<input
											type="text"
											name="name"
											value={rewardForm.name || ""}
											onChange={handleFormChange}
											className="w-full px-3 py-2 border border-gray-300 rounded-md"
											required
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Description
										</label>
										<textarea
											name="description"
											value={rewardForm.description || ""}
											onChange={handleFormChange}
											className="w-full px-3 py-2 border border-gray-300 rounded-md"
											rows="3"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Points Required
										</label>
										<input
											type="number"
											name="points_required"
											value={rewardForm.points_required || 0}
											onChange={handleFormChange}
											className="w-full px-3 py-2 border border-gray-300 rounded-md"
											required
											min="0"
										/>
									</div>

									<div className="flex items-center">
										<input
											type="checkbox"
											name="is_active"
											checked={Boolean(rewardForm.is_active)}
											onChange={handleFormChange}
											className="h-4 w-4 text-blue-600 border-gray-300 rounded"
										/>
										<label className="ml-2 block text-sm text-gray-700">
											Active
										</label>
									</div>

									<div className="flex items-center">
										<input
											type="checkbox"
											name="free_product"
											checked={Boolean(rewardForm.free_product)}
											onChange={handleFormChange}
											className="h-4 w-4 text-blue-600 border-gray-300 rounded"
										/>
										<label className="ml-2 block text-sm text-gray-700">
											Free Product
										</label>
									</div>

									{rewardForm.free_product ? (
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Product ID (optional)
											</label>
											<input
												type="number"
												name="product_id"
												value={rewardForm.product_id || ""}
												onChange={handleFormChange}
												className="w-full px-3 py-2 border border-gray-300 rounded-md"
												min="1"
											/>
											<p className="text-xs text-gray-500 mt-1">
												Leave empty for any product
											</p>
										</div>
									) : (
										<>
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Discount Type
												</label>
												<select
													name="discount_type"
													value={rewardForm.discount_type || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
												>
													<option value="">Select Type</option>
													<option value="percentage">Percentage</option>
													<option value="fixed">Fixed Amount</option>
												</select>
											</div>

											{rewardForm.discount_type && (
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">
														{rewardForm.discount_type === "percentage"
															? "Discount Percentage (%)"
															: "Discount Amount ($)"}
													</label>
													<input
														type="number"
														name="discount_value"
														value={rewardForm.discount_value || ""}
														onChange={handleFormChange}
														className="w-full px-3 py-2 border border-gray-300 rounded-md"
														min="0"
														step={
															rewardForm.discount_type === "percentage"
																? "1"
																: "0.01"
														}
													/>
												</div>
											)}
										</>
									)}
								</div>

								<div className="mt-6 flex justify-end space-x-3">
									<button
										type="button"
										onClick={() => setShowEditModal(false)}
										className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={isLoading}
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
									>
										{isLoading ? "Updating..." : "Update Reward"}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteModal && currentReward && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={handleConfirmDelete}
					title="Delete Reward"
					message={`Are you sure you want to delete the reward "${
						currentReward?.name || "Unknown"
					}"? This action cannot be undone.`}
					confirmButtonText="Delete"
					confirmButtonClass="bg-red-600 hover:bg-red-700"
				/>
			)}
		</div>
	);
}
