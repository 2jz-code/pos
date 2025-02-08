import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import Cart from "../components/Cart";
import axiosInstance from "../api/api";

export default function POS() {
	const [categories, setCategories] = useState([]);
	const [products, setProducts] = useState({});
	const [selectedCategory, setSelectedCategory] = useState("");
	const navigate = useNavigate();

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

	return (
		<div className="w-screen h-screen flex flex-col bg-gray-100 text-black p-6">
			{/* Search & Back Button */}
			<div className="flex items-center justify-between mb-4">
				<input
					type="text"
					placeholder="Search products..."
					className="px-4 py-2 bg-gray-300 rounded-lg w-1/3"
				/>
				<button
					className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
					onClick={() => navigate("/dashboard")}
				>
					Back to Dashboard
				</button>
			</div>

			{/* Main Layout */}
			<div className="flex flex-grow space-x-6">
				{/* Left: Product Selection */}
				<div className="w-2/3 flex flex-col">
					{/* ✅ Category Button Layout */}
					<div className="flex flex-wrap gap-4 mb-4">
						{categories.map((category) => (
							<button
								key={category.id}
								className={`px-6 py-3 text-sm font-medium rounded-lg shadow-md border transition-all duration-200
        ${
					selectedCategory === category.name
						? "bg-gray-300 text-black border-gray-300 shadow-lg"
						: "bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:shadow-md"
				}`}
								onClick={() => setSelectedCategory(category.name)}
							>
								{category.name}
							</button>
						))}
					</div>

					{/* Product Grid */}
					<div className="grid grid-cols-3 gap-4 mt-4">
						{products[selectedCategory]?.map((product) => (
							<button
								key={product.id}
								className="p-4 bg-white shadow-lg rounded-lg flex flex-col items-center hover:shadow-xl transition"
								onClick={() => useCartStore.getState().addToCart(product)}
							>
								<img
									src={product.image}
									alt={product.name}
									className="w-24 h-24 object-cover rounded-lg mb-2"
								/>
								<span className="font-medium">{product.name}</span>
								<span className="text-gray-600">
									${Number(product.price).toFixed(2)}
								</span>
							</button>
						)) || (
							<p className="text-center col-span-3">No products available</p>
						)}
					</div>
				</div>

				{/* ✅ Right: Cart Summary */}
				<Cart />
			</div>
		</div>
	);
}
