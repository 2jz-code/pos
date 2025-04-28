import { useState, useEffect, useCallback, useRef, useMemo } from "react"; // Keep React imports + useMemo from original
import { useNavigate } from "react-router-dom"; // Keep router hook
import { useCartStore } from "../store/cartStore"; // Keep Zustand store hook
import Cart from "../features/cart/components/Cart"; // Keep Cart component import
import axiosInstance from "../api/config/axiosConfig"; // Keep axios instance
import { useCustomerCartDisplay } from "../features/customerDisplay/hooks/useCustomerCartDisplay"; // Keep custom hook
import LogoutButton from "../components/LogoutButton"; // Keep LogoutButton import (assuming it was in original or needed by snippet UI)
// NOTE: CategoryManagementModal import is commented out as per snippet, uncomment if needed
// import CategoryManagementModal from "../components/CategoryManagementModal";
import { toast } from "react-toastify"; // Keep toast import (assuming it was in original)

// Import necessary icons FOR THE NEW UI SNIPPET
import {
	SquaresPlusIcon,
	MagnifyingGlassIcon,
	Bars3Icon,
} from "@heroicons/react/24/outline";
// Import utility function FOR THE NEW UI SNIPPET
import { formatPrice } from "../utils/numberUtils"; // Keep utility import (assuming it was in original or needed by snippet UI)
// Import motion FOR THE NEW UI SNIPPET
import { motion } from "framer-motion";

// --- ORIGINAL LOGIC (UNCHANGED) ---
// Helper function to get user info (replace with actual implementation)
const authService = {
	getUserInfo: () => {
		// Placeholder: Replace with your actual method to get logged-in user info
		// Example: return useContext(AuthContext).user;
		// Keeping placeholder consistent with first attempt as original file content isn't fully known
		return { username: "Admin" };
	},
};

