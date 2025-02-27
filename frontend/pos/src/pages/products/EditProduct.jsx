import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";

const EditProduct = () => {
	const { name } = useParams(); // ✅ Get product name from URL
	const navigate = useNavigate();

	const [product, setProduct] = useState({
		name: "",
		price: "",
		description: "",
		category: "",
		image: "", // ✅ Store image from backend
	});
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Fetch product details & categories
	useEffect(() => {
		axiosInstance
			.get(`products/${encodeURIComponent(name)}/`)
			.then((response) => {
				setProduct(response.data);
				setLoading(false);
			})
			.catch(() => {
				setError("Failed to fetch product.");
				setLoading(false);
			});

		axiosInstance
			.get("products/categories/")
			.then((response) => setCategories(response.data))
			.catch(() => setError("Failed to load categories."));
	}, [name]);

	// Handle input changes
	const handleChange = (e) => {
		setProduct({ ...product, [e.target.name]: e.target.value });
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();

		// ✅ Clone the product object
		const updatedProduct = { ...product };

		// ✅ Remove the image field to prevent errors if it's just being displayed
		delete updatedProduct.image;

		try {
			await axiosInstance.put(
				`products/${encodeURIComponent(name)}/`,
				updatedProduct
			);
			navigate("/products"); // ✅ Redirect to Products page
		} catch (error) {
			console.error("Update product error:", error);
			setError("Failed to update product. Make sure you're an Admin.");
		}
	};

	if (loading) return <p>Loading...</p>;
	if (error) return <p className="text-red-500">{error}</p>;

	return (
		<div className="min-h-screen flex flex-col justify-between bg-slate-50 p-6">
			{/* Page Header */}
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-2xl font-bold text-slate-800">Edit Product</h1>
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

			<div className="flex-grow flex items-center justify-center">
				<div className="flex flex-col md:flex-row max-w-6xl w-full bg-white rounded-xl shadow-md overflow-hidden">
					{/* Left Side - Image Display */}
					<div className="w-full md:w-1/2 p-6 md:pr-12 flex justify-center items-center bg-slate-50">
						<img
							src={product.image || "fallback-image-url.jpg"}
							alt={product.name}
							className="w-full h-auto max-h-80 object-contain rounded-md"
						/>
					</div>

					{/* Right Side - Product Editing Form */}
					<div className="w-full md:w-1/2 p-6">
						<h3 className="text-xl font-semibold mb-6 text-slate-800 pb-2 border-b border-slate-100">
							Edit Product Details
						</h3>

						<form
							onSubmit={handleSubmit}
							className="flex flex-col space-y-5"
						>
							{/* Name Input */}
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Product Name
								</label>
								<input
									type="text"
									name="name"
									value={product.name}
									onChange={handleChange}
									className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									required
								/>
							</div>

							{/* Price Input */}
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Price ($)
								</label>
								<div className="relative">
									<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
										$
									</span>
									<input
										type="number"
										name="price"
										value={product.price}
										onChange={handleChange}
										className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
										required
									/>
								</div>
							</div>

							{/* Description Textarea */}
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Description
								</label>
								<textarea
									name="description"
									value={product.description}
									onChange={handleChange}
									className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none h-28"
									required
								/>
							</div>

							{/* Category Dropdown */}
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Category
								</label>
								<select
									name="category"
									value={product.category}
									onChange={handleChange}
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

							{/* Action Buttons */}
							<div className="flex space-x-4 mt-6">
								{/* Save Button */}
								<button
									type="submit"
									className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex-1 flex items-center justify-center gap-2"
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
											d="M5 13l4 4L19 7"
										/>
									</svg>
									Save Changes
								</button>

								{/* Back Button */}
								<button
									type="button"
									onClick={() => navigate("/products")}
									className="bg-slate-500 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors flex-1 flex items-center justify-center gap-2"
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
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EditProduct;
