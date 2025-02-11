import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/api";

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

	return (
		<div className="w-screen h-screen flex flex-col bg-gray-100 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-2xl font-bold text-gray-800">Add New Product</h1>
				<button
					onClick={() => navigate("/products")}
					className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
				>
					Back to Products
				</button>
			</div>

			{/* Form Card */}
			<div className="max-w-2xl w-full mx-auto">
				<div className="bg-white rounded-lg shadow-md p-8">
					{error && (
						<div className="mb-6 p-3 bg-red-100 text-red-700 rounded-lg">
							{error}
						</div>
					)}

					<form
						onSubmit={handleSubmit}
						className="space-y-6"
					>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Product Name
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Price
								</label>
								<input
									type="number"
									value={price}
									onChange={(e) => setPrice(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Description
								</label>
								<textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Category
								</label>
								<select
									value={category}
									onChange={(e) => setCategory(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
						>
							Add Product
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default AddProduct;
