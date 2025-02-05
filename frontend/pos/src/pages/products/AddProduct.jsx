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
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Add Product</h1>
      {error && <p className="text-red-500">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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
          Add Product
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

export default AddProduct;
