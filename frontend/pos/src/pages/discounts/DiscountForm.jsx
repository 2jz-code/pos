// src/pages/discounts/DiscountForm.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { discountService } from "../../api/services/discountService";
import axiosInstance from "../../api/config/axiosConfig";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	TagIcon,
	ArrowLeftIcon,
	InformationCircleIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";

export default function DiscountForm() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { execute, isLoading } = useApi();
	const isEditMode = !!id;

	// Form state
	const [formData, setFormData] = useState({
		name: "",
		code: "",
		description: "",
		discount_type: "percentage",
		value: "",
		apply_to: "order", // Default apply_to
		products: [], // Store selected product IDs
		categories: [], // Store selected category IDs
		is_active: true,
		start_date: "",
		end_date: "",
		minimum_order_amount: "",
		usage_limit: "",
		discount_category: "promotional",
	});

	// Options for selects/checkboxes
	const [allProducts, setAllProducts] = useState([]); // Renamed to avoid confusion
	const [allCategories, setAllCategories] = useState([]); // Renamed to avoid confusion
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Fetch discount data for edit mode
	useEffect(() => {
		const fetchData = async () => {
			if (isEditMode) {
				try {
					const discount = await execute(() => discountService.getDiscount(id));
					if (discount) {
						const formattedDiscount = {
							...discount,
							// Ensure products/categories are arrays of IDs (or empty arrays)
							// The backend sends product/category IDs directly in the 'products' and 'categories' fields
							products: discount.products || [],
							categories: discount.categories || [],
							start_date: discount.start_date
								? new Date(discount.start_date).toISOString().split("T")[0]
								: "",
							end_date: discount.end_date
								? new Date(discount.end_date).toISOString().split("T")[0]
								: "",
							// Ensure numeric fields are handled correctly if they are null/undefined
							value: discount.value ?? "",
							minimum_order_amount: discount.minimum_order_amount ?? "",
							usage_limit: discount.usage_limit ?? "",
						};
						setFormData(formattedDiscount);
					}
				} catch (error) {
					console.error("Error fetching discount:", error);
					toast.error("Failed to load discount details");
				}
			}
		};

		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, isEditMode]); // Removed 'execute' as it's stable from useApi hook

	// Fetch products and categories
	useEffect(() => {
		const fetchOptions = async () => {
			try {
				const [productsResponse, categoriesResponse] = await Promise.all([
					axiosInstance.get("products/"),
					axiosInstance.get("products/categories/"),
				]);
				setAllProducts(productsResponse.data || []);
				setAllCategories(categoriesResponse.data || []);
			} catch (error) {
				console.error("Error fetching options:", error);
				toast.error("Failed to load products and categories");
			}
		};
		fetchOptions();
	}, []);

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;

		if (type === "checkbox" && name !== "products" && name !== "categories") {
			// Handle regular checkboxes like 'is_active'
			setFormData((prev) => ({ ...prev, [name]: checked }));
		} else if (type === "radio" && name === "apply_to") {
			// Handle Apply To radio buttons
			setFormData((prev) => ({
				...prev,
				apply_to: value,
				// Clear products/categories when changing apply_to type
				products: value !== "product" ? [] : prev.products,
				categories: value !== "category" ? [] : prev.categories,
			}));
		} else {
			// Handle regular inputs, textareas, selects (excluding multi-selects)
			setFormData((prev) => ({ ...prev, [name]: value }));
		}
	};

	// Handler for product/category checkboxes
	const handleCheckboxListChange = (e, listType) => {
		const { value, checked } = e.target;
		const itemId = parseInt(value, 10); // Ensure value is an integer ID

		setFormData((prev) => {
			const currentList = prev[listType] || []; // Get current list (products or categories)
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
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Basic frontend validation for checkbox lists
		if (formData.apply_to === "product" && formData.products.length === 0) {
			toast.error("Please select at least one product for the discount.");
			return;
		}
		if (formData.apply_to === "category" && formData.categories.length === 0) {
			toast.error("Please select at least one category for the discount.");
			return;
		}

		setIsSubmitting(true);

		try {
			// Prepare data for submission - Convert IDs to integers
			const submitData = {
				...formData,
				// Ensure product/category IDs are integers
				products: formData.products.map((id) => parseInt(id, 10)),
				categories: formData.categories.map((id) => parseInt(id, 10)),
			};

			// Handle permanent discount dates
			if (submitData.discount_category === "permanent") {
				submitData.start_date = null;
				submitData.end_date = null;
			} else {
				// Format dates properly if they exist
				if (submitData.start_date) {
					submitData.start_date = `${submitData.start_date}T00:00:00Z`;
				} else {
					submitData.start_date = null; // Ensure null if empty
				}
				if (submitData.end_date) {
					submitData.end_date = `${submitData.end_date}T23:59:59Z`;
				} else {
					submitData.end_date = null; // Ensure null if empty
				}
			}

			// Handle usage_limit
			if (submitData.usage_limit === "" || submitData.usage_limit === null) {
				submitData.usage_limit = null;
			} else {
				submitData.usage_limit = parseInt(submitData.usage_limit, 10);
			}

			// Handle minimum_order_amount
			if (
				submitData.minimum_order_amount === "" ||
				submitData.minimum_order_amount === null
			) {
				submitData.minimum_order_amount = null;
			} else {
				submitData.minimum_order_amount = parseFloat(
					submitData.minimum_order_amount
				);
			}

			// Ensure value is a float
			if (submitData.value === "" || submitData.value === null) {
				toast.error("Discount Value is required.");
				setIsSubmitting(false);
				return;
			}
			submitData.value = parseFloat(submitData.value);

			// Remove empty arrays if apply_to doesn't match
			if (submitData.apply_to !== "product") {
				delete submitData.products;
			}
			if (submitData.apply_to !== "category") {
				delete submitData.categories;
			}

			console.log(
				"Submitting discount data:",
				JSON.stringify(submitData, null, 2)
			); // Added JSON.stringify for better readability

			if (isEditMode) {
				await execute(() => discountService.updateDiscount(id, submitData), {
					successMessage: "Discount updated successfully",
				});
			} else {
				await execute(() => discountService.createDiscount(submitData), {
					successMessage: "Discount created successfully",
				});
			}

			navigate("/discounts");
		} catch (error) {
			console.error("Error saving discount:", error);
			if (error.response && error.response.data) {
				const errorData = error.response.data;
				let errorMessages = "";
				if (typeof errorData === "object") {
					errorMessages = Object.entries(errorData)
						.map(
							([field, errors]) =>
								`${field}: ${
									Array.isArray(errors) ? errors.join(", ") : errors
								}`
						)
						.join("\n");
				} else {
					errorMessages = String(errorData); // Handle cases where errorData is a simple string
				}
				toast.error(`Failed to save discount:\n${errorMessages}`, {
					autoClose: 7000,
					style: { whiteSpace: "pre-line" },
				}); // Increased duration and added pre-line style
			} else {
				toast.error(
					"Failed to save discount. Check connection or server status."
				);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isEditMode && isLoading && !formData.name) {
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
				<div className="flex items-center">
					<TagIcon className="h-6 w-6 text-orange-500 mr-2" />
					<h1 className="text-2xl font-bold text-slate-800">
						{isEditMode ? "Edit Discount" : "Create Discount"}
					</h1>
				</div>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
					onClick={() => navigate("/discounts")}
				>
					<ArrowLeftIcon className="h-5 w-5" />
					Back to Discounts
				</button>
			</div>

			{/* Form Card */}
			<div className="flex-1 bg-white rounded-xl shadow-sm p-6 overflow-y-auto">
				<form onSubmit={handleSubmit}>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
						{" "}
						{/* Adjusted gap */}
						{/* Basic Information */}
						<div className="space-y-4 md:col-span-2">
							<h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">
								{" "}
								{/* Added margin-bottom */}
								Basic Information
							</h2>
							<div>
								<label
									htmlFor="discount-name"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Discount Name*
								</label>
								<input
									type="text"
									id="discount-name"
									name="name"
									value={formData.name}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="discount-category"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Discount Category*
								</label>
								<select
									id="discount-category"
									name="discount_category"
									value={formData.discount_category}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									required
								>
									<option value="promotional">
										Promotional (Time-limited)
									</option>
									<option value="permanent">Permanent Discount</option>
								</select>
								<div className="mt-1 text-xs text-slate-500 flex items-center">
									<InformationCircleIcon className="h-4 w-4 mr-1 text-slate-400" />
									{formData.discount_category === "promotional"
										? "A promotional discount with a specific time period"
										: "A permanent discount (like employee or loyalty) without time restrictions"}
								</div>
							</div>
							<div>
								<label
									htmlFor="discount-code"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Discount Code
								</label>
								<input
									type="text"
									id="discount-code"
									name="code"
									value={formData.code ?? ""} // Handle null value
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									placeholder="SUMMER2023 (optional)"
								/>
								<p className="mt-1 text-xs text-slate-500">
									Leave blank for automatic discounts that don&apos;t require a
									code.
								</p>
							</div>

							<div>
								<label
									htmlFor="discount-description"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Description
								</label>
								<textarea
									id="discount-description"
									name="description"
									value={formData.description ?? ""} // Handle null value
									onChange={handleChange}
									rows="3"
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
								/>
							</div>
						</div>
						{/* Discount Type and Value */}
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">
								{" "}
								{/* Added margin-bottom */}
								Discount Details
							</h2>
							<div>
								<label
									htmlFor="discount-type"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Discount Type*
								</label>
								<select
									id="discount-type"
									name="discount_type"
									value={formData.discount_type}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									required
								>
									<option value="percentage">Percentage Discount</option>
									<option value="fixed">Fixed Amount Discount</option>
								</select>
							</div>

							<div>
								<label
									htmlFor="discount-value"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									{formData.discount_type === "percentage"
										? "Percentage (%)*"
										: "Amount ($)*"}
								</label>
								<input
									type="number"
									id="discount-value"
									name="value"
									value={formData.value}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									min={formData.discount_type === "percentage" ? "0" : "0.01"}
									max={formData.discount_type === "percentage" ? "100" : ""}
									step={formData.discount_type === "percentage" ? "1" : "0.01"}
									required
								/>
							</div>

							{/* Apply To Radio Buttons */}
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">
									{" "}
									{/* Added margin-bottom */}
									Apply To*
								</label>
								<div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0">
									<label className="flex items-center cursor-pointer">
										<input
											type="radio"
											name="apply_to"
											value="order"
											checked={formData.apply_to === "order"}
											onChange={handleChange}
											className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-300"
										/>
										<span className="ml-2 text-sm text-slate-700">
											Entire Order
										</span>
									</label>
									<label className="flex items-center cursor-pointer">
										<input
											type="radio"
											name="apply_to"
											value="product"
											checked={formData.apply_to === "product"}
											onChange={handleChange}
											className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-300"
										/>
										<span className="ml-2 text-sm text-slate-700">
											Specific Products
										</span>
									</label>
									<label className="flex items-center cursor-pointer">
										<input
											type="radio"
											name="apply_to"
											value="category"
											checked={formData.apply_to === "category"}
											onChange={handleChange}
											className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-300"
										/>
										<span className="ml-2 text-sm text-slate-700">
											Product Categories
										</span>
									</label>
								</div>
								<div className="mt-2 text-xs text-slate-500 flex items-center">
									<InformationCircleIcon className="h-4 w-4 mr-1 text-slate-400" />
									Select where this discount should be applied
								</div>
							</div>

							{/* Product Checkbox List */}
							{formData.apply_to === "product" && (
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Select Products*
									</label>
									<div className="max-h-60 overflow-y-auto border border-slate-300 rounded-md p-2 bg-slate-50">
										{allProducts.length === 0 && (
											<p className="text-sm text-slate-500">
												Loading products...
											</p>
										)}
										{allProducts.map((product) => (
											<label
												key={product.id}
												className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer"
											>
												<input
													type="checkbox"
													name="products" // Name indicates the list type
													value={product.id} // Value is the ID
													checked={formData.products.includes(product.id)} // Check if ID is in state
													onChange={(e) =>
														handleCheckboxListChange(e, "products")
													} // Pass list type
													className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-300 rounded"
												/>
												<span className="text-sm text-slate-800">
													{product.name} - ${product.price}
												</span>
											</label>
										))}
									</div>
									<p className="mt-1 text-xs text-slate-500">
										Check the box next to each product the discount applies to.
									</p>
									{/* Basic validation message */}
									{formData.apply_to === "product" &&
										formData.products.length === 0 && (
											<p className="mt-1 text-xs text-red-600">
												Please select at least one product.
											</p>
										)}
								</div>
							)}

							{/* Category Checkbox List */}
							{formData.apply_to === "category" && (
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Select Categories*
									</label>
									<div className="max-h-60 overflow-y-auto border border-slate-300 rounded-md p-2 bg-slate-50">
										{allCategories.length === 0 && (
											<p className="text-sm text-slate-500">
												Loading categories...
											</p>
										)}
										{allCategories.map((category) => (
											<label
												key={category.id}
												className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer"
											>
												<input
													type="checkbox"
													name="categories" // Name indicates the list type
													value={category.id} // Value is the ID
													checked={formData.categories.includes(category.id)} // Check if ID is in state
													onChange={(e) =>
														handleCheckboxListChange(e, "categories")
													} // Pass list type
													className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-300 rounded"
												/>
												<span className="text-sm text-slate-800">
													{category.name}
												</span>
											</label>
										))}
									</div>
									<p className="mt-1 text-xs text-slate-500">
										Check the box next to each category the discount applies to.
									</p>
									{/* Basic validation message */}
									{formData.apply_to === "category" &&
										formData.categories.length === 0 && (
											<p className="mt-1 text-xs text-red-600">
												Please select at least one category.
											</p>
										)}
								</div>
							)}
						</div>
						{/* Validity and Limits */}
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">
								{" "}
								{/* Added margin-bottom */}
								Validity and Limits
							</h2>
							<div className="flex items-center mb-4">
								<input
									type="checkbox"
									id="is_active"
									name="is_active"
									checked={formData.is_active}
									onChange={handleChange}
									className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-300 rounded"
								/>
								<label
									htmlFor="is_active"
									className="ml-2 block text-sm text-slate-700"
								>
									Active
								</label>
							</div>

							{/* Show date fields only for promotional discounts */}
							{formData.discount_category === "promotional" && (
								<>
									<div>
										<label
											htmlFor="start-date"
											className="block text-sm font-medium text-slate-700 mb-1"
										>
											Start Date
										</label>
										<input
											type="date"
											id="start-date"
											name="start_date"
											value={formData.start_date}
											onChange={handleChange}
											className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
										/>
									</div>

									<div>
										<label
											htmlFor="end-date"
											className="block text-sm font-medium text-slate-700 mb-1"
										>
											End Date
										</label>
										<input
											type="date"
											id="end-date"
											name="end_date"
											value={formData.end_date}
											onChange={handleChange}
											className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
											min={formData.start_date || ""} // Prevent end date before start date
										/>
									</div>
								</>
							)}

							{formData.discount_category === "permanent" && (
								<div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
									<p>This is a permanent discount with no expiration date.</p>
								</div>
							)}

							<div>
								<label
									htmlFor="min-order-amount"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Minimum Order Amount ($)
								</label>
								<input
									type="number"
									id="min-order-amount"
									name="minimum_order_amount"
									value={formData.minimum_order_amount}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									min="0"
									step="0.01"
									placeholder="e.g., 50.00"
								/>
								<p className="mt-1 text-xs text-slate-500">
									Leave blank for no minimum purchase requirement
								</p>
							</div>

							<div>
								<label
									htmlFor="usage-limit"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Usage Limit
								</label>
								<input
									type="number"
									id="usage-limit"
									name="usage_limit"
									value={formData.usage_limit}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									min="0"
									step="1"
									placeholder="e.g., 100"
								/>
								<p className="mt-1 text-xs text-slate-500">
									Maximum number of times this discount can be used. Leave blank
									for unlimited.
								</p>
							</div>
						</div>
					</div>

					{/* Submit Buttons */}
					<div className="mt-8 flex justify-end space-x-4">
						<button
							type="button"
							onClick={() => navigate("/discounts")}
							className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={
								isSubmitting ||
								(formData.apply_to === "product" &&
									formData.products.length === 0) ||
								(formData.apply_to === "category" &&
									formData.categories.length === 0)
							}
							className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-300 disabled:cursor-not-allowed"
						>
							{isSubmitting ? (
								<span className="flex items-center">
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
								</span>
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