export default function POS() {
	// --- ORIGINAL STATE AND HOOKS (UNCHANGED) ---
	const [categories, setCategories] = useState([]);
	const [products, setProducts] = useState({}); // grouped by category name
	const [selectedCategory, setSelectedCategory] = useState(""); // Stores category name ("" for All)
	const [searchQuery, setSearchQuery] = useState("");
	const navigate = useNavigate();
	const { showOverlay } = useCartStore(); // Assuming this is used somewhere (e.g., in Cart)
	const orderId = useCartStore((state) => state.orderId);
	const addToCartAction = useCartStore((state) => state.addToCart); // Get addToCart from store (ORIGINAL METHOD)
	const cart = useCartStore((state) => state.cart); // Get cart state for display update effect (ORIGINAL METHOD)
	const { updateCartDisplay } = useCustomerCartDisplay();
	const isMountedRef = useRef(false); // Ref to track mount status (ORIGINAL METHOD)
	// State for Category Modal (if you re-add the component)
	// const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

	// --- ORIGINAL FUNCTIONS and EFFECTS (UNCHANGED) ---

	// Effect to track component mount status (ORIGINAL METHOD)
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	// Effect to update customer display when cart changes (ORIGINAL METHOD)
	useEffect(() => {
		if (isMountedRef.current) {
			// console.log("Cart changed, updating display:", cart); // Optional logging
			updateCartDisplay();
		}
		// Note: The snippet used subscribe, but the original likely relied on direct state dependency.
		// Sticking to inferred original pattern based on first attempt.
	}, [cart, updateCartDisplay]); // Dependency includes cart state and the hook function

	// Effect to fetch initial data (ORIGINAL METHOD)
	useEffect(() => {
		if (isMountedRef.current) {
			// Check mount status
			axiosInstance
				.get("products/categories/")
				.then((response) => {
					if (isMountedRef.current) {
						// Check mount status again before setting state
						setCategories(response.data);
						// Keep "All" selected initially (empty string)
						setSelectedCategory(""); // Set to empty string for "All" (ORIGINAL BEHAVIOR)
					}
				})
				.catch((error) => {
					console.error("Error fetching categories:", error);
					if (isMountedRef.current) {
						// Check mount status before showing toast
						toast.error("Could not load categories."); // Use toast if available in original
					}
				});

			axiosInstance
				.get("products/")
				.then((response) => {
					if (isMountedRef.current) {
						// Check mount status again
						const groupedProducts = response.data.reduce((acc, product) => {
							const categoryName = product.category_name || "Uncategorized"; // Handle uncategorized (ORIGINAL LOGIC)
							if (!acc[categoryName]) acc[categoryName] = [];
							acc[categoryName].push(product);
							return acc;
						}, {});
						setProducts(groupedProducts);
					}
				})
				.catch((error) => {
					console.error("Error fetching products:", error);
					if (isMountedRef.current) {
						// Check mount status
						toast.error("Could not load products."); // Use toast if available in original
					}
				});
		}
		// No return cleanup needed here as isMountedRef handles async updates
	}, []); // Empty dependency array to run once on mount

	// Filter products based on search query and selected category (ORIGINAL useMemo LOGIC)
	const filteredProducts = useMemo(() => {
		let itemsToFilter = [];
		// If 'All' ("") is selected or no category, flatten all products
		if (!selectedCategory) {
			itemsToFilter = Object.values(products).flat();
		} else if (products[selectedCategory]) {
			// Otherwise, use products from the selected category
			itemsToFilter = products[selectedCategory];
		}

		// Apply search query if present
		if (!searchQuery) {
			return itemsToFilter; // Return early if no search query
		}

		const lowerCaseQuery = searchQuery.toLowerCase();
		return itemsToFilter.filter((product) =>
			product.name.toLowerCase().includes(lowerCaseQuery)
		);
	}, [products, selectedCategory, searchQuery]); // Original dependencies

	// Original handleAddToCart - using addToCartAction from store (ORIGINAL METHOD)
	const handleAddToCart = useCallback(
		(product) => {
			if (!showOverlay) {
				// Check overlay state if needed
				addToCartAction(product); // Use the action from the store (ORIGINAL)
			}
		},
		[showOverlay, addToCartAction]
	); // Original dependencies

	// --- END OF ORIGINAL LOGIC ---

	// --- START OF UI UPDATES (Return Statement Only - Matching User Snippet) ---
	return (
		// Main container with background and flex layout (from snippet)
		<div className="flex h-screen bg-slate-100 overflow-hidden">
			{/* Main Content Area (from snippet) */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Top Bar (from snippet) */}
				<div className="bg-white border-b border-slate-200 p-3 sm:p-4 flex flex-wrap items-center gap-3 sm:gap-4 sticky top-0 z-20 shadow-sm">
					{" "}
					{/* Increased z-index */}
					{/* Branding/Title (from snippet) */}
					<h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex-shrink-0 mr-4">
						Ajeen POS
					</h1>
					{/* Search Input (from snippet) */}
					<div className="relative flex-grow sm:flex-grow-0 sm:w-60 md:w-72 lg:w-80 order-3 sm:order-2">
						{" "}
						{/* Order change for mobile */}
						<span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
							<MagnifyingGlassIcon
								className="h-5 w-5 text-slate-400"
								aria-hidden="true"
							/>
						</span>
						<input
							type="text"
							placeholder="Search products..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)} // Kept original logic hookup
							className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
						/>
					</div>
					{/* Actions Group (Right Aligned) (from snippet) */}
					<div className="flex items-center gap-3 sm:gap-4 ml-auto order-2 sm:order-3">
						{" "}
						{/* Order change for mobile */}
						{/* Dashboard Button - Styled (from snippet) */}
						<button
							className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-sm"
							onClick={() => navigate("/dashboard")} // Kept original logic hookup
							title="Go to Dashboard"
						>
							<Bars3Icon className="h-5 w-5" /> {/* Icon from snippet */}
							<span className="hidden sm:inline">Dashboard</span>{" "}
							{/* Responsive text from snippet */}
						</button>
						<LogoutButton /> {/* Component from snippet */}
					</div>
				</div>
				{/* Category Tabs - Scrollable (from snippet) */}
				{/* Adjusted top value slightly if needed based on actual header height */}
				<div className="bg-white border-b border-slate-200 sticky top-[73px] sm:top-[81px] z-10">
					<div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-white px-4">
						{/* "All" Category Button - Added for consistency with original logic */}
						<button
							key="all-categories"
							className={`flex-shrink-0 px-4 sm:px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
								selectedCategory === "" // Check for empty string (ORIGINAL LOGIC FOR "All")
									? "text-blue-600 border-blue-600"
									: "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
							}`}
							onClick={() => setSelectedCategory("")} // Kept original logic hookup
						>
							All
						</button>
						{/* Dynamic Categories (styling from snippet) */}
						{categories.map((category) => (
							<button
								key={category.id}
								className={`flex-shrink-0 px-4 sm:px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
									selectedCategory === category.name
										? "text-blue-600 border-blue-600"
										: "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
								}`}
								onClick={() => setSelectedCategory(category.name)} // Kept original logic hookup
							>
								{category.name}
							</button>
						))}
						{/* Optional: Add Manage Categories Button here if needed (from snippet) */}
						{/* <button
                                onClick={() => setIsCategoryModalOpen(true)} // Needs original state logic if used
                                className="flex-shrink-0 ml-auto px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1 whitespace-nowrap"
                                title="Manage Categories"
                            >
                                <Cog6ToothIcon className="h-4 w-4" />
                         </button> */}
					</div>
				</div>
				{/* Main Content Grid (Products + Cart) - UPDATED GRID COLUMNS */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 xl:gap-6 p-4 xl:p-6 overflow-hidden">
					{" "}
					{/* Changed lg:grid-cols-3 to lg:grid-cols-5 */}
					{/* Product Grid Area - UPDATED COL SPAN */}
					<div className="lg:col-span-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 pr-2">
						{" "}
						{/* Changed lg:col-span-2 to lg:col-span-3 */}
						{/* Loading/Empty States (JSX structure from snippet, logic adapted to original state) */}
						{Object.keys(products).length === 0 && categories.length > 0 && (
							<p className="text-center text-slate-500 pt-10">
								Loading products...
							</p>
						)}
						{Object.keys(products).length === 0 && categories.length === 0 && (
							<p className="text-center text-slate-500 pt-10">
								Loading categories and products...
							</p>
						)}
						{/* Use filteredProducts length for empty state check */}
						{Object.keys(products).length > 0 &&
							filteredProducts.length === 0 &&
							searchQuery && (
								<p className="col-span-full text-center text-slate-500 mt-10">
									No products found for &quot;{searchQuery}&quot;
									{selectedCategory ? ` in ${selectedCategory}` : ""}.
								</p>
							)}
						{Object.keys(products).length > 0 &&
							filteredProducts.length === 0 &&
							!searchQuery &&
							selectedCategory && (
								<p className="col-span-full text-center text-slate-500 mt-10">
									No products currently in the {selectedCategory} category.
								</p>
							)}
						{Object.keys(products).length > 0 &&
							filteredProducts.length === 0 &&
							!searchQuery &&
							!selectedCategory && (
								<p className="col-span-full text-center text-slate-500 mt-10">
									No products found. Add products or select a category.
								</p> // General empty state for "All"
							)}
						{/* Product Grid (styling from snippet) */}
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
							{" "}
							{/* Responsive grid */}
							{/* Map over filteredProducts (ORIGINAL LOGIC) */}
							{filteredProducts.map((product) => (
								<motion.div
									key={product.id}
									className={`bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden cursor-pointer transition-shadow hover:shadow-lg flex flex-col group relative ${
										showOverlay ? "opacity-50 pointer-events-none" : "" // Apply overlay style if needed by original logic
									}`}
									onClick={() => handleAddToCart(product)} // Kept original logic hookup
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.2 }}
									whileHover={{ y: -3 }} // Simplified hover
									layout // Animate layout changes
								>
									{/* Image Container (from snippet) */}
									<div className="w-full aspect-square bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden rounded-t-lg">
										{" "}
										{/* Added rounded-t-lg */}
										{product.image ? (
											<img
												src={product.image}
												alt={product.name}
												className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" // Scale image on hover
												// Fallback using placehold.co (from snippet)
												onError={(e) => {
													e.target.onerror = null;
													e.target.src = `https://placehold.co/300x300/e2e8f0/94a3b8?text=${product.name.charAt(
														0
													)}`;
												}}
											/>
										) : (
											// Placeholder icon (from snippet)
											<SquaresPlusIcon className="h-1/2 w-1/2 text-slate-300" />
										)}
									</div>
									{/* Product Info (from snippet) */}
									<div className="p-3 flex flex-col flex-grow justify-between">
										{" "}
										{/* Use justify-between */}
										<h3
											className="text-sm font-medium text-slate-800 mb-1 line-clamp-2"
											title={product.name}
										>
											{" "}
											{/* Allow two lines */}
											{product.name}
										</h3>
										<p className="text-base font-semibold text-blue-700 text-left mt-1">
											{" "}
											{/* Price styling */}
											{/* Use formatPrice if available in original utils, otherwise format directly */}
											{typeof formatPrice === "function"
												? formatPrice(Number(product.price))
												: `$${Number(product.price).toFixed(2)}`}
										</p>
									</div>
								</motion.div>
							))}
						</div>
					</div>
					{/* Cart Area - UPDATED COL SPAN */}
					<div className="lg:col-span-2 bg-white rounded-lg shadow-lg border border-slate-200 flex flex-col overflow-hidden h-full">
						{" "}
						{/* Changed lg:col-span-1 to lg:col-span-2 */}
						{/* Cart component takes care of its own scrolling */}
						<Cart /> {/* Original Cart component */}
					</div>
				</div>{" "}
				{/* End Main Content Grid */}
				{/* Bottom Status Bar (styling from snippet, content from original logic/placeholders) */}
				<div className="bg-slate-800 text-white px-4 py-1.5 flex justify-between items-center text-xs sm:text-sm flex-shrink-0">
					<span>Order #: {orderId || "New"}</span>
					{/* Use cart.length directly as per original logic */}
					<span>Items: {cart.length}</span>
					{/* Use authService placeholder or replace with actual user from original logic */}
					<span>User: {authService.getUserInfo()?.username || "N/A"}</span>
				</div>
			</div>{" "}
			{/* End Main Content Area */}
			{/* Category Management Modal (Keep original logic if re-added) */}
			{/* {isCategoryModalOpen && (
                <CategoryManagementModal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setIsCategoryModalOpen(false)}
                    onSuccess={() => {
                        // Original success logic (e.g., refetching categories) would go here
                        toast.success("Categories updated!");
                    }}
                />
            )} */}
		</div> // End Main Container
	);
	// --- END OF UI UPDATES ---
}
