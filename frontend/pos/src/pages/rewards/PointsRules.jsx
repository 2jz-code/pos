import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { rewardsService } from "../../api/services/rewardsService";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	ArrowLeftIcon,
	PlusIcon,
	PencilSquareIcon, // Updated Icon
	TrashIcon,
	ScaleIcon, // For Points Rules title
	CheckCircleIcon, // For Active status
	XCircleIcon, // For Inactive status
	ExclamationTriangleIcon, // For errors
	ArrowPathIcon, // For retry
	InformationCircleIcon, // For info/help text
	SparklesIcon, // For promotion multiplier
	CubeIcon, // For product specific
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import ConfirmationModal from "../../components/ConfirmationModal"; // Assuming this is styled
import Modal from "../../components/common/Modal"; // Use the common Modal component

// Helper: Format Rule Type/Value Display
const formatRuleValue = (rule) => {
	if (!rule) return <span className="italic text-slate-400">N/A</span>;
	if (rule.is_product_specific) {
		return (
			<span className="inline-flex items-center gap-1 text-indigo-700">
				<CubeIcon className="h-3.5 w-3.5" />
				{rule.product_points || 0} points / Product #{rule.product_id || "?"}
			</span>
		);
	}
	if (rule.is_promotion) {
		return (
			<span className="inline-flex items-center gap-1 text-amber-700">
				<SparklesIcon className="h-3.5 w-3.5" />
				{rule.multiplier || 1}x Points Multiplier
			</span>
		);
	}
	// Standard Rule
	return (
		<span className="inline-flex items-center gap-1 text-emerald-700">
			<ScaleIcon className="h-3.5 w-3.5" />
			{rule.points_per_dollar || 0} points / $
			{rule.minimum_order_amount > 0 && ` (min $${rule.minimum_order_amount})`}
		</span>
	);
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

// Helper: Format promotion dates
const formatPromoDates = (start, end) => {
	if (!start && !end)
		return <span className="italic text-slate-400">Always Active</span>;
	const formatDate = (dateStr) =>
		dateStr
			? new Date(dateStr).toLocaleString(undefined, {
					dateStyle: "short",
					timeStyle: "short",
			  })
			: "N/A";
	return (
		<div className="text-xs space-y-0.5">
			{start && <div>Start: {formatDate(start)}</div>}
			{end && <div>End: {formatDate(end)}</div>}
		</div>
	);
};

// Helper component for form fields
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

export default function PointsRules() {
	const navigate = useNavigate();
	const { execute, isLoading: isApiLoading } = useApi(); // Use isApiLoading for API calls

	// State
	const [rules, setRules] = useState([]);
	const [showAddEditModal, setShowAddEditModal] = useState(false); // Combined modal state
	const [isEditMode, setIsEditMode] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentRule, setCurrentRule] = useState(null); // Rule being edited or deleted
	const [ruleForm, setRuleForm] = useState({
		// Initial form state
		name: "",
		description: "",
		points_per_dollar: "1", // Default for standard
		minimum_order_amount: "0", // Default for standard
		is_product_specific: false,
		product_id: "",
		product_points: "",
		is_promotion: false,
		multiplier: "",
		promotion_start: "", // Use datetime-local format YYYY-MM-DDTHH:mm
		promotion_end: "", // Use datetime-local format YYYY-MM-DDTHH:mm
		is_active: true,
	});
	const [formErrors, setFormErrors] = useState({}); // Frontend validation errors
	const [isSubmitting, setIsSubmitting] = useState(false); // Separate submitting state
	const [fetchError, setFetchError] = useState(null); // Fetch-specific error

	// Fetch rules on mount
	const fetchRules = useCallback(async () => {
		setFetchError(null);
		try {
			const data = await execute(() => rewardsService.getPointsRules());
			setRules(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error("Error fetching points rules:", error);
			const message =
				error.message || "Failed to load points rules. Please try again.";
			setFetchError(message);
			toast.error(message);
			setRules([]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [execute]); // execute is stable

	useEffect(() => {
		fetchRules();
	}, [fetchRules]);

	// --- Modal Handling ---
	const resetForm = () => {
		setRuleForm({
			name: "",
			description: "",
			points_per_dollar: "1",
			minimum_order_amount: "0",
			is_product_specific: false,
			product_id: "",
			product_points: "",
			is_promotion: false,
			multiplier: "",
			promotion_start: "",
			promotion_end: "",
			is_active: true,
		});
		setFormErrors({});
		setCurrentRule(null);
	};

	const handleOpenAddModal = () => {
		resetForm();
		setIsEditMode(false);
		setShowAddEditModal(true);
	};

	const handleOpenEditModal = (rule) => {
		if (!rule) return;
		setCurrentRule(rule);
		// Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
		const formatDateTimeLocal = (dateStr) => {
			if (!dateStr) return "";
			try {
				const date = new Date(dateStr);
				// Adjust for timezone offset before formatting
				const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
				const localISOTime = new Date(date.getTime() - tzoffset)
					.toISOString()
					.slice(0, 16);
				return localISOTime;
			} catch {
				return ""; // Handle invalid date string
			}
		};
		setRuleForm({
			name: rule.name || "",
			description: rule.description || "",
			points_per_dollar: rule.points_per_dollar ?? "1",
			minimum_order_amount: rule.minimum_order_amount ?? "0",
			is_product_specific: rule.is_product_specific ?? false,
			product_id: rule.product_id ?? "",
			product_points: rule.product_points ?? "",
			is_promotion: rule.is_promotion ?? false,
			multiplier: rule.multiplier ?? "",
			promotion_start: formatDateTimeLocal(rule.promotion_start),
			promotion_end: formatDateTimeLocal(rule.promotion_end),
			is_active: rule.is_active ?? true,
		});
		setFormErrors({});
		setIsEditMode(true);
		setShowAddEditModal(true);
	};

	const handleOpenDeleteModal = (rule) => {
		if (!rule) return;
		setCurrentRule(rule);
		setShowDeleteModal(true);
	};

	const handleCloseModal = () => {
		setShowAddEditModal(false);
		setShowDeleteModal(false);
		setTimeout(resetForm, 300); // Delay reset
	};

	// --- Form Handling ---
	const handleFormChange = (e) => {
		const { name, value, type, checked } = e.target;
		let newValue = value;

		if (type === "checkbox") {
			newValue = checked;
			// Logic to ensure only one rule type (product or promotion) is active
			if (name === "is_product_specific" && checked) {
				setRuleForm((prev) => ({
					...prev,
					is_promotion: false,
					[name]: newValue,
				}));
				setFormErrors((prev) => ({
					...prev,
					multiplier: null,
					promotion_start: null,
					promotion_end: null,
				})); // Clear promo errors
				return;
			}
			if (name === "is_promotion" && checked) {
				setRuleForm((prev) => ({
					...prev,
					is_product_specific: false,
					[name]: newValue,
				}));
				setFormErrors((prev) => ({
					...prev,
					product_id: null,
					product_points: null,
				})); // Clear product errors
				return;
			}
		}

		// Update form state
		setRuleForm((prev) => ({ ...prev, [name]: newValue }));

		// Clear validation error for the field being changed
		if (formErrors[name]) {
			setFormErrors((prev) => ({ ...prev, [name]: null }));
		}
		// Clear dependent validation errors if applicable
		if (name === "promotion_start" && formErrors.promotion_end) {
			setFormErrors((prev) => ({ ...prev, promotion_end: null }));
		}
	};

	// --- Frontend Validation ---
	const validateForm = () => {
		const errors = {};
		if (!ruleForm.name.trim()) errors.name = "Rule Name is required.";

		if (ruleForm.is_product_specific) {
			if (
				ruleForm.product_id === "" ||
				isNaN(Number(ruleForm.product_id)) ||
				Number(ruleForm.product_id) <= 0
			) {
				errors.product_id =
					"Product ID is required and must be a positive number.";
			}
			if (
				ruleForm.product_points === "" ||
				isNaN(Number(ruleForm.product_points)) ||
				Number(ruleForm.product_points) <= 0
			) {
				errors.product_points =
					"Points Per Product is required and must be positive.";
			}
		} else if (ruleForm.is_promotion) {
			if (
				ruleForm.multiplier === "" ||
				isNaN(Number(ruleForm.multiplier)) ||
				Number(ruleForm.multiplier) <= 1
			) {
				errors.multiplier =
					"Multiplier is required and must be greater than 1.";
			}
			if (
				ruleForm.promotion_start &&
				ruleForm.promotion_end &&
				ruleForm.promotion_start >= ruleForm.promotion_end
			) {
				errors.promotion_end =
					"Promotion End date/time must be after the Start date/time.";
			}
		} else {
			// Standard Rule
			if (
				ruleForm.points_per_dollar === "" ||
				isNaN(Number(ruleForm.points_per_dollar)) ||
				Number(ruleForm.points_per_dollar) <= 0
			) {
				errors.points_per_dollar =
					"Points Per Dollar is required and must be positive.";
			}
			if (
				ruleForm.minimum_order_amount !== "" &&
				(isNaN(Number(ruleForm.minimum_order_amount)) ||
					Number(ruleForm.minimum_order_amount) < 0)
			) {
				errors.minimum_order_amount =
					"Minimum Order Amount must be a non-negative number.";
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
		const payload = { ...ruleForm };

		// Convert numbers, handle nulls
		payload.points_per_dollar =
			payload.is_product_specific || payload.is_promotion
				? null
				: Number(payload.points_per_dollar);
		payload.minimum_order_amount =
			payload.is_product_specific || payload.is_promotion
				? null
				: payload.minimum_order_amount
				? Number(payload.minimum_order_amount)
				: 0;
		payload.product_id = payload.is_product_specific
			? payload.product_id
				? Number(payload.product_id)
				: null
			: null;
		payload.product_points = payload.is_product_specific
			? payload.product_points
				? Number(payload.product_points)
				: null
			: null;
		payload.multiplier = payload.is_promotion
			? payload.multiplier
				? Number(payload.multiplier)
				: null
			: null;
		// Format dates to ISO string for backend, handle nulls
		payload.promotion_start =
			payload.is_promotion && payload.promotion_start
				? new Date(payload.promotion_start).toISOString()
				: null;
		payload.promotion_end =
			payload.is_promotion && payload.promotion_end
				? new Date(payload.promotion_end).toISOString()
				: null;
		payload.is_active = Boolean(payload.is_active);
		payload.is_product_specific = Boolean(payload.is_product_specific);
		payload.is_promotion = Boolean(payload.is_promotion);

		try {
			let result;
			if (isEditMode && currentRule) {
				result = await execute(
					() => rewardsService.updatePointsRule(currentRule.id, payload),
					{
						successMessage: "Points rule updated successfully!",
					}
				);
				if (result) {
					setRules((prev) =>
						prev.map((r) => (r.id === currentRule.id ? result : r))
					);
				}
			} else {
				result = await execute(() => rewardsService.createPointsRule(payload), {
					successMessage: "Points rule created successfully!",
				});
				if (result) {
					setRules((prev) => [...prev, result]);
				}
			}
			handleCloseModal();
		} catch (error) {
			console.error(
				`Error ${isEditMode ? "updating" : "creating"} points rule:`,
				error
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- Delete Confirmation ---
	const handleConfirmDelete = async () => {
		if (!currentRule?.id) return;
		try {
			await execute(() => rewardsService.deletePointsRule(currentRule.id), {
				successMessage: `Rule "${currentRule.name}" deleted.`,
			});
			setRules((prev) => prev.filter((r) => r.id !== currentRule.id));
			handleCloseModal();
		} catch (error) {
			console.error("Error deleting points rule:", error);
		}
	};

	// --- UI Rendering ---
	const isLoadingPage = isApiLoading && rules.length === 0 && !fetchError;

	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 p-4 text-slate-900 sm:p-6">
			{/* Header */}
			<header className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 sm:text-2xl">
					<ScaleIcon className="h-6 w-6 text-blue-600" />
					Manage Points Rules
				</h1>
				<div className="flex items-center gap-3">
					<button
						onClick={handleOpenAddModal}
						className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						<PlusIcon className="h-4 w-4" />
						Add Rule
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
							onClick={fetchRules}
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
									<Th>Rule Name</Th>
									<Th>Details / Value</Th>
									<Th>Promotion Dates</Th>
									<Th>Status</Th>
									<Th align="right">Actions</Th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 bg-white">
								{rules.length === 0 ? (
									<tr>
										<td
											colSpan="5"
											className="p-8 text-center text-sm text-slate-500"
										>
											No points rules found. Click &quot;Add Rule&quot; to
											create one.
										</td>
									</tr>
								) : (
									rules.map((rule) => (
										<tr
											key={rule.id}
											className="transition-colors hover:bg-slate-50/50"
										>
											<Td>
												<div className="font-medium text-slate-800">
													{rule.name}
												</div>
												<div
													className="mt-0.5 text-xs text-slate-500 line-clamp-1"
													title={rule.description}
												>
													{rule.description || (
														<span className="italic">No description</span>
													)}
												</div>
											</Td>
											<Td>{formatRuleValue(rule)}</Td>
											<Td>
												{rule.is_promotion ? (
													formatPromoDates(
														rule.promotion_start,
														rule.promotion_end
													)
												) : (
													<span className="italic text-slate-400">N/A</span>
												)}
											</Td>
											<Td>{getStatusPill(rule.is_active)}</Td>
											<Td align="right">
												<button
													onClick={() => handleOpenEditModal(rule)}
													className="mr-1 rounded p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
													title="Edit Rule"
													disabled={isApiLoading || isSubmitting}
												>
													<PencilSquareIcon className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleOpenDeleteModal(rule)}
													className="rounded p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400"
													title="Delete Rule"
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

			{/* Add/Edit Rule Modal */}
			<Modal
				isOpen={showAddEditModal}
				onClose={handleCloseModal}
				title={isEditMode ? "Edit Points Rule" : "Add New Points Rule"}
			>
				<form
					onSubmit={handleSubmitForm}
					noValidate
				>
					<div className="space-y-4 p-1 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
						{" "}
						{/* Scrollable content */}
						<FormField
							label="Rule Name"
							id="rule-name"
							required
							error={formErrors.name}
						>
							<input
								type="text"
								id="rule-name"
								name="name"
								required
								value={ruleForm.name}
								onChange={handleFormChange}
								className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
									formErrors.name
										? "ring-red-500 focus:ring-red-600"
										: "ring-slate-300 focus:ring-blue-600"
								} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
							/>
						</FormField>
						<FormField
							label="Description"
							id="rule-description"
							helpText="Optional internal note."
							error={formErrors.description}
						>
							<textarea
								id="rule-description"
								name="description"
								rows="2"
								value={ruleForm.description}
								onChange={handleFormChange}
								className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
									formErrors.description
										? "ring-red-500 focus:ring-red-600"
										: "ring-slate-300 focus:ring-blue-600"
								} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
							/>
						</FormField>
						<div className="flex items-center pt-2">
							<input
								type="checkbox"
								id="rule-is-active"
								name="is_active"
								checked={ruleForm.is_active}
								onChange={handleFormChange}
								className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
							/>
							<label
								htmlFor="rule-is-active"
								className="ml-2 block text-sm font-medium text-slate-700"
							>
								Rule is Active
							</label>
						</div>
						{/* Rule Type Selection */}
						<fieldset className="space-y-3 border-t border-slate-200 pt-4">
							<legend className="block text-sm font-medium text-slate-700 mb-1">
								Rule Type*
							</legend>
							<div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
								<label className="flex items-center cursor-pointer">
									<input
										type="radio"
										name="rule_type_selector"
										value="standard"
										checked={
											!ruleForm.is_product_specific && !ruleForm.is_promotion
										}
										onChange={() =>
											setRuleForm((prev) => ({
												...prev,
												is_product_specific: false,
												is_promotion: false,
											}))
										}
										className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
									/>
									<span className="ml-2 text-sm text-slate-700">
										Standard (Points per $)
									</span>
								</label>
								<label className="flex items-center cursor-pointer">
									<input
										type="radio"
										name="rule_type_selector"
										value="product"
										checked={ruleForm.is_product_specific}
										onChange={() =>
											setRuleForm((prev) => ({
												...prev,
												is_product_specific: true,
												is_promotion: false,
											}))
										}
										className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
									/>
									<span className="ml-2 text-sm text-slate-700">
										Product Specific
									</span>
								</label>
								<label className="flex items-center cursor-pointer">
									<input
										type="radio"
										name="rule_type_selector"
										value="promotion"
										checked={ruleForm.is_promotion}
										onChange={() =>
											setRuleForm((prev) => ({
												...prev,
												is_product_specific: false,
												is_promotion: true,
											}))
										}
										className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
									/>
									<span className="ml-2 text-sm text-slate-700">
										Promotion (Multiplier)
									</span>
								</label>
							</div>
						</fieldset>
						{/* Conditional Fields */}
						{!ruleForm.is_product_specific && !ruleForm.is_promotion && (
							<div className="space-y-4 border-t border-slate-200 pt-4">
								<FormField
									label="Points Per Dollar"
									id="rule-points-per-dollar"
									required
									error={formErrors.points_per_dollar}
								>
									<input
										type="number"
										id="rule-points-per-dollar"
										name="points_per_dollar"
										min="0.01"
										step="0.01"
										required
										value={ruleForm.points_per_dollar}
										onChange={handleFormChange}
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.points_per_dollar
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-blue-600"
										} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
									/>
								</FormField>
								<FormField
									label="Minimum Order Amount ($)"
									id="rule-min-order"
									helpText="Optional. Minimum subtotal to earn points."
									error={formErrors.minimum_order_amount}
								>
									<input
										type="number"
										id="rule-min-order"
										name="minimum_order_amount"
										min="0"
										step="0.01"
										value={ruleForm.minimum_order_amount}
										onChange={handleFormChange}
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.minimum_order_amount
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-blue-600"
										} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
									/>
								</FormField>
							</div>
						)}
						{ruleForm.is_product_specific && (
							<div className="space-y-4 border-t border-slate-200 pt-4">
								<FormField
									label="Product ID"
									id="rule-product-id"
									required
									error={formErrors.product_id}
								>
									<input
										type="number"
										id="rule-product-id"
										name="product_id"
										min="1"
										step="1"
										required
										value={ruleForm.product_id}
										onChange={handleFormChange}
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.product_id
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-blue-600"
										} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
									/>
								</FormField>
								<FormField
									label="Points Per Product"
									id="rule-product-points"
									required
									error={formErrors.product_points}
								>
									<input
										type="number"
										id="rule-product-points"
										name="product_points"
										min="1"
										step="1"
										required
										value={ruleForm.product_points}
										onChange={handleFormChange}
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.product_points
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-blue-600"
										} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
									/>
								</FormField>
							</div>
						)}
						{ruleForm.is_promotion && (
							<div className="space-y-4 border-t border-slate-200 pt-4">
								<FormField
									label="Points Multiplier"
									id="rule-multiplier"
									required
									helpText="e.g., 2 for double points"
									error={formErrors.multiplier}
								>
									<input
										type="number"
										id="rule-multiplier"
										name="multiplier"
										min="1.1"
										step="0.1"
										required
										value={ruleForm.multiplier}
										onChange={handleFormChange}
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.multiplier
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-blue-600"
										} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
									/>
								</FormField>
								<FormField
									label="Promotion Start"
									id="rule-promo-start"
									helpText="Optional. When the promotion begins."
									error={formErrors.promotion_start}
								>
									<input
										type="datetime-local"
										id="rule-promo-start"
										name="promotion_start"
										value={ruleForm.promotion_start}
										onChange={handleFormChange}
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.promotion_start
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-blue-600"
										} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
									/>
								</FormField>
								<FormField
									label="Promotion End"
									id="rule-promo-end"
									helpText="Optional. When the promotion ends."
									error={formErrors.promotion_end}
								>
									<input
										type="datetime-local"
										id="rule-promo-end"
										name="promotion_end"
										value={ruleForm.promotion_end}
										onChange={handleFormChange}
										min={ruleForm.promotion_start || ""} // Basic validation
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.promotion_end
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-blue-600"
										} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
									/>
								</FormField>
							</div>
						)}
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
								"Update Rule"
							) : (
								"Create Rule"
							)}
						</button>
					</div>
				</form>
			</Modal>

			{/* Delete Confirmation Modal */}
			{showDeleteModal && currentRule && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={handleCloseModal}
					onConfirm={handleConfirmDelete}
					title="Delete Points Rule"
					message={`Are you sure you want to delete the rule "${currentRule.name}"? This cannot be undone.`}
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
			isHeader ? "font-medium text-slate-800" : "text-slate-600"
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
