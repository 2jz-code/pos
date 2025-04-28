import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types"; // Import PropTypes
import { rewardsService } from "../../api/services/rewardsService";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	ArrowLeftIcon,
	PlusIcon,
	PencilSquareIcon, // Updated Icon
	TrashIcon,
	GiftIcon, // For Reward Items title
	CheckCircleIcon, // For Active status
	XCircleIcon, // For Inactive status
	CurrencyDollarIcon, // For fixed discount
	TicketIcon, // For percentage discount
	CubeIcon, // For free product	HashtagIcon, // For product ID
	ExclamationTriangleIcon, // For errors
	ArrowPathIcon, // For retry
	InformationCircleIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import ConfirmationModal from "../../components/ConfirmationModal"; // Assuming this is styled
import Modal from "../../components/common/Modal"; // Use the common Modal component

// Helper: Format Reward Value Display
const formatRewardValue = (reward) => {
	if (!reward) return <span className="italic text-slate-400">N/A</span>;
	if (reward.free_product) {
		return (
			<span className="inline-flex items-center gap-1 text-indigo-700">
				<CubeIcon className="h-3.5 w-3.5" />
				{reward.product_id
					? `Free Product #${reward.product_id}`
					: "Any Free Product"}
			</span>
		);
	}
	if (reward.discount_type === "percentage") {
		return (
			<span className="inline-flex items-center gap-1 text-teal-700">
				<TicketIcon className="h-3.5 w-3.5" />
				{reward.discount_value || 0}% Off
			</span>
		);
	}
	if (reward.discount_type === "fixed") {
		return (
			<span className="inline-flex items-center gap-1 text-blue-700">
				<CurrencyDollarIcon className="h-3.5 w-3.5" />
				{new Intl.NumberFormat("en-US", {
					style: "currency",
					currency: "USD",
				}).format(reward.discount_value || 0)}{" "}
				Off
			</span>
		);
	}
	return <span className="italic text-slate-400">No Value Set</span>;
};

