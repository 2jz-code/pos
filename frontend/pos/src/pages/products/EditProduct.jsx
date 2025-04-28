import { useState, useEffect } from "react"; // Added React import
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig"; // Original import
// Icons for UI
import {
	ArrowLeftIcon,
	CheckIcon,
	XMarkIcon,
	ExclamationTriangleIcon,
	PhotoIcon,
} from "@heroicons/react/24/outline"; // Use outline icons

/**
 * EditProduct Component (Logic Preserved from User Provided Code)
 *
 * Form for editing an existing product, including image display.
 * UI updated for a modern look and feel (v2); Logic remains unchanged based on user input.
 */
const EditProduct = () => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const { name } = useParams(); // Get product name from URL
	const navigate = useNavigate();

	const [product, setProduct] = useState({
		name: "",
		price: "",
		description: "",
		category: "", // Should store category ID
		image: "", // Store image URL from backend
	});
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let isMounted = true; // Prevent state update on unmounted component

		const fetchProduct = axiosInstance
			.get(`products/${encodeURIComponent(name)}/`)
			.then((response) => {
				if (isMounted) {
					// Ensure category is the ID, not the object, if backend sends object
					const fetchedProduct = response.data;
					if (
						fetchedProduct.category &&
						typeof fetchedProduct.category === "object"
					) {
						fetchedProduct.category = fetchedProduct.category.id;
					} else if (
						fetchedProduct.category === null ||
						fetchedProduct.category === undefined
					) {
						fetchedProduct.category = ""; // Ensure category is at least an empty string
					}
					setProduct(fetchedProduct);
				}
			})
			.catch(() => {
				if (isMounted) setError("Failed to fetch product details.");
			});

		const fetchCategories = axiosInstance
			.get("products/categories/")
			.then((response) => {
				if (isMounted) setCategories(response.data);
			})
			.catch(() => {
				if (isMounted) setError("Failed to load categories.");
			});

		Promise.all([fetchProduct, fetchCategories]).finally(() => {
			if (isMounted) setLoading(false);
		});

		return () => {
			isMounted = false;
		}; // Cleanup
	}, [name]);

	const handleChange = (e) => {
		setProduct({ ...product, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null); // Clear previous errors

		// Clone the product object for submission
		const updatedProduct = { ...product };

		// Remove the image field before sending PUT request
		delete updatedProduct.image;

		// Ensure category is sent as an ID (number) if it's not empty
		if (updatedProduct.category === "") {
			delete updatedProduct.category; // Don't send empty string if no category selected
		} else {
			updatedProduct.category = parseInt(updatedProduct.category, 10); // Ensure it's a number
		}

		try {
			await axiosInstance.put(
				`products/${encodeURIComponent(name)}/`, // Use original name for endpoint
				updatedProduct
			);
			navigate("/products"); // Redirect to Products page
		} catch (error) {
			console.error("Update product error:", error);
			// Provide more specific error feedback if possible
			const errorMsg =
				error.response?.data?.detail ||
				"Failed to update product. Check details or ensure you have admin rights.";
			setError(errorMsg);
		}
	};
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI v2 (JSX Structure and Styling Only) ---
	// Loading State - Styled
	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-slate-100">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
				<p className="text-slate-500 ml-3">Loading product details...</p>
			</div>
		);
	}

	return (
		// Main container
		<div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6">
			{/* Page Header - Styled */}
			<header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
				<h1 className="text-xl sm:text-2xl font-bold text-slate-800">
					Edit Product
				</h1>
				{/* Back Button - Styled */}
				<button
					onClick={() => navigate("/products")} // Original handler
					className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Back to Products
				</button>
			</header>

			{/* Main Content Area - Centered */}
			<div className="flex-grow flex items-center justify-center py-6">
				{" "}
				{/* Added padding */}
				{/* Combined Image and Form Card */}
				<div className="flex flex-col md:flex-row max-w-4xl w-full bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
					{/* Left Side - Image Display - Styled */}
					<div className="w-full md:w-1/3 p-5 flex flex-col justify-center items-center bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
						<label className="block text-sm font-medium text-slate-700 mb-2 self-start">
							Product Image
						</label>
						<div className="w-full aspect-square bg-slate-200 rounded-md flex flex-col items-center justify-center text-slate-500 overflow-hidden mb-3 shadow-inner">
							{product.image ? (
								<img
									src={product.image} // Original state
									alt={product.name} // Original state
									className="w-full h-full object-cover"
									// Add error handling for image loading
									onError={(e) => {
										e.target.onerror = null;
										e.target.src =
											"https://placehold.co/300x300/e2e8f0/94a3b8?text=No+Image";
									}}
								/>
							) : (
								<>
									<PhotoIcon className="h-12 w-12 mb-1 text-slate-400" />{" "}
									{/* Slightly smaller icon */}
									<span className="text-xs">No image</span>
								</>
							)}
						</div>
						{/* Placeholder for future image upload */}
						<button
							disabled
							className="w-full text-xs px-3 py-1.5 bg-slate-200 text-slate-500 rounded-md cursor-not-allowed"
						>
							Change Image (Not Available)
						</button>
					</div>

					{/* Right Side - Product Editing Form - Styled */}
					<div className="w-full md:w-2/3 p-6 sm:p-8">
						{/* Form Title */}
						<h3 className="text-lg font-semibold mb-5 text-slate-700">
							Edit Product Details
						</h3>

						{/* Inline Error Message Display - Styled */}
						{error && ( // Original condition
							<div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm">
								<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
								<span>{error}</span>
							</div>
						)}

						{/* Form - uses original handler */}
						<form
							onSubmit={handleSubmit}
							className="flex flex-col space-y-4" // Adjusted spacing
						>
							{/* Name Input */}
							<div>
								<label
									htmlFor="product-name-edit"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Product Name
								</label>
								<input
									id="product-name-edit"
									type="text"
									name="name" // Original name attribute
									value={product.name} // Original state
									onChange={handleChange} // Original handler
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm placeholder-slate-400"
									required // Original attribute
								/>
							</div>

							{/* Price Input */}
							<div>
								<label
									htmlFor="product-price-edit"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Price
								</label>
								<div className="relative">
									<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
										$
									</span>
									<input
										id="product-price-edit"
										type="number"
										step="0.01"
										min="0"
										name="price" // Original name attribute
										value={product.price} // Original state
										onChange={handleChange} // Original handler
										className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm placeholder-slate-400"
										required // Original attribute
										placeholder="0.00"
									/>
								</div>
							</div>

							{/* Description Textarea */}
							<div>
								<label
									htmlFor="product-description-edit"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Description
								</label>
								<textarea
									id="product-description-edit"
									name="description" // Original name attribute
									value={product.description} // Original state
									onChange={handleChange} // Original handler
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm h-24 resize-none placeholder-slate-400" // Adjusted height
									required // Original attribute
									placeholder="Enter description..."
								/>
							</div>

							{/* Category Dropdown */}
							<div>
								<label
									htmlFor="product-category-edit"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Category
								</label>
								<select
									id="product-category-edit"
									name="category" // Original name attribute
									value={product.category || ""} // Original state (ensure controlled component)
									onChange={handleChange} // Original handler
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm appearance-none bg-white bg-no-repeat bg-right-3 text-slate-700"
									required // Original attribute
								>
									<option
										value=""
										disabled
									>
										Select Category...
									</option>
									{/* Map over original categories state */}
									{categories.map((cat) => (
										<option
											key={cat.id}
											value={cat.id}
										>
											{cat.name}
										</option>
									))}
								</select>
							</div>

							{/* Action Buttons - Styled */}
							<div className="flex space-x-3 pt-2">
								{" "}
								{/* Reduced top padding */}
								{/* Save Button */}
								<button
									type="submit"
									className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm" // Adjusted padding
								>
									<CheckIcon className="h-5 w-5" />
									Save Changes
								</button>
								{/* Cancel Button */}
								<button
									type="button"
									onClick={() => navigate("/products")} // Original handler
									className="flex-1 px-4 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 active:bg-slate-100 transition-colors font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 shadow-sm" // Adjusted padding
								>
									<XMarkIcon className="h-5 w-5" />
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
	// --- END OF UPDATED UI v2 ---
};

export default EditProduct; // Assuming default export
