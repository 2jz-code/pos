import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/api";
import { checkAuthStatus } from "../../api/auth";

const Products = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance
      .get("products/categories/")
      .then((response) => setCategories(response.data))
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
        ); // ✅ Use product name
        setProducts(products.filter((product) => product.name !== productName));
      } catch (error) {
        console.error("Failed to delete product:", error);
      }
    }
  };

  return (
    <div className="p-6 w-screen h-screen">
      <h1 className="text-3xl font-bold mb-4">Products</h1>

      {/* ✅ Show "Add Product" only if user is Admin */}
      {isAdmin && (
        <button
          onClick={() => navigate("/products/add")}
          className="mb-4 bg-green-500 text-white px-4 py-2 rounded"
        >
          Add Product
        </button>
      )}

      {/* Back Button */}
      <div className="p-4">
        <button
          className="px-4 py-2 bg-gray-600 text-black rounded-lg hover:bg-gray-700"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Category Filter */}
      <select
        className="border p-2 rounded mb-4"
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {/* Product List */}
      <div className="grid grid-cols-3 gap-4">
        {products
          .filter((product) =>
            selectedCategory
              ? product.category === parseInt(selectedCategory)
              : true
          )
          .map((product) => (
            <div
              key={product.name} // ✅ Use name instead of ID
              className="border p-4 rounded shadow cursor-pointer hover:bg-gray-100"
              onClick={() =>
                navigate(`/products/${encodeURIComponent(product.name)}`)
              } // ✅ Navigate using name
            >
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <p className="text-gray-600">
                ${Number(product.price).toFixed(2)}
              </p>

              {/* ✅ Show Edit/Delete Buttons Only for Admins */}
              {isAdmin && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        `/products/edit/${encodeURIComponent(product.name)}`
                      ); // ✅ Edit by name
                    }}
                    className="bg-blue-500 text-black px-3 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(product.name); // ✅ Delete by name
                    }}
                    className="bg-red-500 text-black px-3 py-1 rounded hover:scale-105 hover:duration-200"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default Products;
