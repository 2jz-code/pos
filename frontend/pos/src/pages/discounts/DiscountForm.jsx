import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types"; // Import PropTypes
import { discountService } from "../../api/services/discountService";
import axiosInstance from "../../api/config/axiosConfig"; // Assuming this is still needed for product/category fetching
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	TagIcon,
	ArrowLeftIcon,
	InformationCircleIcon,
	ExclamationTriangleIcon, // For validation errors
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";

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
		{" "}
		{/* Add consistent margin-bottom */}
		<label
			htmlFor={id}
			className="mb-1 block text-sm font-medium text-slate-700"
		>
			{label} {required && <span className="text-red-500">*</span>}
		</label>
		{children}
		{helpText &&
			!error && ( // Show help text only if no error
				<p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
					<InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
					{helpText}
				</p>
			)}
		{error && ( // Show error message
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
	error: PropTypes.string, // Add error prop type
};

// Helper component for section headings
const FormSectionHeading = ({ children }) => (
	<h2 className="mb-4 border-b border-slate-200 pb-2 text-base font-semibold text-slate-700">
		{children}
	</h2>
);
FormSectionHeading.propTypes = { children: PropTypes.node.isRequired };

export default function DiscountForm() {
	const { id } = useParams(); // Get discount ID from URL if editing
	const navigate = useNavigate();
	// Use isLoading for overall page load (fetching discount/options), isSubmitting for form submission
	const { execute, isLoading: isApiLoading } = useApi();
	const isEditMode = !!id;

	// Form state
	const [formData, setFormData] = useState({
		name: "",
		code: "",
		description: "",
		discount_type: "percentage", // 'percentage' or 'fixed'
		value: "",
		apply_to: "order", // 'order', 'product', 'category'
		products: [], // Array of product IDs
		categories: [], // Array of category IDs
		is_active: true,
		start_date: "", // YYYY-MM-DD
		end_date: "", // YYYY-MM-DD
		minimum_order_amount: "",
		usage_limit: "",
		discount_category: "promotional", // 'promotional' or 'permanent'
	});

	// State for options fetched from API
	const [allProducts, setAllProducts] = useState([]);
	const [allCategories, setAllCategories] = useState([]);
	const [isOptionsLoading, setIsOptionsLoading] = useState(true); // Separate loading for options
	const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for form submission
	const [formErrors, setFormErrors] = useState({}); // State for frontend validation errors

	// --- Data Fetching ---

	// Fetch discount data for edit mode
	const fetchDiscountData = useCallback(async () => {
		if (!isEditMode) return; // Only run in edit mode
		try {
			const discount = await execute(() => discountService.getDiscount(id));
			if (discount) {
				// Format fetched data for the form state
				const formattedDiscount = {
					...discount,
					products: discount.products || [], // Ensure array
					categories: discount.categories || [], // Ensure array
					// Format dates to YYYY-MM-DD for the date input type
					start_date: discount.start_date
						? new Date(discount.start_date).toISOString().split("T")[0]
						: "",
					end_date: discount.end_date
						? new Date(discount.end_date).toISOString().split("T")[0]
						: "",
					// Ensure numeric fields are empty strings if null/undefined, otherwise keep value
					value: discount.value ?? "",
					minimum_order_amount: discount.minimum_order_amount ?? "",
					usage_limit: discount.usage_limit ?? "",
					// Ensure boolean is handled correctly
					is_active: discount.is_active ?? true,
				};
				setFormData(formattedDiscount);
			}
		} catch (error) {
			console.error("Error fetching discount:", error);
			toast.error(
				"Failed to load discount details. Please go back and try again."
			);
			// Optionally navigate back or show a persistent error
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, isEditMode]); // Removed execute, it's stable

	// Fetch products and categories for selection lists
	const fetchOptions = useCallback(async () => {
		setIsOptionsLoading(true);
		try {
			const [productsResponse, categoriesResponse] = await Promise.all([
				// Use axiosInstance directly if useApi isn't configured for these simple GETs
				// Or wrap them in execute if preferred
				axiosInstance.get("products/"),
				axiosInstance.get("products/categories/"),
			]);
			setAllProducts(productsResponse.data || []);
			setAllCategories(categoriesResponse.data || []);
		} catch (error) {
			console.error("Error fetching options:", error);
			toast.error(
				"Failed to load product/category options. Selection might be unavailable."
			);
			setAllProducts([]);
			setAllCategories([]);
		} finally {
			setIsOptionsLoading(false);
		}
	}, []);

	// Run fetch effects on mount
	useEffect(() => {
		fetchDiscountData();
		fetchOptions();
	}, [fetchDiscountData, fetchOptions]);

	// --- Form Handling ---

	// Basic input change handler
	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		let newValue = value;

		// Handle checkbox type (for is_active)
		if (type === "checkbox" && name === "is_active") {
			newValue = checked;
		}
		// Handle radio button type (for apply_to)
		else if (type === "radio" && name === "apply_to") {
			// Clear irrelevant selections when changing apply_to
			setFormData((prev) => ({
				...prev,
				apply_to: value,
				products: value !== "product" ? [] : prev.products,
				categories: value !== "category" ? [] : prev.categories,
			}));
			// Clear potential validation errors for products/categories
			setFormErrors((prev) => ({ ...prev, products: null, categories: null }));
			return; // Exit early as state is set within setFormData
		}

		// Update form data
		setFormData((prev) => ({ ...prev, [name]: newValue }));

		// Clear validation error for the field being changed
		if (formErrors[name]) {
			setFormErrors((prev) => ({ ...prev, [name]: null }));
		}
	};

	// Handler for product/category checkbox lists
	const handleCheckboxListChange = (e, listType) => {
		// listType is 'products' or 'categories'
		const { value, checked } = e.target;
		const itemId = parseInt(value, 10); // Ensure it's a number

		setFormData((prev) => {
			const currentList = prev[listType] || [];
			let updatedList;

			if (checked) {
				// Add ID if checked and not already present
				updatedList = currentList.includes(itemId)
					? currentList
					: [...currentList, itemId];
			} else {
				// Remove ID if unchecked
				updatedList = currentList.filter((id) => id !== itemId);
			}
			return { ...prev, [listType]: updatedList };
		});

		// Clear validation error for the list when an item is changed
		if (formErrors[listType]) {
			setFormErrors((prev) => ({ ...prev, [listType]: null }));
		}
	};

	// --- Frontend Validation ---
	const validateForm = () => {
		const errors = {};
		if (!formData.name.trim()) {
			errors.name = "Discount Name is required.";
		}
		if (
			formData.value === "" ||
			formData.value === null ||
			isNaN(parseFloat(formData.value))
		) {
			errors.value = "Discount Value is required and must be a number.";
		} else {
			const numValue = parseFloat(formData.value);
			if (
				formData.discount_type === "percentage" &&
				(numValue < 0 || numValue > 100)
			) {
				errors.value = "Percentage value must be between 0 and 100.";
			} else if (formData.discount_type === "fixed" && numValue <= 0) {
				errors.value = "Fixed amount must be greater than 0.";
			}
		}
		if (formData.apply_to === "product" && formData.products.length === 0) {
			errors.products = "Please select at least one product.";
		}
		if (formData.apply_to === "category" && formData.categories.length === 0) {
			errors.categories = "Please select at least one category.";
		}
		if (
			formData.discount_category === "promotional" &&
			formData.start_date &&
			formData.end_date &&
			formData.start_date > formData.end_date
		) {
			errors.end_date = "End date cannot be before the start date.";
		}
		// Add more validation as needed (e.g., usage limit, min amount format)

		setFormErrors(errors);
		return Object.keys(errors).length === 0; // Return true if no errors
	};

	// --- Form Submission ---
	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validateForm()) {
			toast.warn("Please fix the errors in the form.");
			return;
		}

		setIsSubmitting(true); // Indicate submission start

		try {
			// Prepare data, ensuring numeric types and handling nulls/dates
			const submitData = { ...formData };

			// Convert numeric fields, handle nulls
			submitData.value = parseFloat(submitData.value);
			submitData.minimum_order_amount = submitData.minimum_order_amount
				? parseFloat(submitData.minimum_order_amount)
				: null;
			submitData.usage_limit = submitData.usage_limit
				? parseInt(submitData.usage_limit, 10)
				: null;

			// Handle dates based on category
			if (submitData.discount_category === "permanent") {
				submitData.start_date = null;
				submitData.end_date = null;
			} else {
				// Promotional
				// Format dates with time for backend (adjust time as needed by backend)
				submitData.start_date = submitData.start_date
					? `${submitData.start_date}T00:00:00Z`
					: null;
				submitData.end_date = submitData.end_date
					? `${submitData.end_date}T23:59:59Z`
					: null;
			}

			// Ensure product/category IDs are integers (already handled in state, but good practice)
			submitData.products = submitData.products.map((id) => parseInt(id, 10));
			submitData.categories = submitData.categories.map((id) =>
				parseInt(id, 10)
			);

			// Remove irrelevant product/category arrays based on apply_to
			if (submitData.apply_to !== "product") delete submitData.products;
			if (submitData.apply_to !== "category") delete submitData.categories;

			console.log(
				"Submitting discount data:",
				JSON.stringify(submitData, null, 2)
			);

			// Call API via useApi hook
			if (isEditMode) {
				await execute(() => discountService.updateDiscount(id, submitData), {
					successMessage: "Discount updated successfully!",
				});
			} else {
				await execute(() => discountService.createDiscount(submitData), {
					successMessage: "Discount created successfully!",
				});
			}

			navigate("/discounts"); // Navigate back to list on success
		} catch (error) {
			console.error("Error saving discount:", error);
			// Error toast is likely handled by useApi, but we can add specifics if needed
			// Example: Check for validation errors from backend
			if (error.response?.data && typeof error.response.data === "object") {
				const backendErrors = error.response.data;
				// Map backend errors to form fields if possible
				const newFormErrors = { ...formErrors };
				Object.keys(backendErrors).forEach((field) => {
					newFormErrors[field] = Array.isArray(backendErrors[field])
						? backendErrors[field].join(" ")
						: backendErrors[field];
				});
				setFormErrors(newFormErrors);
				toast.error(
					"Failed to save discount due to validation errors from the server."
				);
			} else {
				// General error toast handled by useApi or show a fallback
				toast.error(
					error.message || "An unexpected error occurred while saving."
				);
			}
		} finally {
			setIsSubmitting(false); // Indicate submission end
		}
	};

	// --- Loading State ---
	// Show loading spinner if fetching discount data in edit mode OR if fetching options
	const isLoadingPage =
		(isEditMode && isApiLoading && !formData.name) || isOptionsLoading;
	if (isLoadingPage) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-slate-100">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	// --- Render Form ---
	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 p-4 text-slate-900 sm:p-6">
			{/* Header */}
			<header className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 sm:text-2xl">
					<TagIcon className="h-6 w-6 text-orange-500" />
					{isEditMode ? "Edit Discount" : "Create New Discount"}
				</h1>
				<button
					className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					onClick={() => navigate("/discounts")}
					disabled={isSubmitting} // Disable back button during submission
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Back to List
				</button>
			</header>

			{/* Form Area */}
			<div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm custom-scrollbar sm:p-6">
				<form
					onSubmit={handleSubmit}
					noValidate
				>
					{" "}
					{/* Disable browser validation, rely on ours */}
					<div className="grid grid-cols-1 gap-x-6 lg:grid-cols-3">
						{/* Left Column (or Full Width on Small Screens) */}
						<div className="space-y-4 lg:col-span-2">
							{/* Section 1: Basic Information */}
							<section>
								<FormSectionHeading>Basic Information</FormSectionHeading>
								<FormField
									label="Discount Name"
									id="discount-name"
									required
									error={formErrors.name}
								>
									<input
										type="text"
										id="discount-name"
										name="name"
										value={formData.name}
										onChange={handleChange}
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.name
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-orange-600"
										} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
										required
										aria-invalid={!!formErrors.name}
										aria-describedby={
											formErrors.name ? "name-error" : undefined
										}
									/>
								</FormField>

								<FormField
									label="Discount Category"
									id="discount-category"
									required
									error={formErrors.discount_category}
									helpText={
										formData.discount_category === "promotional"
											? "Promotional discounts can have start/end dates."
											: "Permanent discounts apply indefinitely."
									}
								>
									<select
										id="discount-category"
										name="discount_category"
										value={formData.discount_category}
										onChange={handleChange}
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.discount_category
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-orange-600"
										} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
										required
									>
										<option value="promotional">
											Promotional (Time-limited)
										</option>
										<option value="permanent">Permanent Discount</option>
									</select>
								</FormField>

								<FormField
									label="Discount Code"
									id="discount-code"
									helpText="Optional. Leave blank for automatic application."
									error={formErrors.code}
								>
									<input
										type="text"
										id="discount-code"
										name="code"
										value={formData.code ?? ""}
										onChange={handleChange}
										placeholder="e.g., SUMMER25"
										className={`block w-full rounded-md border-0 px-3 py-1.5 font-mono text-sm uppercase text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.code
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-orange-600"
										} placeholder:text-slate-400 placeholder:normal-case placeholder:font-sans focus:ring-2 focus:ring-inset sm:leading-6`}
										aria-invalid={!!formErrors.code}
									/>
								</FormField>

								<FormField
									label="Description"
									id="discount-description"
									helpText="Optional internal note or customer-facing description."
									error={formErrors.description}
								>
									<textarea
										id="discount-description"
										name="description"
										value={formData.description ?? ""}
										onChange={handleChange}
										rows="3"
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.description
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-orange-600"
										} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
										aria-invalid={!!formErrors.description}
									/>
								</FormField>
							</section>

							{/* Section 2: Discount Details */}
							<section className="mt-6">
								<FormSectionHeading>Discount Details</FormSectionHeading>
								<div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
									<FormField
										label="Discount Type"
										id="discount-type"
										required
										error={formErrors.discount_type}
									>
										<select
											id="discount-type"
											name="discount_type"
											value={formData.discount_type}
											onChange={handleChange}
											className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
												formErrors.discount_type
													? "ring-red-500 focus:ring-red-600"
													: "ring-slate-300 focus:ring-orange-600"
											} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
											required
										>
											<option value="percentage">Percentage (%)</option>
											<option value="fixed">Fixed Amount ($)</option>
										</select>
									</FormField>
									<FormField
										label={`Value ${
											formData.discount_type === "percentage" ? "(%)" : "($)"
										}`}
										id="discount-value"
										required
										error={formErrors.value}
									>
										<input
											type="number"
											id="discount-value"
											name="value"
											value={formData.value}
											onChange={handleChange}
											className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
												formErrors.value
													? "ring-red-500 focus:ring-red-600"
													: "ring-slate-300 focus:ring-orange-600"
											} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
											min={
												formData.discount_type === "percentage" ? "0" : "0.01"
											}
											max={
												formData.discount_type === "percentage"
													? "100"
													: undefined
											}
											step={
												formData.discount_type === "percentage" ? "1" : "0.01"
											}
											required
											aria-invalid={!!formErrors.value}
										/>
									</FormField>
								</div>

								{/* Apply To Radio Buttons */}
								<div className="mt-4">
									<label className="block text-sm font-medium text-slate-700 mb-2">
										Apply To*
									</label>
									<div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
										{["order", "product", "category"].map((applyType) => (
											<label
												key={applyType}
												className="flex items-center cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50 has-[:checked]:bg-orange-50 has-[:checked]:border-orange-300"
											>
												<input
													type="radio"
													name="apply_to"
													value={applyType}
													checked={formData.apply_to === applyType}
													onChange={handleChange}
													className="h-4 w-4 border-slate-300 text-orange-600 focus:ring-orange-500"
												/>
												<span className="ml-2 text-sm text-slate-700 capitalize">
													{applyType === "order"
														? "Entire Order"
														: applyType === "product"
														? "Specific Products"
														: "Product Categories"}
												</span>
											</label>
										))}
									</div>
									{formErrors.apply_to && (
										<p className="mt-1 text-xs text-red-600">
											{formErrors.apply_to}
										</p>
									)}
								</div>

								{/* Product Checkbox List */}
								{formData.apply_to === "product" && (
									<FormField
										label="Select Products"
										id="products-list"
										required
										error={formErrors.products}
									>
										<div className="mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-300 bg-slate-50/50 p-2 custom-scrollbar">
											{isOptionsLoading ? (
												<p className="text-sm text-slate-500 italic p-2">
													Loading products...
												</p>
											) : allProducts.length === 0 ? (
												<p className="text-sm text-slate-500 italic p-2">
													No products found.
												</p>
											) : (
												allProducts.map((product) => (
													<label
														key={product.id}
														className="flex items-center space-x-2 rounded p-1.5 hover:bg-slate-100 cursor-pointer"
													>
														<input
															type="checkbox"
															name="products"
															value={product.id}
															checked={formData.products.includes(product.id)}
															onChange={(e) =>
																handleCheckboxListChange(e, "products")
															}
															className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
														/>
														<span className="text-sm text-slate-800">
															{product.name} - ${product.price}
														</span>
													</label>
												))
											)}
										</div>
									</FormField>
								)}

								{/* Category Checkbox List */}
								{formData.apply_to === "category" && (
									<FormField
										label="Select Categories"
										id="categories-list"
										required
										error={formErrors.categories}
									>
										<div className="mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-300 bg-slate-50/50 p-2 custom-scrollbar">
											{isOptionsLoading ? (
												<p className="text-sm text-slate-500 italic p-2">
													Loading categories...
												</p>
											) : allCategories.length === 0 ? (
												<p className="text-sm text-slate-500 italic p-2">
													No categories found.
												</p>
											) : (
												allCategories.map((category) => (
													<label
														key={category.id}
														className="flex items-center space-x-2 rounded p-1.5 hover:bg-slate-100 cursor-pointer"
													>
														<input
															type="checkbox"
															name="categories"
															value={category.id}
															checked={formData.categories.includes(
																category.id
															)}
															onChange={(e) =>
																handleCheckboxListChange(e, "categories")
															}
															className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
														/>
														<span className="text-sm text-slate-800">
															{category.name}
														</span>
													</label>
												))
											)}
										</div>
									</FormField>
								)}
							</section>
						</div>

						{/* Right Column (or Full Width on Small Screens) */}
						<div className="space-y-4 lg:col-span-1 lg:mt-0">
							{" "}
							{/* Removed mt-6 for lg */}
							{/* Section 3: Validity and Limits */}
							<section>
								<FormSectionHeading>Validity & Limits</FormSectionHeading>
								{/* Active Checkbox */}
								<div className="mb-4 flex items-center">
									<input
										type="checkbox"
										id="is_active"
										name="is_active"
										checked={formData.is_active}
										onChange={handleChange}
										className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
									/>
									<label
										htmlFor="is_active"
										className="ml-2 block text-sm font-medium text-slate-700"
									>
										Discount is Active
									</label>
								</div>

								{/* Date fields only for promotional */}
								{formData.discount_category === "promotional" && (
									<>
										<FormField
											label="Start Date"
											id="start-date"
											helpText="Optional. Discount active from this date."
											error={formErrors.start_date}
										>
											<input
												type="date"
												id="start-date"
												name="start_date"
												value={formData.start_date}
												onChange={handleChange}
												className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
													formErrors.start_date
														? "ring-red-500 focus:ring-red-600"
														: "ring-slate-300 focus:ring-orange-600"
												} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
												aria-invalid={!!formErrors.start_date}
											/>
										</FormField>
										<FormField
											label="End Date"
											id="end-date"
											helpText="Optional. Discount expires after this date."
											error={formErrors.end_date}
										>
											<input
												type="date"
												id="end-date"
												name="end_date"
												value={formData.end_date}
												onChange={handleChange}
												min={formData.start_date || ""} // Basic validation
												className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
													formErrors.end_date
														? "ring-red-500 focus:ring-red-600"
														: "ring-slate-300 focus:ring-orange-600"
												} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
												aria-invalid={!!formErrors.end_date}
											/>
										</FormField>
									</>
								)}

								{/* Info box for permanent */}
								{formData.discount_category === "permanent" && (
									<div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
										<p>Date limits are disabled for permanent discounts.</p>
									</div>
								)}

								<FormField
									label="Minimum Order Amount ($)"
									id="min-order-amount"
									helpText="Optional. Order subtotal required to apply discount."
									error={formErrors.minimum_order_amount}
								>
									<input
										type="number"
										id="min-order-amount"
										name="minimum_order_amount"
										value={formData.minimum_order_amount}
										onChange={handleChange}
										placeholder="e.g., 50.00"
										min="0"
										step="0.01"
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.minimum_order_amount
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-orange-600"
										} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
										aria-invalid={!!formErrors.minimum_order_amount}
									/>
								</FormField>

								<FormField
									label="Usage Limit"
									id="usage-limit"
									helpText="Optional. Max times the discount can be used in total."
									error={formErrors.usage_limit}
								>
									<input
										type="number"
										id="usage-limit"
										name="usage_limit"
										value={formData.usage_limit}
										onChange={handleChange}
										placeholder="e.g., 100"
										min="0"
										step="1"
										className={`block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${
											formErrors.usage_limit
												? "ring-red-500 focus:ring-red-600"
												: "ring-slate-300 focus:ring-orange-600"
										} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
										aria-invalid={!!formErrors.usage_limit}
									/>
								</FormField>
							</section>
						</div>
					</div>
					{/* Submit Buttons */}
					<div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
						<button
							type="button"
							onClick={() => navigate("/discounts")}
							disabled={isSubmitting}
							className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || isApiLoading} // Disable if submitting or initial data is loading
							className="inline-flex items-center justify-center rounded-md bg-orange-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-orange-400"
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
									{isEditMode ? "Updating..." : "Creating..."}
								</>
							) : (
								<>{isEditMode ? "Update Discount" : "Create Discount"}</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
