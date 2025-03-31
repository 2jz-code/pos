// src/pages/rewards/PointsRules.jsx
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

export default function PointsRules() {
	const navigate = useNavigate();
	const { isLoading } = useApi();

	const [rules, setRules] = useState([]);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentRule, setCurrentRule] = useState(null);
	const [ruleForm, setRuleForm] = useState({
		name: "",
		description: "",
		points_per_dollar: 1,
		minimum_order_amount: 0,
		is_product_specific: false,
		product_id: null,
		product_points: null,
		is_promotion: false,
		multiplier: null,
		promotion_start: null,
		promotion_end: null,
		is_active: true,
	});

	useEffect(() => {
		const fetchRules = async () => {
			try {
				console.log("Fetching rules...");

				// Use the updated rewardsService directly
				const response = await rewardsService.getPointsRules();
				console.log("Rules data received:", response);

				if (Array.isArray(response)) {
					setRules(response);
					console.log("Rules state updated with", response.length, "items");
				} else {
					console.warn("Invalid data format:", response);
					setRules([]);
				}
			} catch (error) {
				console.error("Error fetching points rules:", error);
				toast.error("Failed to load points rules");
				setRules([]);
			}
		};

		fetchRules();
	}, []);

	const handleAddRule = () => {
		setRuleForm({
			name: "",
			description: "",
			points_per_dollar: 1,
			minimum_order_amount: 0,
			is_product_specific: false,
			product_id: null,
			product_points: null,
			is_promotion: false,
			multiplier: null,
			promotion_start: null,
			promotion_end: null,
			is_active: true,
		});
		setShowAddModal(true);
	};

	const handleEditRule = (rule) => {
		setCurrentRule(rule);

		// Format dates for input fields if they exist
		const formattedRule = {
			...rule,
			promotion_start: rule.promotion_start
				? new Date(rule.promotion_start).toISOString().slice(0, 16)
				: null,
			promotion_end: rule.promotion_end
				? new Date(rule.promotion_end).toISOString().slice(0, 16)
				: null,
		};

		setRuleForm(formattedRule);
		setShowEditModal(true);
	};

	const handleDeleteRule = (rule) => {
		setCurrentRule(rule);
		setShowDeleteModal(true);
	};

	const handleFormChange = (e) => {
		const { name, value, type, checked } = e.target;

		if (type === "checkbox") {
			setRuleForm((prev) => ({
				...prev,
				[name]: checked,
			}));
		} else if (
			name === "points_per_dollar" ||
			name === "minimum_order_amount" ||
			name === "product_id" ||
			name === "product_points" ||
			name === "multiplier"
		) {
			setRuleForm((prev) => ({
				...prev,
				[name]: value === "" ? null : Number(value),
			}));
		} else {
			setRuleForm((prev) => ({
				...prev,
				[name]: value,
			}));
		}
	};

	const handleSubmitAdd = async (e) => {
		e.preventDefault();

		try {
			const newRule = await rewardsService.createPointsRule(ruleForm);

			if (newRule) {
				toast.success("Points rule created successfully");
				setRules([...rules, newRule]);
				setShowAddModal(false);
			}
		} catch (error) {
			console.error("Error creating points rule:", error);
			toast.error("Failed to create rule");
		}
	};

	const handleSubmitEdit = async (e) => {
		e.preventDefault();

		if (!currentRule || !currentRule.id) {
			toast.error("Invalid rule selected for editing");
			return;
		}

		try {
			const updatedRule = await rewardsService.updatePointsRule(
				currentRule.id,
				ruleForm
			);

			if (updatedRule) {
				toast.success("Points rule updated successfully");
				setRules(rules.map((r) => (r.id === currentRule.id ? updatedRule : r)));
				setShowEditModal(false);
			}
		} catch (error) {
			console.error("Error updating points rule:", error);
			toast.error("Failed to update rule");
		}
	};

	const handleConfirmDelete = async () => {
		if (!currentRule || !currentRule.id) {
			toast.error("Invalid rule selected for deletion");
			return;
		}

		try {
			await rewardsService.deletePointsRule(currentRule.id);
			toast.success("Points rule deleted successfully");
			setRules(rules.filter((r) => r.id !== currentRule.id));
			setShowDeleteModal(false);
		} catch (error) {
			console.error("Error deleting points rule:", error);
			toast.error("Failed to delete rule");
		}
	};

	// Update the loading condition
	if (isLoading && (!rules || rules.length === 0)) {
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
				<h1 className="text-2xl font-bold text-slate-800">Points Rules</h1>
				<div className="flex space-x-4">
					<button
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
						onClick={handleAddRule}
					>
						<PlusIcon className="h-5 w-5" />
						Add Rule
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

			{/* Rules List */}
			<div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-200">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Rule Name
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Type
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Points Value
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
							{!rules || rules.length === 0 ? (
								<tr>
									<td
										colSpan="5"
										className="px-6 py-4 text-center text-slate-500"
									>
										No points rules found. Create your first rule!
									</td>
								</tr>
							) : (
								rules.map((rule, index) => (
									<tr
										key={rule.id || index}
										className="hover:bg-slate-50"
									>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
											{rule.name || "Unnamed Rule"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{rule.is_product_specific
												? "Product Specific"
												: rule.is_promotion
												? "Promotion"
												: "Standard"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{rule.is_product_specific && rule.product_points
												? `${rule.product_points} points per item`
												: rule.is_promotion && rule.multiplier
												? `${rule.multiplier}x multiplier`
												: `${rule.points_per_dollar || 0} points per $`}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													rule.is_active
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{rule.is_active ? "ACTIVE" : "INACTIVE"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-right">
											<button
												onClick={() => handleEditRule(rule)}
												className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors mr-2"
											>
												<PencilIcon className="h-4 w-4 inline" />
											</button>
											<button
												onClick={() => handleDeleteRule(rule)}
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

			{/* Add Rule Modal */}
			{showAddModal && (
				<div className="fixed inset-0 bg-white/80 bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
						<div className="p-6">
							<h2 className="text-xl font-semibold mb-4">
								Add New Points Rule
							</h2>
							<form onSubmit={handleSubmitAdd}>
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Rule Name
										</label>
										<input
											type="text"
											name="name"
											value={ruleForm.name}
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
											value={ruleForm.description}
											onChange={handleFormChange}
											className="w-full px-3 py-2 border border-gray-300 rounded-md"
											rows="2"
										/>
									</div>

									<div className="flex items-center">
										<input
											type="checkbox"
											name="is_active"
											checked={ruleForm.is_active}
											onChange={handleFormChange}
											className="h-4 w-4 text-blue-600 border-gray-300 rounded"
										/>
										<label className="ml-2 block text-sm text-gray-700">
											Active
										</label>
									</div>

									<div className="space-y-4 border-t pt-4 mt-4">
										<div className="font-medium text-gray-700">Rule Type</div>

										<div className="flex items-center">
											<input
												type="checkbox"
												name="is_product_specific"
												checked={ruleForm.is_product_specific}
												onChange={(e) => {
													const checked = e.target.checked;
													setRuleForm((prev) => ({
														...prev,
														is_product_specific: checked,
														is_promotion: checked ? false : prev.is_promotion,
													}));
												}}
												className="h-4 w-4 text-blue-600 border-gray-300 rounded"
											/>
											<label className="ml-2 block text-sm text-gray-700">
												Product Specific
											</label>
										</div>

										<div className="flex items-center">
											<input
												type="checkbox"
												name="is_promotion"
												checked={ruleForm.is_promotion}
												onChange={(e) => {
													const checked = e.target.checked;
													setRuleForm((prev) => ({
														...prev,
														is_promotion: checked,
														is_product_specific: checked
															? false
															: prev.is_product_specific,
													}));
												}}
												className="h-4 w-4 text-blue-600 border-gray-300 rounded"
											/>
											<label className="ml-2 block text-sm text-gray-700">
												Promotion
											</label>
										</div>
									</div>

									{/* Standard Rule Fields */}
									{!ruleForm.is_product_specific && !ruleForm.is_promotion && (
										<div className="space-y-4 border-t pt-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Points Per Dollar
												</label>
												<input
													type="number"
													name="points_per_dollar"
													value={ruleForm.points_per_dollar}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
													required
													min="0.01"
													step="0.01"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Minimum Order Amount ($)
												</label>
												<input
													type="number"
													name="minimum_order_amount"
													value={ruleForm.minimum_order_amount}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
													min="0"
													step="0.01"
												/>
											</div>
										</div>
									)}

									{/* Product Specific Fields */}
									{ruleForm.is_product_specific && (
										<div className="space-y-4 border-t pt-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Product ID
												</label>
												<input
													type="number"
													name="product_id"
													value={ruleForm.product_id || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
													required
													min="1"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Points Per Product
												</label>
												<input
													type="number"
													name="product_points"
													value={ruleForm.product_points || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
													required
													min="1"
												/>
											</div>
										</div>
									)}

									{/* Promotion Fields */}
									{ruleForm.is_promotion && (
										<div className="space-y-4 border-t pt-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Points Multiplier
												</label>
												<input
													type="number"
													name="multiplier"
													value={ruleForm.multiplier || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
													required
													min="1.1"
													step="0.1"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Promotion Start
												</label>
												<input
													type="datetime-local"
													name="promotion_start"
													value={ruleForm.promotion_start || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Promotion End
												</label>
												<input
													type="datetime-local"
													name="promotion_end"
													value={ruleForm.promotion_end || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
												/>
											</div>
										</div>
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
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
									>
										Create Rule
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Edit Rule Modal */}
			{showEditModal && (
				<div className="fixed inset-0 bg-white/80 bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
						<div className="p-6">
							<h2 className="text-xl font-semibold mb-4">Edit Points Rule</h2>
							<form onSubmit={handleSubmitEdit}>
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Rule Name
										</label>
										<input
											type="text"
											name="name"
											value={ruleForm.name}
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
											value={ruleForm.description || ""}
											onChange={handleFormChange}
											className="w-full px-3 py-2 border border-gray-300 rounded-md"
											rows="2"
										/>
									</div>

									<div className="flex items-center">
										<input
											type="checkbox"
											name="is_active"
											checked={ruleForm.is_active}
											onChange={handleFormChange}
											className="h-4 w-4 text-blue-600 border-gray-300 rounded"
										/>
										<label className="ml-2 block text-sm text-gray-700">
											Active
										</label>
									</div>

									<div className="space-y-4 border-t pt-4 mt-4">
										<div className="font-medium text-gray-700">Rule Type</div>

										<div className="flex items-center">
											<input
												type="checkbox"
												name="is_product_specific"
												checked={ruleForm.is_product_specific}
												onChange={(e) => {
													const checked = e.target.checked;
													setRuleForm((prev) => ({
														...prev,
														is_product_specific: checked,
														is_promotion: checked ? false : prev.is_promotion,
													}));
												}}
												className="h-4 w-4 text-blue-600 border-gray-300 rounded"
											/>
											<label className="ml-2 block text-sm text-gray-700">
												Product Specific
											</label>
										</div>

										<div className="flex items-center">
											<input
												type="checkbox"
												name="is_promotion"
												checked={ruleForm.is_promotion}
												onChange={(e) => {
													const checked = e.target.checked;
													setRuleForm((prev) => ({
														...prev,
														is_promotion: checked,
														is_product_specific: checked
															? false
															: prev.is_product_specific,
													}));
												}}
												className="h-4 w-4 text-blue-600 border-gray-300 rounded"
											/>
											<label className="ml-2 block text-sm text-gray-700">
												Promotion
											</label>
										</div>
									</div>

									{/* Standard Rule Fields */}
									{!ruleForm.is_product_specific && !ruleForm.is_promotion && (
										<div className="space-y-4 border-t pt-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Points Per Dollar
												</label>
												<input
													type="number"
													name="points_per_dollar"
													value={ruleForm.points_per_dollar}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
													required
													min="0.01"
													step="0.01"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Minimum Order Amount ($)
												</label>
												<input
													type="number"
													name="minimum_order_amount"
													value={ruleForm.minimum_order_amount}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
													min="0"
													step="0.01"
												/>
											</div>
										</div>
									)}

									{/* Product Specific Fields */}
									{ruleForm.is_product_specific && (
										<div className="space-y-4 border-t pt-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Product ID
												</label>
												<input
													type="number"
													name="product_id"
													value={ruleForm.product_id || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
													required
													min="1"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Points Per Product
												</label>
												<input
													type="number"
													name="product_points"
													value={ruleForm.product_points || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
													required
													min="1"
												/>
											</div>
										</div>
									)}

									{/* Promotion Fields */}
									{ruleForm.is_promotion && (
										<div className="space-y-4 border-t pt-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Points Multiplier
												</label>
												<input
													type="number"
													name="multiplier"
													value={ruleForm.multiplier || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
													required
													min="1.1"
													step="0.1"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Promotion Start
												</label>
												<input
													type="datetime-local"
													name="promotion_start"
													value={ruleForm.promotion_start || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">
													Promotion End
												</label>
												<input
													type="datetime-local"
													name="promotion_end"
													value={ruleForm.promotion_end || ""}
													onChange={handleFormChange}
													className="w-full px-3 py-2 border border-gray-300 rounded-md"
												/>
											</div>
										</div>
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
										{isLoading ? "Updating..." : "Update Rule"}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteModal && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={handleConfirmDelete}
					title="Delete Points Rule"
					message={`Are you sure you want to delete the rule "${currentRule?.name}"? This action cannot be undone.`}
					confirmButtonText="Delete"
					confirmButtonClass="bg-red-600 hover:bg-red-700"
				/>
			)}
		</div>
	);
}
