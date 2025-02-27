// src/components/categories/CategoryModal.jsx
import { useState } from "react";
import { toast } from "react-toastify";
import PropTypes from "prop-types";

const CategoryModal = ({ isOpen, onClose, onSubmit, axiosInstance }) => {
	const [newCategoryName, setNewCategoryName] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async () => {
		if (!newCategoryName.trim()) {
			toast.warning("Category name cannot be empty");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await axiosInstance.post("products/categories/", {
				name: newCategoryName.trim(),
			});

			onSubmit(response.data);
			handleClose();
			toast.success("Category added successfully!");
		} catch (error) {
			console.error("Failed to add category:", error);
			toast.error(error.response?.data?.message || "Failed to add category");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setNewCategoryName("");
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
			<div
				className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<h3 className="text-lg font-semibold text-slate-800 mb-4">
					Add New Category
				</h3>

				<div className="mb-4">
					<label className="block text-sm font-medium text-slate-700 mb-1">
						Category Name
					</label>
					<input
						type="text"
						value={newCategoryName}
						onChange={(e) => setNewCategoryName(e.target.value)}
						placeholder="Enter category name"
						className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						autoFocus
						disabled={isSubmitting}
					/>
				</div>

				<div className="flex justify-end gap-3">
					<button
						onClick={handleClose}
						className="px-4 py-2 text-slate-600 hover:bg-slate-100 
							 rounded-lg transition-colors disabled:opacity-50"
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button
						onClick={handleSubmit}
						className="px-4 py-2 bg-emerald-600 text-white rounded-lg 
							 hover:bg-emerald-700 transition-colors disabled:opacity-50
							 flex items-center gap-2"
						disabled={isSubmitting}
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
							"Add Category"
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

CategoryModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSubmit: PropTypes.func.isRequired,
	// Update the axios instance prop type to accept either function or object
	axiosInstance: PropTypes.oneOfType([
		PropTypes.func,
		PropTypes.shape({
			post: PropTypes.func.isRequired,
			get: PropTypes.func.isRequired,
			// ... other axios methods you might use
		}),
	]).isRequired,
};

export default CategoryModal;
