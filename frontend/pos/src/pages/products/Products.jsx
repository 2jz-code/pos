import { useState, useEffect, useMemo, useRef } from "react"; // Added React import
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig"; // Original import
import { authService } from "../../api/services/authService"; // Original import
// Icons for UI (using outline for consistency, solid for actions)
import {
	PencilSquareIcon as PencilSolidIcon, // Use solid for edit action
	TrashIcon as TrashSolidIcon, // Use solid for delete action
} from "@heroicons/react/24/solid";
import {
	PlusIcon,
	AdjustmentsHorizontalIcon,
	Bars3Icon,
	ExclamationTriangleIcon,
	EyeIcon, // For view details overlay
	// Removed duplicate outline icons that are also imported as solid
} from "@heroicons/react/24/outline";
import CategoryManagementModal from "../../components/CategoryManagementModal"; // Original import

// Helper function to get category-specific colors
const getCategoryColors = (categoryId) => {
	const colors = [
		// Tuples: [borderColorClass, badgeBgColorClass, badgeTextColorClass]
		["border-blue-300", "bg-blue-50", "text-blue-700"],
		["border-emerald-300", "bg-emerald-50", "text-emerald-700"],
		["border-amber-300", "bg-amber-50", "text-amber-700"],
		["border-indigo-300", "bg-indigo-50", "text-indigo-700"],
		["border-pink-300", "bg-pink-50", "text-pink-700"],
		["border-sky-300", "bg-sky-50", "text-sky-700"],
		["border-rose-300", "bg-rose-50", "text-rose-700"],
		["border-teal-300", "bg-teal-50", "text-teal-700"],
		["border-cyan-300", "bg-cyan-50", "text-cyan-700"],
		["border-purple-300", "bg-purple-50", "text-purple-700"],
	];
	const id = parseInt(categoryId, 10);
	if (isNaN(id) || id === null) {
		return ["border-slate-300", "bg-slate-100", "text-slate-600"]; // Default
	}
	const index = Math.abs(id) % colors.length;
	return colors[index];
};

/**
 * Products Component (Logic Preserved from User Provided Code)
 *
 * Displays a list of products, filterable by category, with admin actions.
 * UI updated for a modern look and feel (v4 - Restart); Logic remains unchanged based on user input.
 * FIX: Ensure grid scrolls correctly using explicit height calculation.
 * FIX: Ensure category colors are applied correctly.
 * FEAT: Added image click navigation.
 */
