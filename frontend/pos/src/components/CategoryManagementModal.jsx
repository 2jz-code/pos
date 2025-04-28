import { useState, useEffect } from "react"; // Added React import
import PropTypes from "prop-types";
import { toast } from "react-toastify";
// Icons for UI (using outline for consistency, solid for actions where appropriate)
import {
	PencilIcon as PencilSolidIcon,
	PlusIcon as PlusSolidIcon,
	TrashIcon as TrashSolidIcon,
	XMarkIcon,
	ArrowUturnLeftIcon, // For Back button
	ExclamationTriangleIcon, // For errors
	ArrowPathIcon,
} from "@heroicons/react/24/solid"; // Using solid for action buttons

// Original MODE constants
const MODE = {
	ADD: "add",
	EDIT: "edit",
	DELETE: "delete",
	MENU: "menu", // Initial selection menu
};

/**
 * CategoryManagementModal Component (Logic Preserved from User Provided Code)
 *
 * Modal for adding, editing, and deleting product categories.
 * UI updated for a modern look and feel; Logic remains unchanged based on user input.
 */
const CategoryManagementModal = ({
	isOpen,
	onClose,
	onCategoryChange,
	categories,
	axiosInstance,
}) => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const [mode, setMode] = useState(MODE.MENU);
	const [selectedCategory, setSelectedCategory] = useState("");
	const [categoryName, setCategoryName] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [errorDetails, setErrorDetails] = useState(null); // For delete error details

	// Reset state when modal opens/closes (Original)
	useEffect(() => {
		if (isOpen) {
			setMode(MODE.MENU);
			setSelectedCategory("");
			setCategoryName("");
			setError("");
			setErrorDetails(null);
		}
	}, [isOpen]);

	// Update form when selecting a category in edit mode (Original)
	useEffect(() => {
		if (mode === MODE.EDIT && selectedCategory) {
			const category = categories.find(
				(c) => c.id.toString() === selectedCategory
			);
			if (category) {
				setCategoryName(category.name);
			} else {
				setCategoryName(""); // Reset if selected category not found
			}
		} else if (mode !== MODE.EDIT) {
			setCategoryName(""); // Clear name if not in edit mode
		}
	}, [selectedCategory, categories, mode]);

	// Handle Add Category (Original)
	const handleAddCategory = async () => {
		if (!categoryName.trim()) {
			setError("Category name cannot be empty");
			return;
		}
		setIsSubmitting(true);
		setError("");
		setErrorDetails(null);
		try {
			const response = await axiosInstance.post("products/categories/", {
				name: categoryName.trim(),
			});
			onCategoryChange("add", response.data);
			toast.success("Category added successfully!");
			handleClose(); // Close after success
		} catch (error) {
			console.error("Failed to add category:", error);
			setError(error.response?.data?.message || "Failed to add category");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle Edit Category (Original)
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
		setErrorDetails(null);
		try {
			const response = await axiosInstance.put(
				`products/categories/${selectedCategory}/`,
				{ name: categoryName.trim() }
			);
			onCategoryChange("edit", {
				...response.data,
				id: parseInt(selectedCategory),
			});
			toast.success("Category updated successfully!");
			handleClose(); // Close after success
		} catch (error) {
			console.error("Failed to update category:", error);
			setError(error.response?.data?.message || "Failed to update category");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle Delete Category (Original)
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
			onCategoryChange("delete", selectedCategory); // Pass ID back
			toast.success("Category deleted successfully!");
			handleClose(); // Close after success
		} catch (error) {
			console.error("Error deleting category:", error);
			const errorResponse = error.response?.data;
			if (errorResponse) {
				setError(errorResponse.detail || "Failed to delete category");
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

	// Handle Close (Original)
	const handleClose = () => {
		onClose();
		// Reset state with slight delay to prevent visual glitches
		setTimeout(() => {
			setMode(MODE.MENU);
			setSelectedCategory("");
			setCategoryName("");
			setError("");
			setErrorDetails(null);
		}, 150); // Adjusted delay slightly
	};
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	if (!isOpen) return null; // Original condition

	// Base button style
	const baseButtonClass =
		"px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
	const primaryButtonClass = `${baseButtonClass} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
	const secondaryButtonClass = `${baseButtonClass} bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 focus:ring-slate-500`;
	const dangerButtonClass = `${baseButtonClass} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;

	// Menu button style
	const menuButtonClass =
		"w-full flex items-center justify-between p-3 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed";

	// Input/Select style
	const inputSelectClass =
		"w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-slate-400";
	const selectClass = `${inputSelectClass} appearance-none bg-white bg-no-repeat bg-right-3 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]`;

	return (
		// Modal Backdrop
		<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200 ease-in-out">
			{/* Modal Panel */}
			<div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all duration-200 ease-in-out scale-100">
				<div className="p-5 border-b border-slate-200">
					{" "}
					{/* Adjusted padding */}
					{/* Header */}
					<div className="flex justify-between items-center">
						<h3 className="text-lg font-semibold text-slate-800">
							{mode === MODE.MENU && "Category Management"}
							{mode === MODE.ADD && "Add New Category"}
							{mode === MODE.EDIT && "Edit Category"}
							{mode === MODE.DELETE && "Delete Category"}
						</h3>
						<button
							onClick={handleClose} // Original handler
							className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100" // Added padding/hover bg
						>
							<XMarkIcon className="h-5 w-5" />
						</button>
					</div>
				</div>

				{/* Modal Body */}
				<div className="p-5 space-y-4">
					{" "}
					{/* Adjusted padding and spacing */}
					{/* Error message */}
					{error && (
						<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2 text-xs shadow-sm">
							{" "}
							{/* Adjusted padding/text size */}
							<ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
							<div>
								<p className="font-medium">{error}</p>
								{errorDetails && (
									<div className="mt-1.5 text-red-600">
										{" "}
										{/* Slightly darker text */}
										<p>
											Found {errorDetails.productCount} products in this
											category.
										</p>
										{errorDetails.productSample.length > 0 && (
											<div className="mt-1">
												<p className="font-medium">Examples:</p>
												<ul className="list-disc pl-4 mt-0.5">
													{errorDetails.productSample.map((product) => (
														<li key={product.id}>{product.name}</li>
													))}
												</ul>
											</div>
										)}
										<p className="mt-1.5">
											Please reassign or delete these products first.
										</p>
									</div>
								)}
							</div>
						</div>
					)}
					{/* Main content based on mode */}
					{mode === MODE.MENU && (
						<div className="space-y-2.5">
							{" "}
							{/* Adjusted spacing */}
							<button
								onClick={() => setMode(MODE.ADD)}
								className={`${menuButtonClass} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
							>
								<span>Add New Category</span>
								<PlusSolidIcon className="h-4 w-4" />
							</button>
							<button
								onClick={() => setMode(MODE.EDIT)}
								className={`${menuButtonClass} bg-blue-50 text-blue-700 hover:bg-blue-100 ${
									categories.length === 0 ? "opacity-50 cursor-not-allowed" : ""
								}`}
								disabled={categories.length === 0}
							>
								<span>Edit Category</span>
								<PencilSolidIcon className="h-4 w-4" />
							</button>
							<button
								onClick={() => setMode(MODE.DELETE)}
								className={`${menuButtonClass} bg-red-50 text-red-700 hover:bg-red-100 ${
									categories.length === 0 ? "opacity-50 cursor-not-allowed" : ""
								}`}
								disabled={categories.length === 0}
							>
								<span>Delete Category</span>
								<TrashSolidIcon className="h-4 w-4" />
							</button>
						</div>
					)}
					{/* Add/Edit/Delete Forms */}
					{(mode === MODE.ADD ||
						mode === MODE.EDIT ||
						mode === MODE.DELETE) && (
						<div className="space-y-4">
							{(mode === MODE.EDIT || mode === MODE.DELETE) && (
								<div>
									<label
										htmlFor="category-select"
										className="block text-xs font-medium text-slate-600 mb-1"
									>
										{" "}
										{/* Smaller label */}
										Select Category
									</label>
									<select
										id="category-select"
										value={selectedCategory}
										onChange={(e) => {
											setSelectedCategory(e.target.value);
											setError(""); // Clear error when selection changes
											setErrorDetails(null);
										}}
										className={selectClass}
										required
										disabled={isSubmitting}
									>
										<option
											value=""
											disabled
										>
											Select a category...
										</option>
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
							)}

							{(mode === MODE.ADD || mode === MODE.EDIT) && (
								<div>
									<label
										htmlFor="category-name"
										className="block text-xs font-medium text-slate-600 mb-1"
									>
										{" "}
										{/* Smaller label */}
										{mode === MODE.ADD ? "Category Name" : "New Category Name"}
									</label>
									<input
										id="category-name"
										type="text"
										value={categoryName}
										onChange={(e) => setCategoryName(e.target.value)}
										placeholder="Enter category name"
										className={inputSelectClass}
										autoFocus={mode === MODE.ADD} // Autofocus only on Add mode
										disabled={
											isSubmitting || (mode === MODE.EDIT && !selectedCategory)
										}
									/>
								</div>
							)}

							{/* Confirmation Text for Delete */}
							{mode === MODE.DELETE && selectedCategory && (
								<p className="text-sm text-slate-600">
									Are you sure you want to delete the category:{" "}
									<strong className="text-slate-800">
										{
											categories.find(
												(c) => c.id.toString() === selectedCategory
											)?.name
										}
									</strong>
									? This action cannot be undone.
								</p>
							)}

							{/* Action Buttons */}
							<div className="flex justify-end gap-3 pt-2">
								{" "}
								{/* Adjusted spacing */}
								<button
									type="button"
									onClick={() => setMode(MODE.MENU)}
									className={secondaryButtonClass}
									disabled={isSubmitting}
								>
									<ArrowUturnLeftIcon className="h-4 w-4 mr-1.5" /> Back
								</button>
								{mode === MODE.ADD && (
									<button
										onClick={handleAddCategory}
										disabled={isSubmitting || !categoryName.trim()}
										className={`${primaryButtonClass} flex items-center gap-1.5`}
									>
										{isSubmitting ? (
											<ArrowPathIcon className="h-4 w-4 animate-spin" />
										) : (
											<PlusSolidIcon className="h-4 w-4" />
										)}
										{isSubmitting ? "Adding..." : "Add Category"}
									</button>
								)}
								{mode === MODE.EDIT && (
									<button
										onClick={handleEditCategory}
										disabled={
											isSubmitting || !selectedCategory || !categoryName.trim()
										}
										className={`${primaryButtonClass} flex items-center gap-1.5`}
									>
										{isSubmitting ? (
											<ArrowPathIcon className="h-4 w-4 animate-spin" />
										) : (
											<PencilSolidIcon className="h-4 w-4" />
										)}
										{isSubmitting ? "Saving..." : "Save Changes"}
									</button>
								)}
								{mode === MODE.DELETE && (
									<button
										onClick={handleDeleteCategory}
										disabled={isSubmitting || !selectedCategory || errorDetails} // Disable if there are products
										className={`${dangerButtonClass} flex items-center gap-1.5`}
									>
										{isSubmitting ? (
											<ArrowPathIcon className="h-4 w-4 animate-spin" />
										) : (
											<TrashSolidIcon className="h-4 w-4" />
										)}
										{isSubmitting ? "Deleting..." : "Delete Category"}
									</button>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
	// --- END OF UPDATED UI ---
};

// --- ORIGINAL PROPTYPES (UNCHANGED) ---
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
