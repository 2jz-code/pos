import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/api";

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
    <div className="min-h-screen flex flex-col justify-between">
      {/* Page Header */}
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="flex flex-col md:flex-row max-w-6xl w-full">
          {/* Left Side - Image Display */}
          <div className="w-full md:w-1/2 p-4 md:pr-12 flex justify-center">
            <img
              src={product.image || "fallback-image-url.jpg"} // ✅ Display image from backend
              alt={product.name}
              className="w-full h-auto object-cover rounded-md"
            />
          </div>

          {/* Right Side - Product Editing Form */}
          <div className="w-full md:w-1/2 p-4">
            <h3 className="text-3xl font-semibold mb-2 text-gray-800">
              Edit Product
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
              {/* Name Input */}
              <div>
                <label className="block text-gray-600 text-sm mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={product.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-gray-600 text-sm mb-2">
                  Price ($)
                </label>
                <input
                  type="number"
                  name="price"
                  value={product.price}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              {/* Description Textarea */}
              <div>
                <label className="block text-gray-600 text-sm mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={product.description}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-gray-600 text-sm mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={product.category}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
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
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg"
                >
                  Save Changes
                </button>

                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => navigate("/products")}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg"
                >
                  Back to Products
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
