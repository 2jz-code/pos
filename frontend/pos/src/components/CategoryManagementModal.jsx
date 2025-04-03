// src/components/CategoryManagementModal.jsx
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import {
	PencilIcon,
	PlusIcon,
	TrashIcon,
	XMarkIcon,
} from "@heroicons/react/24/solid";

const MODE = {
	ADD: "add",
	EDIT: "edit",
	DELETE: "delete",
	MENU: "menu", // Initial selection menu
};

const CategoryManagementModal = ({
	isOpen,
	onClose,
	onCategoryChange,
	categories,
	axiosInstance,
}) => {
	const [mode, setMode] = useState(MODE.MENU);
	const [selectedCategory, setSelectedCategory] = useState("");
	const [categoryName, setCategoryName] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [errorDetails, setErrorDetails] = useState(null);

	// Reset state when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setMode(MODE.MENU);
			setSelectedCategory("");
			setCategoryName("");
			setError("");
			setErrorDetails(null);
		}
	}, [isOpen]);

	// Update form when selecting a category in edit mode
	useEffect(() => {
		if (mode === MODE.EDIT && selectedCategory) {
			const category = categories.find(
				(c) => c.id.toString() === selectedCategory
			);
			if (category) {
				setCategoryName(category.name);
			}
		}
	}, [selectedCategory, categories, mode]);

	const handleAddCategory = async () => {
		if (!categoryName.trim()) {
			setError("Category name cannot be empty");
			return;
		}

		setIsSubmitting(true);
		setError("");

		try {
			const response = await axiosInstance.post("products/categories/", {
				name: categoryName.trim(),
			});

			onCategoryChange("add", response.data);
			toast.success("Category added successfully!");
			handleClose();
		} catch (error) {
			console.error("Failed to add category:", error);
			setError(error.response?.data?.message || "Failed to add category");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEditCategory = async () => {
		if (!selectedCategory) {
			setError("Please select a category to edit");
			return;
		}

		if (!categoryName.trim()) {
			setError("Category name cannot be empty");
			return;
		}

		setIsSubmitting(true);
		setError("");

		try {
			const response = await axiosInstance.put(
				`products/categories/${selectedCategory}/`,
				{
					name: categoryName.trim(),
				}
			);

			onCategoryChange("edit", {
				...response.data,
				id: parseInt(selectedCategory),
			});
			toast.success("Category updated successfully!");
			handleClose();
		} catch (error) {
			console.error("Failed to update category:", error);
			setError(error.response?.data?.message || "Failed to update category");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteCategory = async () => {
		if (!selectedCategory) {
			setError("Please select a category to delete");
			return;
		}

		setIsSubmitting(true);
		setError("");
		setErrorDetails(null);

		try {
			await axiosInstance.delete(`products/categories/${selectedCategory}/`);

			onCategoryChange("delete", selectedCategory);
			toast.success("Category deleted successfully!");
			handleClose();
		} catch (error) {
			console.error("Error deleting category:", error);

			// Extract error details from the response
			const errorResponse = error.response?.data;

			if (errorResponse) {
				setError(errorResponse.detail || "Failed to delete category");

				// If we have detailed error information, store it separately
				if (errorResponse.product_count && errorResponse.product_sample) {
					setErrorDetails({
						productCount: errorResponse.product_count,
						productSample: errorResponse.product_sample,
					});
				}
			} else {
				setError("Network error. Please try again.");
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		onClose();
		// Reset state with slight delay to prevent visual glitches
		setTimeout(() => {
			setMode(MODE.MENU);
			setSelectedCategory("");
			setCategoryName("");
			setError("");
			setErrorDetails(null);
		}, 100);
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-white/80 bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-lg w-full max-w-md">
				<div className="p-6">
					{/* Header */}
					<div className="flex justify-between items-center mb-6">
						<h3 className="text-lg font-semibold text-gray-900">
							{mode === MODE.MENU && "Category Management"}
							{mode === MODE.ADD && "Add New Category"}
							{mode === MODE.EDIT && "Edit Category"}
							{mode === MODE.DELETE && "Delete Category"}
						</h3>
						<button
							onClick={handleClose}
							className="text-gray-400 hover:text-gray-500"
						>
							<XMarkIcon className="h-5 w-5" />
						</button>
					</div>

					{/* Error message */}
					{error && (
						<div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
							<p className="font-medium">{error}</p>

							{errorDetails && (
								<div className="mt-2">
									<p>
										Found {errorDetails.productCount} products in this category.
									</p>
									{errorDetails.productSample.length > 0 && (
										<div className="mt-1">
											<p className="font-medium">Examples:</p>
											<ul className="list-disc pl-5 mt-1">
												{errorDetails.productSample.map((product) => (
													<li key={product.id}>{product.name}</li>
												))}
											</ul>
										</div>
									)}
									<p className="mt-2">
										Please reassign or delete these products before deleting the
										category.
									</p>
								</div>
							)}
						</div>
					)}

					{/* Main content */}
					{mode === MODE.MENU && (
						<div className="space-y-3">
							<button
								onClick={() => setMode(MODE.ADD)}
								className="w-full flex items-center justify-between p-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
							>
								<span className="font-medium">Add New Category</span>
								<PlusIcon className="h-5 w-5" />
							</button>

							<button
								onClick={() => setMode(MODE.EDIT)}
								className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
								disabled={categories.length === 0}
							>
								<span className="font-medium">Edit Category</span>
								<PencilIcon className="h-5 w-5" />
							</button>

							<button
								onClick={() => setMode(MODE.DELETE)}
								className="w-full flex items-center justify-between p-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
								disabled={categories.length === 0}
							>
								<span className="font-medium">Delete Category</span>
								<TrashIcon className="h-5 w-5" />
							</button>
						</div>
					)}

					{/* Add Category Form */}
					{mode === MODE.ADD && (
						<div>
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Category Name
								</label>
								<input
									type="text"
									value={categoryName}
									onChange={(e) => setCategoryName(e.target.value)}
									placeholder="Enter category name"
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									autoFocus
									disabled={isSubmitting}
								/>
							</div>

							<div className="flex justify-end gap-3 mt-6">
								<button
									type="button"
									onClick={() => setMode(MODE.MENU)}
									className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
									disabled={isSubmitting}
								>
									Back
								</button>
								<button
									onClick={handleAddCategory}
									disabled={isSubmitting || !categoryName.trim()}
									className={`px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-2 ${
										(isSubmitting || !categoryName.trim()) &&
										"opacity-50 cursor-not-allowed"
									}`}
								>
									{isSubmitting ? (
										<>
											<svg
												className="animate-spin h-4 w-4"
												viewBox="0 0 24 24"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												/>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												/>
											</svg>
											<span>Adding...</span>
										</>
									) : (
										<>
											<PlusIcon className="h-4 w-4" />
											<span>Add Category</span>
										</>
									)}
								</button>
							</div>
						</div>
					)}

					{/* Edit Category Form */}
					{mode === MODE.EDIT && (
						<div>
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Select Category to Edit
								</label>
								<select
									value={selectedCategory}
									onChange={(e) => setSelectedCategory(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-4"
									required
								>
									<option value="">Select a category</option>
									{categories.map((category) => (
										<option
											key={category.id}
											value={category.id}
										>
											{category.name}
										</option>
									))}
								</select>

								{selectedCategory && (
									<>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											New Category Name
										</label>
										<input
											type="text"
											value={categoryName}
											onChange={(e) => setCategoryName(e.target.value)}
											placeholder="Enter new category name"
											className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
											disabled={isSubmitting || !selectedCategory}
										/>
									</>
								)}
							</div>

							<div className="flex justify-end gap-3 mt-6">
								<button
									type="button"
									onClick={() => setMode(MODE.MENU)}
									className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
									disabled={isSubmitting}
								>
									Back
								</button>
								<button
									onClick={handleEditCategory}
									disabled={
										isSubmitting || !selectedCategory || !categoryName.trim()
									}
									className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 ${
										(isSubmitting ||
											!selectedCategory ||
											!categoryName.trim()) &&
										"opacity-50 cursor-not-allowed"
									}`}
								>
									{isSubmitting ? (
										<>
											<svg
												className="animate-spin h-4 w-4"
												viewBox="0 0 24 24"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												/>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												/>
											</svg>
											<span>Updating...</span>
										</>
									) : (
										<>
											<PencilIcon className="h-4 w-4" />
											<span>Update Category</span>
										</>
									)}
								</button>
							</div>
						</div>
					)}

					{/* Delete Category Form */}
					{mode === MODE.DELETE && (
						<div>
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Select Category to Delete
								</label>
								<select
									value={selectedCategory}
									onChange={(e) => setSelectedCategory(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									required
								>
									<option value="">Select a category</option>
									{categories.map((category) => (
										<option
											key={category.id}
											value={category.id}
										>
											{category.name}
										</option>
									))}
								</select>
							</div>

							<div className="flex justify-end gap-3 mt-6">
								<button
									type="button"
									onClick={() => setMode(MODE.MENU)}
									className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
									disabled={isSubmitting}
								>
									Back
								</button>
								<button
									onClick={handleDeleteCategory}
									disabled={isSubmitting || !selectedCategory}
									className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 ${
										(isSubmitting || !selectedCategory) &&
										"opacity-50 cursor-not-allowed"
									}`}
								>
									{isSubmitting ? (
										<>
											<svg
												className="animate-spin h-4 w-4"
												viewBox="0 0 24 24"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												/>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												/>
											</svg>
											<span>Deleting...</span>
										</>
									) : (
										<>
											<TrashIcon className="h-4 w-4" />
											<span>Delete Category</span>
										</>
									)}
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

CategoryManagementModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onCategoryChange: PropTypes.func.isRequired,
	categories: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.number.isRequired,
			name: PropTypes.string.isRequired,
		})
	).isRequired,
	axiosInstance: PropTypes.oneOfType([
		PropTypes.func,
		PropTypes.shape({
			post: PropTypes.func.isRequired,
			get: PropTypes.func.isRequired,
			put: PropTypes.func.isRequired,
			delete: PropTypes.func.isRequired,
		}),
	]).isRequired,
};

export default CategoryManagementModal;
