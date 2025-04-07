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
		apply_to: "order",
		products: [],
		categories: [],
		is_active: true,
		start_date: "",
		end_date: "",
		minimum_order_amount: "",
		usage_limit: "",
		discount_category: "promotional",
	});

	// Options for selects
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Fetch discount data for edit mode
	useEffect(() => {
		const fetchData = async () => {
			if (isEditMode) {
				try {
					const discount = await execute(() => discountService.getDiscount(id));
					if (discount) {
						// Format dates for form inputs
						const formattedDiscount = {
							...discount,
							start_date: discount.start_date
								? new Date(discount.start_date).toISOString().split("T")[0]
								: "",
							end_date: discount.end_date
								? new Date(discount.end_date).toISOString().split("T")[0]
								: "",
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
	}, [id, isEditMode, execute]);

	// Fetch products and categories
	useEffect(() => {
		const fetchOptions = async () => {
			try {
				const [productsResponse, categoriesResponse] = await Promise.all([
					axiosInstance.get("products/"),
					axiosInstance.get("products/categories/"),
				]);

				setProducts(productsResponse.data || []);
				setCategories(categoriesResponse.data || []);
			} catch (error) {
				console.error("Error fetching options:", error);
				toast.error("Failed to load products and categories");
			}
		};

		fetchOptions();
	}, []);

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;

		if (type === "checkbox") {
			setFormData({ ...formData, [name]: checked });
		} else if (name === "products" || name === "categories") {
			// Handle multi-select
			const options = Array.from(
				e.target.selectedOptions,
				(option) => option.value
			);
			setFormData({ ...formData, [name]: options });
		} else {
			setFormData({ ...formData, [name]: value });
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			// Prepare data for submission
			const submitData = { ...formData };

			// Handle permanent discount dates - remove date fields for permanent discounts
			if (submitData.discount_category === "permanent") {
				// Set dates to null for permanent discounts
				submitData.start_date = null;
				submitData.end_date = null;
			} else {
				// For promotional discounts, format dates properly if they exist
				if (submitData.start_date) {
					// Convert YYYY-MM-DD to YYYY-MM-DDT00:00:00Z
					submitData.start_date = `${submitData.start_date}T00:00:00Z`;
				}

				if (submitData.end_date) {
					// Convert YYYY-MM-DD to YYYY-MM-DDT23:59:59Z
					submitData.end_date = `${submitData.end_date}T23:59:59Z`;
				}
			}

			// Handle usage_limit - convert empty string to null
			if (submitData.usage_limit === "") {
				submitData.usage_limit = null;
			} else if (submitData.usage_limit) {
				// Ensure it's an integer
				submitData.usage_limit = parseInt(submitData.usage_limit, 10);
			}

			// Convert minimum_order_amount from empty string to null or to a float
			if (submitData.minimum_order_amount === "") {
				submitData.minimum_order_amount = null;
			} else if (submitData.minimum_order_amount) {
				submitData.minimum_order_amount = parseFloat(
					submitData.minimum_order_amount
				);
			}

			// Ensure value is a float
			submitData.value = parseFloat(submitData.value);

			// Handle empty arrays
			if (!submitData.products || !submitData.products.length) {
				delete submitData.products;
			}

			if (!submitData.categories || !submitData.categories.length) {
				delete submitData.categories;
			}

			console.log("Submitting discount data:", submitData);

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

			// Enhanced error handling to show the actual server error message
			if (error.response && error.response.data) {
				// Format and display the validation errors
				const errorData = error.response.data;
				const errorMessages = Object.entries(errorData)
					.map(([field, errors]) => `${field}: ${errors.join(", ")}`)
					.join("\n");

				toast.error(`Failed to save discount: ${errorMessages}`);
			} else {
				toast.error("Failed to save discount");
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
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Basic Information */}
						<div className="space-y-4 md:col-span-2">
							<h2 className="text-lg font-semibold text-slate-800 border-b pb-2">
								Basic Information
							</h2>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Discount Name*
								</label>
								<input
									type="text"
									name="name"
									value={formData.name}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Discount Category*
								</label>
								<select
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
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Discount Code
								</label>
								<input
									type="text"
									name="code"
									value={formData.code}
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
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Description
								</label>
								<textarea
									name="description"
									value={formData.description}
									onChange={handleChange}
									rows="3"
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
								/>
							</div>
						</div>

						{/* Discount Type and Value */}
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-slate-800 border-b pb-2">
								Discount Details
							</h2>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Discount Type*
								</label>
								<select
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
								<label className="block text-sm font-medium text-slate-700 mb-1">
									{formData.discount_type === "percentage"
										? "Percentage (%)*"
										: "Amount ($)*"}
								</label>
								<input
									type="number"
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

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Apply To*
								</label>
								<select
									name="apply_to"
									value={formData.apply_to}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									required
								>
									<option value="order">Entire Order</option>
									<option value="product">Specific Products</option>
									<option value="category">Product Categories</option>
								</select>
								<div className="mt-1 text-xs text-slate-500 flex items-center">
									<InformationCircleIcon className="h-4 w-4 mr-1 text-slate-400" />
									Select where this discount should be applied
								</div>
							</div>

							{formData.apply_to === "product" && (
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Select Products*
									</label>
									<select
										name="products"
										value={formData.products}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
										multiple
										size="5"
										required={formData.apply_to === "product"}
									>
										{products.map((product) => (
											<option
												key={product.id}
												value={product.id}
											>
												{product.name} - ${product.price}
											</option>
										))}
									</select>
									<p className="mt-1 text-xs text-slate-500">
										Hold Ctrl (or Cmd) to select multiple products
									</p>
								</div>
							)}

							{formData.apply_to === "category" && (
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Select Categories*
									</label>
									<select
										name="categories"
										value={formData.categories}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
										multiple
										size="5"
										required={formData.apply_to === "category"}
									>
										{categories.map((category) => (
											<option
												key={category.id}
												value={category.id}
											>
												{category.name}
											</option>
										))}
									</select>
									<p className="mt-1 text-xs text-slate-500">
										Hold Ctrl (or Cmd) to select multiple categories
									</p>
								</div>
							)}
						</div>

						{/* Validity and Limits */}
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-slate-800 border-b pb-2">
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
										<label className="block text-sm font-medium text-slate-700 mb-1">
											Start Date
										</label>
										<input
											type="date"
											name="start_date"
											value={formData.start_date}
											onChange={handleChange}
											className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-slate-700 mb-1">
											End Date
										</label>
										<input
											type="date"
											name="end_date"
											value={formData.end_date}
											onChange={handleChange}
											className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Minimum Order Amount ($)
								</label>
								<input
									type="number"
									name="minimum_order_amount"
									value={formData.minimum_order_amount}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									min="0"
									step="0.01"
								/>
								<p className="mt-1 text-xs text-slate-500">
									Leave blank for no minimum purchase requirement
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Usage Limit
								</label>
								<input
									type="number"
									name="usage_limit"
									value={formData.usage_limit}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
									min="0"
								/>
								<p className="mt-1 text-xs text-slate-500">
									Maximum number of times this discount can be used. Leave blank
									for unlimited.
								</p>
							</div>
						</div>
					</div>

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
							disabled={isSubmitting}
							className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-300"
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
