import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import Cart from "../features/cart/components/Cart";
import axiosInstance from "../api/config/axiosConfig";

export default function POS() {
	const [categories, setCategories] = useState([]);
	const [products, setProducts] = useState({});
	const [selectedCategory, setSelectedCategory] = useState("");
	const [searchQuery, setSearchQuery] = useState(""); // ✅ New state for search query
	const navigate = useNavigate();
	const { showOverlay } = useCartStore();
	const orderId = useCartStore((state) => state.orderId);

	useEffect(() => {
		axiosInstance.get("products/categories/").then((response) => {
			setCategories(response.data);
			if (response.data.length > 0) setSelectedCategory(response.data[0].name);
		});

		axiosInstance.get("products/").then((response) => {
			const groupedProducts = response.data.reduce((acc, product) => {
				const categoryName = product.category_name;
				if (!acc[categoryName]) acc[categoryName] = [];
				acc[categoryName].push(product);
				return acc;
			}, {});
			setProducts(groupedProducts);
		});
	}, []);

	// ✅ Filter products based on search query
	const filteredProducts =
		products[selectedCategory]?.filter((product) =>
			product.name.toLowerCase().includes(searchQuery.toLowerCase())
		) || [];

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800">
			{/* Header */}
			<header className="bg-white shadow-sm p-4 flex justify-between items-center border-b border-slate-200">
				<div className="flex items-center space-x-6">
					<h1 className="text-2xl font-bold text-slate-800">Ajeen POS</h1>
					<div className="flex space-x-2">
						<span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium flex items-center">
							<span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5"></span>
							Online
						</span>
					</div>
				</div>

				<div className="flex items-center space-x-4">
					<div className="relative">
						<input
							type="text"
							placeholder="Search products..."
							className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 text-slate-400 absolute left-3 top-2.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>
					<button
						className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center"
						onClick={() => navigate("/dashboard")}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 mr-1.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 6h16M4 12h16M4 18h7"
							/>
						</svg>
						Dashboard
					</button>
				</div>
			</header>

			{/* Main Content Area */}
			<div className="flex flex-1 overflow-hidden">
				{/* Product Panel */}
				<div className="w-2/3 flex flex-col border-r border-slate-200 bg-white">
					{/* Category Tabs */}
					<div className="flex border-b border-slate-200 overflow-x-auto py-1 px-1">
						{categories.map((category) => (
							<button
								key={category.id}
								className={`px-4 py-2 text-sm font-medium rounded-lg mx-1 transition-colors
						  ${
								selectedCategory === category.name
									? "bg-blue-50 text-blue-600"
									: "text-slate-600 hover:bg-slate-50"
							}`}
								onClick={() => setSelectedCategory(category.name)}
							>
								{category.name}
							</button>
						))}
					</div>

					{/* Product Grid */}
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 overflow-y-auto">
						{filteredProducts.map((product) => (
							<button
								key={product.id}
								className={`group relative bg-white rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all
						  ${showOverlay ? "opacity-50 pointer-events-none" : ""}`}
								onClick={() =>
									!showOverlay && useCartStore.getState().addToCart(product)
								}
							>
								<div className="aspect-square bg-slate-50 rounded-t-xl overflow-hidden">
									<img
										src={product.image}
										alt={product.name}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform"
									/>
								</div>
								<div className="p-3">
									<h3 className="text-sm font-medium text-left text-slate-800">
										{product.name}
									</h3>
									<p className="text-sm text-slate-500 text-left mt-1">
										${Number(product.price).toFixed(2)}
									</p>
								</div>
							</button>
						))}
					</div>
				</div>

				{/* Cart Panel */}
				<Cart />
			</div>

			{/* Bottom Status Bar */}
			<div className="bg-slate-800 text-white px-5 py-2.5 flex justify-between text-xs">
				<span>Order #: {orderId || "New"}</span>
				<span>Items: {useCartStore.getState().cart.length}</span>
				<span>User: Admin</span>
			</div>
		</div>
	);
}
