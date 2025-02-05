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
    try {
      await axiosInstance.put(`products/${encodeURIComponent(name)}/`, product);
      navigate("/products"); // ✅ Redirect to Products page
    } catch (error) {
      console.error("Update product error:", error);
      setError("Failed to update product. Make sure you're an Admin.");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Edit Product</h1>
      {error && <p className="text-red-500">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <input
          type="text"
          name="name"
          value={product.name}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />
        <input
          type="number"
          name="price"
          value={product.price}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />
        <textarea
          name="description"
          value={product.description}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />
        <select
          name="category"
          value={product.category}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <button type="submit" className="bg-green-500 text-white py-2 rounded">
          Save Changes
        </button>
      </form>

      <button
        onClick={() => navigate("/products")}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Back to Products
      </button>
    </div>
  );
};

export default EditProduct;
