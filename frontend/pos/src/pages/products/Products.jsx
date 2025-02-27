import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";
import { authService } from "../../api/services/authService";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/solid";
import CategoryModal from "../../components/CategoryModal";
// import { PlusIcon } from "@heroicons/react/24/solid";
import { GoPlusCircle } from "react-icons/go";

export default function Products() {
	const [categories, setCategories] = useState([]);
	const [products, setProducts] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const navigate = useNavigate();
	const [isAddingCategory, setIsAddingCategory] = useState(false);

	const handleCategorySubmit = (newCategory) => {
		setCategories([...categories, newCategory]);
	};

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [categoriesRes, productsRes, authRes] = await Promise.all([
					axiosInstance.get("products/categories/"),
					axiosInstance.get("products/"),
					authService.checkStatus(), // Changed to use checkStatus method
				]);

				setCategories(categoriesRes.data);
				if (categoriesRes.data.length > 0) {
					setSelectedCategory(categoriesRes.data[0].name);
				}

				setProducts(productsRes.data);
				setIsAdmin(authRes.is_admin);
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		};

		fetchData();
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
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-slate-800">
					Product Management
				</h1>
				<div className="flex items-center gap-4">
					<button
						className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
						onClick={() => navigate("/dashboard")}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
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
					{isAdmin && (
						<button
							onClick={() => navigate("/products/add")}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 4v16m8-8H4"
								/>
							</svg>
							Add Product
						</button>
					)}
				</div>
			</div>

			{/* Category Tabs */}
			<div className="flex items-center flex-wrap gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm">
				{/* All Categories Button */}
				<button
					className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
				${
					!selectedCategory
						? "bg-blue-600 text-white"
						: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
				}`}
					onClick={() => setSelectedCategory("")}
				>
					All Products
				</button>

				{/* Existing Category Buttons */}
				{categories.map((category) => (
					<button
						key={category.id}
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
					${
						selectedCategory === category.name
							? "bg-blue-600 text-white"
							: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
					}`}
						onClick={() => setSelectedCategory(category.name)}
					>
						{category.name}
					</button>
				))}

				{/* Add Category Button - Only visible for admin */}
				{isAdmin && (
					<button
						onClick={() => setIsAddingCategory(true)}
						className="px-3 py-2 text-sm font-medium rounded-lg transition-colors
					bg-emerald-500 text-white hover:bg-emerald-600
					flex items-center gap-1 whitespace-nowrap ml-auto"
					>
						<GoPlusCircle className="h-5 w-5" />
						<span className="hidden sm:inline">Add Category</span>
					</button>
				)}
			</div>

			{/* Product Grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 flex-1 overflow-y-auto">
				{products
					.filter((product) =>
						selectedCategory ? product.category_name === selectedCategory : true
					)
					.map((product) => (
						<div
							key={product.name}
							className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-slate-100"
						>
							<div className="flex flex-col h-full">
								{/* Product Image */}
								<div className="aspect-square bg-slate-50 overflow-hidden">
									<img
										src={product.image || "/fallback-image.jpg"}
										alt={product.name}
										className="w-full h-full object-cover transition-transform hover:scale-105"
									/>
								</div>

								{/* Product Info */}
								<div className="flex-1 flex flex-col justify-between p-3">
									<div>
										<h3 className="text-sm font-medium text-slate-800 truncate">
											{product.name}
										</h3>
										<p className="text-xs text-slate-500 mb-1">
											{product.category_name}
										</p>
										<p className="text-slate-800 font-medium text-sm">
											${Number(product.price).toFixed(2)}
										</p>
									</div>

									{/* Admin Actions */}
									{isAdmin && (
										<div className="flex gap-2 mt-3">
											<button
												onClick={(e) => {
													e.preventDefault();
													navigate(
														`/products/edit/${encodeURIComponent(product.name)}`
													);
												}}
												className="px-2 py-1.5 bg-blue-50 text-blue-600 rounded-md text-xs hover:bg-blue-100 transition-colors flex items-center gap-1 flex-1 justify-center"
											>
												<PencilSquareIcon className="h-3.5 w-3.5" />
												<span className="hidden sm:inline">Edit</span>
											</button>
											<button
												onClick={(e) => {
													e.preventDefault();
													handleDelete(product.name);
												}}
												className="px-2 py-1.5 bg-red-50 text-red-600 rounded-md text-xs hover:bg-red-100 transition-colors flex items-center gap-1 flex-1 justify-center"
											>
												<TrashIcon className="h-3.5 w-3.5" />
												<span className="hidden sm:inline">Delete</span>
											</button>
										</div>
									)}
								</div>
							</div>
						</div>
					))}
			</div>

			{/* Status Bar */}
			<div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl flex justify-between text-xs mt-4">
				<span className="flex items-center">
					<span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
					System Operational
				</span>
				<span>Total Products: {products.length}</span>
				<span>User: {isAdmin ? "Admin" : "Staff"}</span>
			</div>

			{/* Category Modal */}
			<CategoryModal
				isOpen={isAddingCategory}
				onClose={() => setIsAddingCategory(false)}
				onSubmit={handleCategorySubmit}
				axiosInstance={axiosInstance}
			/>
		</div>
	);
}