// Helper: Get status pill styling
const getStatusPill = (isActive) => {
	const baseClasses =
		"px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1 border";
	if (isActive) {
		return (
			<span
				className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}
			>
				<CheckCircleIcon className="h-3 w-3" /> ACTIVE
			</span>
		);
	} else {
		return (
			<span
				className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-200`}
			>
				<XCircleIcon className="h-3 w-3" /> INACTIVE
			</span>
		);
	}
};

// Helper component for form fields (similar to DiscountForm)
const FormField = ({
	label,
	id,
	children,
	required = false,
	helpText = null,
	error = null,
}) => (
	<div className="mb-4">
		<label
			htmlFor={id}
			className="mb-1 block text-sm font-medium text-slate-700"
		>
			{label} {required && <span className="text-red-500">*</span>}
		</label>
		{children}
		{helpText && !error && (
			<p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
				<InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
				{helpText}
			</p>
		)}
		{error && (
			<p className="mt-1 flex items-center gap-1 text-xs text-red-600">
				<ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
				{error}
			</p>
		)}
	</div>
);
FormField.propTypes = {
	label: PropTypes.string.isRequired,
	id: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
	required: PropTypes.bool,
	helpText: PropTypes.string,
	error: PropTypes.string,
};

export default function RewardItems() {
	const navigate = useNavigate();
	// eslint-disable-next-line no-unused-vars
	const { execute, isLoading: isApiLoading, error: apiError } = useApi(); // Use isApiLoading for API calls

	// State
	const [rewards, setRewards] = useState([]);
	const [showAddEditModal, setShowAddEditModal] = useState(false); // Combined modal state
	const [isEditMode, setIsEditMode] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentReward, setCurrentReward] = useState(null); // Reward being edited or deleted
	const [rewardForm, setRewardForm] = useState({
		// Initial form state
		name: "",
		description: "",
		points_required: "",
		is_active: true,
		discount_type: "", // 'percentage', 'fixed', or '' if free_product is true
		discount_value: "",
		free_product: false,
		product_id: "", // Store as string for input, convert on submit
	});
	const [formErrors, setFormErrors] = useState({}); // Frontend validation errors
	const [isSubmitting, setIsSubmitting] = useState(false); // Separate submitting state
	const [fetchError, setFetchError] = useState(null); // Fetch-specific error

	// Fetch rewards on mount
	const fetchRewards = useCallback(async () => {
		setFetchError(null);
		try {
			const data = await execute(() => rewardsService.getRewards());
			setRewards(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error("Error fetching rewards:", error);
			const message =
				error.message || "Failed to load rewards. Please try again.";
			setFetchError(message);
			toast.error(message);
			setRewards([]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [execute]); // execute is stable

	useEffect(() => {
		fetchRewards();
	}, [fetchRewards]);

	// --- Modal Handling ---
	const resetForm = () => {
		setRewardForm({
			name: "",
			description: "",
			points_required: "",
			is_active: true,
			discount_type: "",
			discount_value: "",
			free_product: false,
			product_id: "",
		});
		setFormErrors({});
		setCurrentReward(null);
	};

	const handleOpenAddModal = () => {
		resetForm();
		setIsEditMode(false);
		setShowAddEditModal(true);
	};

	const handleOpenEditModal = (reward) => {
		if (!reward) return;
		setCurrentReward(reward);
		setRewardForm({
			name: reward.name || "",
			description: reward.description || "",
			points_required: reward.points_required ?? "", // Keep as string for input
			is_active: reward.is_active ?? true,
			discount_type: reward.discount_type || "",
			discount_value: reward.discount_value ?? "", // Keep as string
			free_product: reward.free_product ?? false,
			product_id: reward.product_id ?? "", // Keep as string
		});
		setFormErrors({});
		setIsEditMode(true);
		setShowAddEditModal(true);
	};

	const handleOpenDeleteModal = (reward) => {
		if (!reward) return;
		setCurrentReward(reward);
		setShowDeleteModal(true);
	};

	const handleCloseModal = () => {
		setShowAddEditModal(false);
		setShowDeleteModal(false);
		// Delay resetting form slightly to avoid visual glitch during modal close animation
		setTimeout(resetForm, 300);
	};

	// --- Form Handling ---
	const handleFormChange = (e) => {
		const { name, value, type, checked } = e.target;
		let newValue = value;

		if (type === "checkbox") {
			newValue = checked;
			// If 'free_product' is checked, clear discount fields
			if (name === "free_product" && checked) {
				setRewardForm((prev) => ({
					...prev,
					discount_type: "",
					discount_value: "",
					[name]: newValue,
				}));
				// Clear related errors
				setFormErrors((prev) => ({
					...prev,
					discount_type: null,
					discount_value: null,
				}));
				return; // Exit early
			}
			// If 'free_product' is unchecked, clear product_id
			if (name === "free_product" && !checked) {
				setRewardForm((prev) => ({
					...prev,
					product_id: "",
					[name]: newValue,
				}));
				setFormErrors((prev) => ({ ...prev, product_id: null })); // Clear product_id error if any
				return; // Exit early
			}
		}

		// Update form state
		setRewardForm((prev) => ({ ...prev, [name]: newValue }));

		// Clear validation error for the field being changed
		if (formErrors[name]) {
			setFormErrors((prev) => ({ ...prev, [name]: null }));
		}
		// Clear dependent validation errors
		if (name === "discount_type" && formErrors.discount_value) {
			setFormErrors((prev) => ({ ...prev, discount_value: null }));
		}
	};

	// --- Frontend Validation ---
	const validateForm = () => {
		const errors = {};
		if (!rewardForm.name.trim()) errors.name = "Reward Name is required.";
		if (
			rewardForm.points_required === "" ||
			isNaN(Number(rewardForm.points_required)) ||
			Number(rewardForm.points_required) <= 0
		) {
			errors.points_required = "Points Required must be a positive number.";
		}

		if (rewardForm.free_product) {
			// Validation for free product (product_id is optional)
			if (
				rewardForm.product_id !== "" &&
				(isNaN(Number(rewardForm.product_id)) ||
					Number(rewardForm.product_id) <= 0)
			) {
				errors.product_id = "Product ID must be a positive number if provided.";
			}
		} else {
			// Validation for discount type
			if (!rewardForm.discount_type) {
				errors.discount_type =
					"Discount Type is required if not a Free Product.";
			}
			if (
				rewardForm.discount_type &&
				(rewardForm.discount_value === "" ||
					isNaN(Number(rewardForm.discount_value)) ||
					Number(rewardForm.discount_value) <= 0)
			) {
				errors.discount_value =
					"Discount Value is required and must be positive.";
			} else if (
				rewardForm.discount_type === "percentage" &&
				Number(rewardForm.discount_value) > 100
			) {
				errors.discount_value = "Percentage cannot exceed 100.";
			}
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	// --- Form Submission ---
	const handleSubmitForm = async (e) => {
		e.preventDefault();
		if (!validateForm()) {
			toast.warn("Please fix the errors in the form.");
			return;
		}

		setIsSubmitting(true);

		// Prepare data for API
		const payload = {
			...rewardForm,
			points_required: Number(rewardForm.points_required),
			// Only include discount fields if not free product
			discount_type: rewardForm.free_product ? null : rewardForm.discount_type,
			discount_value: rewardForm.free_product
				? null
				: rewardForm.discount_value
				? Number(rewardForm.discount_value)
				: null,
			// Only include product_id if free product is true
			product_id: rewardForm.free_product
				? rewardForm.product_id
					? Number(rewardForm.product_id)
					: null
				: null,
		};
		// Ensure boolean values are correct
		payload.is_active = Boolean(payload.is_active);
		payload.free_product = Boolean(payload.free_product);

		try {
			let result;
			if (isEditMode && currentReward) {
				result = await execute(
					() => rewardsService.updateReward(currentReward.id, payload),
					{
						successMessage: "Reward updated successfully!",
					}
				);
				if (result) {
					setRewards((prev) =>
						prev.map((r) => (r.id === currentReward.id ? result : r))
					);
				}
			} else {
				result = await execute(() => rewardsService.createReward(payload), {
					successMessage: "Reward created successfully!",
				});
				if (result) {
					setRewards((prev) => [...prev, result]);
				}
			}
			handleCloseModal(); // Close modal on success
		} catch (error) {
			console.error(
				`Error ${isEditMode ? "updating" : "creating"} reward:`,
				error
			);
			// Error toast is likely handled by useApi hook
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- Delete Confirmation ---
	const handleConfirmDelete = async () => {
		if (!currentReward?.id) return;
		try {
			await execute(() => rewardsService.deleteReward(currentReward.id), {
				successMessage: `Reward "${currentReward.name}" deleted.`,
			});
			setRewards((prev) => prev.filter((r) => r.id !== currentReward.id));
			handleCloseModal();
		} catch (error) {
			console.error("Error deleting reward:", error);
			// Error toast handled by useApi
		}
	};

	// --- UI Rendering ---
	const isLoadingPage = isApiLoading && rewards.length === 0 && !fetchError;

	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 p-4 text-slate-900 sm:p-6">
			{/* Header */}
			<header className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 sm:text-2xl">
					<GiftIcon className="h-6 w-6 text-purple-600" />
					Manage Reward Items
				</h1>
				<div className="flex items-center gap-3">
					<button
						onClick={handleOpenAddModal}
						className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						<PlusIcon className="h-4 w-4" />
						Add Reward
					</button>
					<button
						className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						onClick={() => navigate("/rewards")}
					>
						<ArrowLeftIcon className="h-4 w-4" />
						Back
					</button>
				</div>
			</header>

			{/* Main Content Area */}
			<div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
				{isLoadingPage ? (
					<div className="flex h-full items-center justify-center">
						<LoadingSpinner size="md" />
					</div>
				) : fetchError ? (
					<div className="flex h-full flex-col items-center justify-center p-6 text-center">
						<ExclamationTriangleIcon className="mb-2 h-8 w-8 text-red-400" />
						<p className="mb-3 text-sm text-red-600">{fetchError}</p>
						<button
							onClick={fetchRewards}
							disabled={isApiLoading}
							className="flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
						>
							<ArrowPathIcon className="h-3.5 w-3.5" /> Retry
						</button>
					</div>
				) : (
					<div className="custom-scrollbar h-full overflow-auto">
						<table className="min-w-full divide-y divide-slate-100">
							<thead className="sticky top-0 z-10 bg-slate-50">
								<tr>
									<Th>Reward Name</Th>
									<Th align="center">Points</Th>
									<Th>Value / Type</Th>
									<Th>Status</Th>
									<Th align="right">Actions</Th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 bg-white">
								{rewards.length === 0 ? (
									<tr>
										<td
											colSpan="5"
											className="p-8 text-center text-sm text-slate-500"
										>
											No reward items found. Click &quot;Add Reward&quot; to
											create one.
										</td>
									</tr>
								) : (
									rewards.map((reward) => (
										<tr
											key={reward.id}
											className="transition-colors hover:bg-slate-50/50"
										>
											<Td>
												<div className="font-medium text-slate-800">
													{reward.name}
												</div>
												<div
													className="mt-0.5 text-xs text-slate-500 line-clamp-1"
													title={reward.description}
												>
													{reward.description || (
														<span className="italic">No description</span>
													)}
												</div>
											</Td>
											<Td
												align="center"
												isHeader
											>
												{reward.points_required}
											</Td>
											<Td>{formatRewardValue(reward)}</Td>
											<Td>{getStatusPill(reward.is_active)}</Td>
											<Td align="right">
												<button
													onClick={() => handleOpenEditModal(reward)}
													className="mr-1 rounded p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
													title="Edit Reward"
													disabled={isApiLoading || isSubmitting}
												>
													<PencilSquareIcon className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleOpenDeleteModal(reward)}
													className="rounded p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400"
													title="Delete Reward"
													disabled={isApiLoading || isSubmitting}
												>
													<TrashIcon className="h-4 w-4" />
												</button>
											</Td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Add/Edit Reward Modal */}
			<Modal
				isOpen={showAddEditModal}
				onClose={handleCloseModal}
				title={isEditMode ? "Edit Reward" : "Add New Reward"}
			>
				<form
					onSubmit={handleSubmitForm}
					noValidate
				>
					{/* Form fields */}
					<div className="space-y-4 p-1">
						{" "}
						{/* Add padding inside modal content */}
						<FormField
							label="Reward Name"
							id="reward-name"
							required
							error={formErrors.name}
						>
							<input
								type="text"
								id="reward-name"
								name="name"
								value={rewardForm.name}
								onChange={handleFormChange}
								required
								className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
									formErrors.name
										? "ring-red-500 focus:ring-red-600"
										: "ring-slate-300 focus:ring-blue-600"
								} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
							/>
						</FormField>
						<FormField
							label="Description"
							id="reward-description"
							helpText="Optional description for the reward."
							error={formErrors.description}
						>
							<textarea
								id="reward-description"
								name="description"
								rows="2"
								value={rewardForm.description}
								onChange={handleFormChange}
								className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
									formErrors.description
										? "ring-red-500 focus:ring-red-600"
										: "ring-slate-300 focus:ring-blue-600"
								} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
							/>
						</FormField>
						<FormField
							label="Points Required"
							id="reward-points"
							required
							error={formErrors.points_required}
						>
							<input
								type="number"
								id="reward-points"
								name="points_required"
								min="1"
								step="1"
								required
								value={rewardForm.points_required}
								onChange={handleFormChange}
								className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
									formErrors.points_required
										? "ring-red-500 focus:ring-red-600"
										: "ring-slate-300 focus:ring-blue-600"
								} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
							/>
						</FormField>
						{/* Reward Type Selection */}
						<div className="space-y-3 border-t border-slate-200 pt-4">
							<label className="block text-sm font-medium text-slate-700">
								Reward Type*
							</label>
							<div className="flex items-center gap-4">
								<label className="flex items-center cursor-pointer">
									<input
										type="checkbox"
										name="free_product"
										checked={rewardForm.free_product}
										onChange={handleFormChange}
										className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
									/>
									<span className="ml-2 text-sm text-slate-700">
										Free Product
									</span>
								</label>
								<label className="flex items-center cursor-pointer">
									<input
										type="radio"
										name="reward_type_selector"
										value="discount"
										checked={!rewardForm.free_product}
										onChange={() =>
											setRewardForm((prev) => ({
												...prev,
												free_product: false,
											}))
										}
										className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
									/>
									<span className="ml-2 text-sm text-slate-700">Discount</span>
								</label>
							</div>
						</div>
						{/* Conditional Fields */}
						{rewardForm.free_product ? (
							// Free Product Fields
							<FormField
								label="Specific Product ID"
								id="reward-product-id"
								helpText="Optional. Leave blank to allow any product."
								error={formErrors.product_id}
							>
								<input
									type="number"
									id="reward-product-id"
									name="product_id"
									min="1"
									step="1"
									value={rewardForm.product_id}
									onChange={handleFormChange}
									className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
										formErrors.product_id
											? "ring-red-500 focus:ring-red-600"
											: "ring-slate-300 focus:ring-blue-600"
									} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
								/>
							</FormField>
						) : (
							// Discount Fields
							<div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
								<FormField
									label="Discount Type"
									id="reward-discount-type"
									required={!rewardForm.free_product}
									error={formErrors.discount_type}
								>
									<select
										id="reward-discount-type"
										name="discount_type"
										required={!rewardForm.free_product}
										value={rewardForm.discount_type}
										onChange={handleFormChange}
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.discount_type
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-blue-600"
										} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
									>
										<option value="">Select Type...</option>
										<option value="percentage">Percentage (%)</option>
										<option value="fixed">Fixed Amount ($)</option>
									</select>
								</FormField>
								<FormField
									label={`Value ${
										rewardForm.discount_type === "percentage" ? "(%)" : "($)"
									}`}
									id="reward-discount-value"
									required={
										!rewardForm.free_product && !!rewardForm.discount_type
									}
									error={formErrors.discount_value}
								>
									<input
										type="number"
										id="reward-discount-value"
										name="discount_value"
										value={rewardForm.discount_value}
										onChange={handleFormChange}
										required={
											!rewardForm.free_product && !!rewardForm.discount_type
										}
										min={
											rewardForm.discount_type === "percentage" ? "0" : "0.01"
										}
										max={
											rewardForm.discount_type === "percentage"
												? "100"
												: undefined
										}
										step={
											rewardForm.discount_type === "percentage" ? "1" : "0.01"
										}
										disabled={!rewardForm.discount_type} // Disable if type not selected
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.discount_value
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-blue-600"
										} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:ring-slate-200`}
									/>
								</FormField>
							</div>
						)}
						{/* Active Checkbox */}
						<div className="flex items-center pt-2">
							<input
								type="checkbox"
								id="reward-is-active"
								name="is_active"
								checked={rewardForm.is_active}
								onChange={handleFormChange}
								className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
							/>
							<label
								htmlFor="reward-is-active"
								className="ml-2 block text-sm font-medium text-slate-700"
							>
								Reward is Active
							</label>
						</div>
					</div>

					{/* Modal Footer Actions */}
					<div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
						<button
							type="button"
							onClick={handleCloseModal}
							disabled={isSubmitting}
							className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || isApiLoading}
							className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
						>
							{isSubmitting ? (
								<>
									<svg
										className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Saving...
								</>
							) : isEditMode ? (
								"Update Reward"
							) : (
								"Create Reward"
							)}
						</button>
					</div>
				</form>
			</Modal>

			{/* Delete Confirmation Modal */}
			{showDeleteModal && currentReward && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={handleCloseModal}
					onConfirm={handleConfirmDelete}
					title="Delete Reward Item"
					message={`Are you sure you want to delete the reward "${currentReward.name}"? This cannot be undone.`}
					confirmButtonText={isApiLoading ? "Deleting..." : "Delete"}
					confirmButtonClass="bg-red-600 hover:bg-red-700 disabled:bg-red-300"
					isConfirmDisabled={isApiLoading}
				/>
			)}
		</div>
	);
}

// Helper components for table styling
const Th = ({ children, align = "left" }) => (
	<th
		scope="col"
		className={`whitespace-nowrap px-4 py-2.5 text-${align} text-xs font-semibold uppercase tracking-wider text-slate-500`}
	>
		{children}
	</th>
);
Th.propTypes = { children: PropTypes.node, align: PropTypes.string };

const Td = ({ children, align = "left", isHeader = false }) => (
	<td
		className={`px-4 py-2.5 text-${align} text-sm ${
			isHeader ? "font-semibold text-slate-800" : "text-slate-600"
		}`}
	>
		{children}
	</td>
);
Td.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	isHeader: PropTypes.bool,
};
