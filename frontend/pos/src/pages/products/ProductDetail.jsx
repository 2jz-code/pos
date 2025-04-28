import { useState, useEffect } from "react"; // Added React import
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig"; // Original import
// Icons for UI
import {
	ArrowLeftIcon,
	ExclamationTriangleIcon,
	PhotoIcon,
	PencilSquareIcon,
} from "@heroicons/react/24/outline"; // Use outline icons

/**
 * ProductDetail Component (Logic Preserved from User Provided Code)
 *
 * Displays details for a single product.
 * UI updated for a modern look and feel (v2); Logic remains unchanged based on user input.
 */
const ProductDetail = () => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const { name } = useParams();
	const [product, setProduct] = useState(null);
	const [loading, setLoading] = useState(true); // Added loading state
	const [error, setError] = useState(null); // Added error state
	const navigate = useNavigate();

	useEffect(() => {
		let isMounted = true;
		setLoading(true);
		setError(null);

		axiosInstance
			.get(`products/${encodeURIComponent(name)}/`)
			.then((response) => {
				if (isMounted) setProduct(response.data);
			})
			.catch((error) => {
				console.error("Error fetching product:", error);
				if (isMounted) setError("Failed to load product details.");
			})
			.finally(() => {
				if (isMounted) setLoading(false);
			});

		return () => {
			isMounted = false;
		}; // Cleanup
	}, [name]);
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI v2 (JSX Structure and Styling Only) ---
	// Loading State - Styled
	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-slate-100">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
				<p className="text-slate-500 ml-3">Loading product...</p>
			</div>
		);
	}

	// Error State - Styled
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-6">
				<div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
					<ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<p className="text-red-600 mb-4">{error}</p>
					<button
						onClick={() => navigate("/products")} // Original handler
						className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
					>
						Back to Products
					</button>
				</div>
			</div>
		);
	}

	// Product Not Found (after loading and no error) - Styled
	if (!product) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-6">
				<div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
					<ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
					<p className="text-slate-700 mb-4">Product not found.</p>
					<button
						onClick={() => navigate("/products")} // Original handler
						className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
					>
						Back to Products
					</button>
				</div>
			</div>
		);
	}

	return (
		// Main container - Centered content with background
		<div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 sm:p-6">
			{/* Back Button - Positioned top-left */}
			<button
				onClick={() => navigate("/products")} // Original handler
				className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
			>
				<ArrowLeftIcon className="h-4 w-4" />
				Back
			</button>

			{/* Product Detail Card - Improved Styling */}
			<div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
				{/* Image Area */}
				<div className="w-full h-60 sm:h-72 bg-slate-200 flex items-center justify-center overflow-hidden">
					{product.image ? (
						<img
							src={product.image} // Original state
							alt={product.name} // Original state
							className="w-full h-full object-cover"
							onError={(e) => {
								e.target.onerror = null;
								e.target.src =
									"https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image";
							}}
						/>
					) : (
						<div className="flex flex-col items-center text-slate-400">
							<PhotoIcon className="h-16 w-16 mb-1" />
							<span className="text-xs">No Image</span>
						</div>
					)}
				</div>

				{/* Content Area */}
				<div className="p-5 sm:p-6">
					{/* Category Badge */}
					{product.category_name && (
						<span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
							{product.category_name}
						</span>
					)}
					{/* Product Name */}
					<h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">
						{product.name} {/* Original state */}
					</h1>
					{/* Product Price */}
					<p className="text-xl font-semibold text-blue-600 mb-3">
						${Number(product.price).toFixed(2)} {/* Original state */}
					</p>
					{/* Product Description */}
					<p className="text-sm text-slate-600 leading-relaxed">
						{product.description || (
							<span className="italic text-slate-400">
								No description provided.
							</span>
						)}{" "}
						{/* Original state */}
					</p>

					{/* Edit Button (Optional - could be added for admins) */}
					{/* Example: Add isAdmin check here */}
					<button
						onClick={() =>
							navigate(`/products/edit/${encodeURIComponent(product.name)}`)
						}
						className="mt-5 w-full px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
					>
						<PencilSquareIcon className="h-4 w-4" />
						Edit Product
					</button>
				</div>
			</div>
		</div>
	);
	// --- END OF UPDATED UI v2 ---
};

export default ProductDetail; // Assuming default export
