import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";

const AddProduct = () => {
	const [name, setName] = useState("");
	const [price, setPrice] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("");
	const [categories, setCategories] = useState([]);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	// Fetch categories for dropdown
	useEffect(() => {
		axiosInstance
			.get("products/categories/")
			.then((response) => setCategories(response.data))
			.catch((error) => console.error("Error fetching categories:", error));
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);

		try {
			await axiosInstance.post(
				"products/",
				{
					name,
					price,
					description,
					category,
				},
				{ withCredentials: true }
			);
			navigate("/products"); // Redirect after successful addition
		} catch (error) {
			console.error("add product error:", error);
			setError("Failed to add product. Make sure you're an Admin.");
		}
	};

	// AddProduct.jsx
	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-2xl font-bold text-slate-800">Add New Product</h1>
				<button
					onClick={() => navigate("/products")}
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
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
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back to Products
				</button>
			</div>

			{/* Form Card */}
			<div className="max-w-2xl w-full mx-auto">
				<div className="bg-white rounded-xl shadow-md p-8">
					{error && (
						<div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 mr-2"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
							{error}
						</div>
					)}

					<form
						onSubmit={handleSubmit}
						className="space-y-6"
					>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Product Name
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Price
								</label>
								<div className="relative">
									<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
										$
									</span>
									<input
										type="number"
										value={price}
										onChange={(e) => setPrice(e.target.value)}
										className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
										required
									/>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Description
								</label>
								<textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-32 resize-none"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Category
								</label>
								<select
									value={category}
									onChange={(e) => setCategory(e.target.value)}
									className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white"
									required
								>
									<option value="">Select Category</option>
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
						</div>

						<button
							type="submit"
							className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
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
									d="M12 6v6m0 0v6m0-6h6m-6 0H6"
								/>
							</svg>
							Add Product
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default AddProduct;