export default function Products() {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const [categories, setCategories] = useState([]);
	const [products, setProducts] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState(""); // "" means All
	const [isAdmin, setIsAdmin] = useState(false);
	const [userName, setUserName] = useState("");
	const navigate = useNavigate();
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	// Refs for calculating heights
	const headerRef = useRef(null);
	const tabsRef = useRef(null);
	const [gridHeight, setGridHeight] = useState("auto"); // State for dynamic height
	let categoryIdToDelete;

	// Original category change handler
	const handleCategoryChange = (action, data) => {
		switch (action) {
			case "add":
				setCategories([...categories, data]);
				break;
			case "edit":
				setCategories(
					categories.map((category) =>
						category.id === data.id
							? { ...category, name: data.name }
							: category
					)
				);
				break;
			case "delete":
				categoryIdToDelete = parseInt(data);
				setCategories(
					categories.filter((category) => category.id !== categoryIdToDelete)
				);
				if (selectedCategory === categoryIdToDelete.toString()) {
					setSelectedCategory("");
				}
				setProducts((prevProducts) =>
					prevProducts.filter((p) => p.category !== categoryIdToDelete)
				);
				break;
			default:
				console.error("Unknown category action:", action);
		}
	};

	// Original data fetching logic
	useEffect(() => {
		let isMounted = true;
		setLoading(true);
		setError(null);

		const fetchData = async () => {
			try {
				const [categoriesRes, productsRes, authRes] = await Promise.all([
					axiosInstance.get("products/categories/"),
					axiosInstance.get("products/"),
					authService.checkStatus(),
				]);

				if (isMounted) {
					setCategories(categoriesRes.data);
					setSelectedCategory(""); // Default to "All"
					setProducts(productsRes.data);
					setIsAdmin(authRes.is_admin);
					setUserName(authRes.username);
				}
			} catch (error) {
				console.error("Error fetching data:", error);
				if (isMounted)
					setError("Failed to load product data. Please try again.");
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		fetchData();
		return () => {
			isMounted = false;
		}; // Cleanup
	}, []);

	// Effect to calculate grid height dynamically
	useEffect(() => {
		const calculateHeight = () => {
			const headerHeight = headerRef.current?.offsetHeight || 0;
			const tabsHeight = tabsRef.current?.offsetHeight || 0;
			// Get viewport height and subtract header, tabs, and padding/margins
			// p-4/sm:p-6 means roughly 1rem/1.5rem top/bottom padding = 2rem/3rem total vertical padding
			// mb-4 on tabs = 1rem margin
			// pb-4 on grid = 1rem padding
			// Total subtractions: header + tabs + approx 4rem (adjust based on actual rendered values if needed)
			const paddingAndMargin = 4 * 16; // Approx 4rem in pixels
			const calculated = `calc(100vh - ${headerHeight}px - ${tabsHeight}px - ${paddingAndMargin}px)`;
			setGridHeight(calculated);
		};

		calculateHeight(); // Calculate on mount/update
		window.addEventListener("resize", calculateHeight); // Recalculate on resize

		return () => window.removeEventListener("resize", calculateHeight); // Cleanup listener
	}, [loading]); // Recalculate when loading finishes

	// Original delete handler
	const handleDelete = async (productName) => {
		if (window.confirm(`Are you sure you want to delete "${productName}"?`)) {
			try {
				await axiosInstance.delete(
					`products/${encodeURIComponent(productName)}/`
				);
				setProducts((prevProducts) =>
					prevProducts.filter((product) => product.name !== productName)
				);
			} catch (error) {
				console.error("Failed to delete product:", error);
				setError(`Failed to delete ${productName}.`);
			}
		}
	};

	// Original Filtering logic (as provided by user)
	const filteredProducts = useMemo(() => {
		return products.filter((product) => {
			if (!selectedCategory) return true; // Show all if ""

			// First try to match by category ID if available (product.category is the ID)
			if (product.category != null) {
				// Use != null check
				return product.category.toString() === selectedCategory;
			}

			// Fall back to matching by category_name if product.category is missing
			const selectedCategoryObj = categories.find(
				(cat) => cat.id.toString() === selectedCategory
			);
			return product.category_name === selectedCategoryObj?.name;
		});
	}, [products, selectedCategory, categories]); // Added categories dependency
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI v4 (JSX Structure and Styling Only) ---
	// Loading State - Styled
	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-slate-100">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
				<p className="text-slate-500 ml-3">Loading products...</p>
			</div>
		);
	}

	// Error State - Styled
	if (error && !loading) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-6">
				<div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
					<ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<p className="text-red-600 mb-4">{error}</p>
					<button
						onClick={() => window.location.reload()} // Simple retry
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-2"
					>
						Retry
					</button>
					<button
						onClick={() => navigate("/dashboard")} // Original handler
						className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
					>
						Go to Dashboard
					</button>
				</div>
			</div>
		);
	}

	return (
		// Main container - Ensure full height and overflow handling
		<div className="w-screen h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6 overflow-hidden">
			{/* Header Section - Styled */}
			<header
				ref={headerRef}
				className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-slate-200 gap-3 flex-shrink-0"
			>
				<h1 className="text-xl sm:text-2xl font-bold text-slate-800">
					Product Management
				</h1>
				{/* Header Buttons */}
				<div className="flex items-center gap-2 sm:gap-3">
					{/* Dashboard Button - Styled */}
					<button
						className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
						onClick={() => navigate("/dashboard")} // Original handler
					>
						<Bars3Icon className="h-4 w-4" />
						<span className="hidden sm:inline">Dashboard</span>
					</button>
					{/* Add Product Button (Admin Only) - Styled */}
					{isAdmin && ( // Original condition
						<button
							onClick={() => navigate("/products/add")} // Original handler
							className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center gap-1.5 shadow-sm"
						>
							<PlusIcon className="h-4 w-4" />
							Add Product
						</button>
					)}
				</div>
			</header>

			{/* Category Tabs Section - Styled */}
			<div
				ref={tabsRef}
				className="flex items-center flex-wrap gap-2 mb-4 bg-white p-2 rounded-lg shadow-sm border border-slate-200 overflow-x-auto custom-scrollbar flex-shrink-0"
			>
				{/* All Categories Button - Styled */}
				<button
					className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
						!selectedCategory // Original condition
							? "bg-indigo-600 text-white shadow-sm" // Use different color for "All"
							: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
					}`}
					onClick={() => setSelectedCategory("")} // Original handler
				>
					All Products
				</button>

				{/* Existing Category Buttons - Styled */}
				{categories.map(
					(
						category // Original map
					) => (
						<button
							key={category.id} // Original key
							className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
								selectedCategory === category.id.toString() // Original condition
									? "bg-indigo-600 text-white shadow-sm" // Use different color for active category
									: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
							}`}
							onClick={() => setSelectedCategory(category.id.toString())} // Original handler
						>
							{category.name} {/* Original name */}
						</button>
					)
				)}

				{/* Manage Categories Button (Admin Only) - Styled */}
				{isAdmin && ( // Original condition
					<button
						onClick={() => setIsCategoryModalOpen(true)} // Original handler
						className="ml-auto flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                           bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200
                           flex items-center gap-1 whitespace-nowrap" // Adjusted style
					>
						<AdjustmentsHorizontalIcon className="h-4 w-4" />
						<span className="hidden sm:inline">Manage Categories</span>
					</button>
				)}
			</div>

			{/* **FIX:** Product Grid Area - Use calculated height and overflow-y-auto */}
			<div
				className="flex-1 overflow-y-auto custom-scrollbar pb-4" // Handles scrolling for the grid area
				style={{ height: gridHeight }} // Apply dynamic height
			>
				<div
					// Removed ref, h-full, overflow-y-auto from here
					className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-5 grid-auto-rows-min" // Use grid-auto-rows-min
				>
					{/* Use filteredProducts from original logic */}
					{filteredProducts.length > 0 ? (
						filteredProducts.map((product) => {
							// **FEAT:** Get category colors
							const [borderColor, badgeBgColor, badgeTextColor] =
								getCategoryColors(product.category);
							const categoryName =
								categories.find((c) => c.id === product.category)?.name ||
								product.category_name ||
								"Uncategorized";

							return (
								<div
									key={product.id || product.name} // Use ID if available, fallback to name
									// Removed self-start
									// **FIX:** Ensure template literal correctly applies dynamic classes
									className={`bg-white max-h-[290px] max-w-[290px] w-full rounded-lg shadow hover:shadow-lg transition-all overflow-hidden border-t-4 ${borderColor} border border-slate-200 flex flex-col group relative`}
								>
									{/* **FEAT:** Product Image - Now clickable for details */}
									<button
										onClick={() =>
											navigate(`/products/${encodeURIComponent(product.name)}`)
										} // Navigate on click
										className="aspect-square bg-slate-100 overflow-hidden relative block w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-lg" // Make it a button for accessibility
										aria-label={`View details for ${product.name}`}
									>
										<img
											src={
												product.image ||
												"https://placehold.co/300x300/e2e8f0/94a3b8?text=No+Image"
											} // Fallback image
											alt={product.name} // Original alt text
											className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
											onError={(e) => {
												e.target.onerror = null;
												e.target.src =
													"https://placehold.co/300x300/e2e8f0/94a3b8?text=No+Image";
											}}
										/>
										{/* View Details Icon Overlay */}
										<div className="absolute inset-0 bg-black/50 bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
											<EyeIcon className="h-8 w-8 text-white opacity-80" />
										</div>
									</button>

									{/* Product Info */}
									<div className="flex-1 flex flex-col justify-between p-3">
										<div>
											<h3
												className="text-sm font-medium text-slate-800 truncate mb-0.5"
												title={product.name}
											>
												{product.name} {/* Original name */}
											</h3>
											{/* **FEAT & FIX:** Category Badge - With dynamic colors applied correctly */}
											<span
												className={`inline-block ${badgeBgColor} ${badgeTextColor} text-xs font-medium px-1.5 py-0.5 rounded mb-1`}
											>
												{categoryName}
											</span>
											<p className="text-slate-800 font-semibold text-sm">
												${Number(product.price).toFixed(2)}{" "}
												{/* Original price */}
											</p>
										</div>

										{/* Admin Actions - Styled */}
										{isAdmin && ( // Original condition
											<div className="flex gap-1.5 mt-2 border-t border-slate-100 pt-2">
												{/* Edit Button */}
												<button
													// eslint-disable-next-line no-unused-vars
													onClick={(e) => {
														navigate(
															`/products/edit/${encodeURIComponent(
																product.name
															)}`
														); // Original navigation
													}}
													className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors flex items-center gap-1 flex-1 justify-center"
													title="Edit"
												>
													{/* Use Solid icon for action */}
													<PencilSolidIcon className="h-3.5 w-3.5" />
													<span className="hidden sm:inline">Edit</span>
												</button>
												{/* Delete Button */}
												<button
													// eslint-disable-next-line no-unused-vars
													onClick={(e) => {
														handleDelete(product.name); // Original handler
													}}
													className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors flex items-center gap-1 flex-1 justify-center"
													title="Delete"
												>
													{/* Use Solid icon for action */}
													<TrashSolidIcon className="h-3.5 w-3.5" />
													<span className="hidden sm:inline">Delete</span>
												</button>
											</div>
										)}
									</div>
								</div>
							);
						})
					) : (
						// Message when no products match the filter - Styled
						<div className="col-span-full text-center py-10 text-slate-500">
							No products found{" "}
							{selectedCategory
								? `in "${
										categories.find((c) => c.id.toString() === selectedCategory)
											?.name || "this category"
								  }"`
								: ""}
							.
						</div>
					)}
				</div>
			</div>
			<div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl flex justify-between text-xs mt-4">
				<span>System Status: Operational</span>
				<span>Total Products: {products.length}</span>
				<span>
					User: {userName} ({isAdmin ? "Admin" : "Staff"})
				</span>
			</div>
			{/* Category Management Modal - Original Component */}
			<CategoryManagementModal
				isOpen={isCategoryModalOpen} // Original state
				onClose={() => setIsCategoryModalOpen(false)} // Original handler
				onCategoryChange={handleCategoryChange} // Original handler
				categories={categories} // Original state
				axiosInstance={axiosInstance} // Original prop
			/>
		</div>
	);
	// --- END OF UPDATED UI v4 ---
}
