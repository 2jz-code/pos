import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/api";
import { checkAuthStatus } from "../../api/auth";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/solid";

export default function Products() {
	const [categories, setCategories] = useState([]);
	const [products, setProducts] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		axiosInstance
			.get("products/categories/")
			.then((response) => {
				setCategories(response.data);
				if (response.data.length > 0)
					setSelectedCategory(response.data[0].name);
			})
			.catch((error) => console.error("Error fetching categories:", error));

		axiosInstance
			.get("products/")
			.then((response) => setProducts(response.data))
			.catch((error) => console.error("Error fetching products:", error));

		checkAuthStatus().then((data) => setIsAdmin(data.is_admin));
	}, []);

	const handleDelete = async (productName) => {
		if (window.confirm("Are you sure you want to delete this product?")) {
			try {
				await axiosInstance.delete(
					`products/${encodeURIComponent(productName)}/`
				);
				setProducts(products.filter((product) => product.name !== productName));
			} catch (error) {
				console.error("Failed to delete product:", error);
			}
		}
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-gray-100 text-black p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-gray-800">Product Management</h1>
				<div className="flex items-center gap-4">
					<button
						className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
						onClick={() => navigate("/dashboard")}
					>
						Dashboard
					</button>
					{isAdmin && (
						<button
							onClick={() => navigate("/products/add")}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							Add Product
						</button>
					)}
				</div>
			</div>

			{/* Category Tabs */}
			<div className="flex flex-wrap gap-2 mb-6">
				{categories.map((category) => (
					<button
						key={category.id}
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${
								selectedCategory === category.name
									? "bg-blue-600 text-white"
									: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
							}`}
						onClick={() => setSelectedCategory(category.name)}
					>
						{category.name}
					</button>
				))}
			</div>

			{/* Product Grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 flex-1 overflow-y-auto">
				{products
					.filter((product) =>
						selectedCategory ? product.category_name === selectedCategory : true
					)
					.map((product) => (
						<div
							key={product.name}
							className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-3 max-h-96"
						>
							<div className="flex flex-col h-full">
								{/* Product Image */}
								<div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
									<img
										src={product.image || "/fallback-image.jpg"}
										alt={product.name}
										className="w-full h-full object-cover"
									/>
								</div>

								{/* Product Info */}
								<div className="flex-1 flex flex-col justify-between">
									<div>
										<h3 className="text-sm font-medium text-gray-800 truncate">
											{product.name}
										</h3>
										<p className="text-xs text-gray-500 mb-1">
											{product.category_name}
										</p>
										<p className="text-gray-900 font-medium text-sm">
											${Number(product.price).toFixed(2)}
										</p>
									</div>

									{/* Admin Actions */}
									{isAdmin && (
										<div className="flex gap-2 mt-2">
											<button
												onClick={(e) => {
													e.preventDefault();
													navigate(
														`/products/edit/${encodeURIComponent(product.name)}`
													);
												}}
												className="px-2 py-1 bg-blue-100 text-blue-600 rounded-md text-xs hover:bg-blue-200 transition-colors flex items-center gap-1"
											>
												<PencilSquareIcon className="h-3 w-3" />
												<span className="hidden sm:inline">Edit</span>
											</button>
											<button
												onClick={(e) => {
													e.preventDefault();
													handleDelete(product.name);
												}}
												className="px-2 py-1 bg-red-100 text-red-600 rounded-md text-xs hover:bg-red-200 transition-colors flex items-center gap-1"
											>
												<TrashIcon className="h-3 w-3" />
												<span className="hidden sm:inline">Delete</span>
											</button>
										</div>
									)}
								</div>
							</div>
						</div>
					))}
			</div>
			<div className="bg-gray-800 text-white px-4 py-2 rounded-lg flex justify-between text-sm">
				<span>System Status: Operational</span>
				<span>Total Products: {products.length}</span>
				<span>User: {isAdmin ? "Admin" : "Staff"}</span>
			</div>
		</div>
	);
}
