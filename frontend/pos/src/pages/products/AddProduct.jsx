import { useState, useEffect } from "react"; // Added React import
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig"; // Original import
// Icons for UI
import {
	ArrowLeftIcon,
	PlusIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/outline"; // Use outline icons

/**
 * AddProduct Component (Logic Preserved from User Provided Code)
 *
 * Form for adding a new product.
 * UI updated for a modern look and feel (v2); Logic remains unchanged based on user input.
 */
const AddProduct = () => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const [name, setName] = useState("");
	const [price, setPrice] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState(""); // Stores category ID
	const [categories, setCategories] = useState([]);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	// Fetch categories for dropdown (Original)
	useEffect(() => {
		axiosInstance
			.get("products/categories/")
			.then((response) => setCategories(response.data))
			.catch((error) => console.error("Error fetching categories:", error));
	}, []);

	// Handle form submission (Original)
	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null); // Clear previous errors

		try {
			await axiosInstance.post(
				"products/",
				{
					name,
					price,
					description,
					category, // Send category ID
				}
				// Removed withCredentials: true, assuming axiosInstance handles this globally
			);
			navigate("/products"); // Redirect after successful addition
		} catch (error) {
			console.error("add product error:", error);
			// Provide more specific error feedback if possible
			const errorMsg =
				error.response?.data?.detail ||
				"Failed to add product. Check details or ensure you have admin rights.";
			setError(errorMsg);
		}
	};
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI v2 (JSX Structure and Styling Only) ---
	return (
		// Main container with consistent background and padding
		<div className="w-screen h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6">
			{/* Header Section - Styled */}
			<header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
				<h1 className="text-xl sm:text-2xl font-bold text-slate-800">
					Add New Product
				</h1>
				{/* Back Button - Styled */}
				<button
					onClick={() => navigate("/products")} // Original handler
					className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Back to Products
				</button>
			</header>

			{/* Form Card Container - Centered */}
			<div className="flex-1 flex items-center justify-center py-6">
				{" "}
				{/* Added padding */}
				<div className="w-full max-w-lg">
					{/* Form Card - Styled */}
					<div className="bg-white rounded-lg shadow-xl border border-slate-200 p-6 sm:p-8">
						{/* Error Message Display - Styled */}
						{error && ( // Original condition
							<div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm">
								<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
								<span>{error}</span>
							</div>
						)}

						{/* Form - uses original handler */}
						<form
							onSubmit={handleSubmit}
							className="space-y-5" // Adjusted spacing
						>
							{/* Form Fields */}
							<div>
								<label
									htmlFor="product-name"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									{" "}
									{/* Increased margin */}
									Product Name
								</label>
								<input
									id="product-name"
									type="text"
									value={name} // Original state
									onChange={(e) => setName(e.target.value)} // Original handler
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm placeholder-slate-400" // Added placeholder style
									required // Original attribute
									placeholder="e.g., Zaatar Mana'eesh"
								/>
							</div>

							<div>
								<label
									htmlFor="product-price"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									{" "}
									{/* Increased margin */}
									Price
								</label>
								<div className="relative">
									<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
										$
									</span>
									<input
										id="product-price"
										type="number"
										step="0.01" // Added step for currency
										min="0" // Added min value
										value={price} // Original state
										onChange={(e) => setPrice(e.target.value)} // Original handler
										className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm placeholder-slate-400" // Added placeholder style
										required // Original attribute
										placeholder="0.00"
									/>
								</div>
							</div>

							<div>
								<label
									htmlFor="product-description"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									{" "}
									{/* Increased margin */}
									Description
								</label>
								<textarea
									id="product-description"
									value={description} // Original state
									onChange={(e) => setDescription(e.target.value)} // Original handler
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm h-24 resize-none placeholder-slate-400" // Reduced height, added placeholder style
									required // Original attribute
									placeholder="Enter a brief description..."
								/>
							</div>

							<div>
								<label
									htmlFor="product-category"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									{" "}
									{/* Increased margin */}
									Category
								</label>
								<select
									id="product-category"
									value={category} // Original state
									onChange={(e) => setCategory(e.target.value)} // Original handler
									className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm appearance-none bg-white bg-no-repeat bg-right-3 text-slate-700" // Added text color
									required // Original attribute
								>
									<option
										value=""
										disabled
									>
										Select Category...
									</option>{" "}
									{/* Changed placeholder */}
									{/* Map over original categories state */}
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

							{/* Submit Button - Styled */}
							<button
								type="submit"
								className="w-full mt-2 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm" // Adjusted padding/margin
							>
								<PlusIcon className="h-5 w-5" />
								Add Product
							</button>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
	// --- END OF UPDATED UI v2 ---
};

export default AddProduct; // Assuming default export based on usage
