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
		<div className="w-screen h-screen flex flex-col bg-gray-100 text-black">
			{/* Toast-style Header */}
			<header className="bg-white shadow-sm p-4 flex justify-between items-center border-b border-gray-300">
				<div className="flex items-center space-x-6">
					<h1 className="text-2xl font-bold">Ajeen POS</h1>
					<div className="flex space-x-2">
						<span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
							● Online
						</span>
					</div>
				</div>

				<div className="flex items-center space-x-4">
					<input
						type="text"
						placeholder="Search products..."
						className="px-4 py-2 bg-gray-50 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					<button
						className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
						onClick={() => navigate("/dashboard")}
					>
						Dashboard
					</button>
				</div>
			</header>

			{/* Main Content Area */}
			<div className="flex flex-1 overflow-hidden">
				{/* Product Panel */}
				<div className="w-2/3 flex flex-col border-r border-gray-300 bg-white">
					{/* Category Tabs */}
					<div className="flex border-b border-gray-300">
						{categories.map((category) => (
							<button
								key={category.id}
								className={`px-6 py-3 text-sm font-medium transition-colors
                    ${
											selectedCategory === category.name
												? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
												: "text-gray-500 hover:bg-gray-50"
										}`}
								onClick={() => setSelectedCategory(category.name)}
							>
								{category.name}
							</button>
						))}
					</div>

					{/* Product Grid */}
					<div className="grid grid-cols-4 gap-4 p-4 overflow-y-auto">
						{filteredProducts.map((product) => (
							<button
								key={product.id}
								className={`group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all
                    ${showOverlay ? "opacity-50 pointer-events-none" : ""}`}
								onClick={() =>
									!showOverlay && useCartStore.getState().addToCart(product)
								}
							>
								<div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
									<img
										src={product.image}
										alt={product.name}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform"
									/>
								</div>
								<div className="p-3">
									<h3 className="text-sm font-medium text-left">
										{product.name}
									</h3>
									<p className="text-sm text-gray-600 text-left">
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
			<div className="bg-gray-800 text-white px-4 py-2 flex justify-between text-sm">
				<span>Order #: {orderId || "New"}</span>
				<span>Items: {useCartStore.getState().cart.length}</span>
				<span>User: Admin</span>
			</div>
		</div>
	);
}
