import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/api";
import { checkAuthStatus } from "../../api/auth";
import {
  ChevronRightIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

export default function Products() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState(null);
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
        );
        setProducts(products.filter((product) => product.name !== productName));
      } catch (error) {
        console.error("Failed to delete product:", error);
      }
    }
  };

  return (
    <div className="w-screen min-h-screen flex flex-col bg-gray-50 text-black p-6">
      {/* ✅ Page Header */}
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Products</h1>

      {/* ✅ Back & Add Product Buttons */}
      <div className="flex justify-between items-center mb-6 max-w-[1280px]">
        <button
          className="px-5 py-3 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 transition-all"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>
        {isAdmin && (
          <button
            onClick={() => navigate("/products/add")}
            className="px-5 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-all"
          >
            + Add Product
          </button>
        )}
      </div>

      {/* ✅ Category Filter */}
      <select
        className="border p-3 rounded-lg w-1/3 mb-6 bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.name}>
            {category.name}
          </option>
        ))}
      </select>

      {/* ✅ Product List with Filtering */}
      <div className="flex flex-col space-y-3 max-w-[1280px]">
        {products
          .filter((product) =>
            selectedCategory ? product.category_name === selectedCategory : true
          )
          .map((product) => (
            <div
              key={product.name}
              className="bg-gray-200 shadow-md rounded-lg overflow-hidden transition-all duration-300"
            >
              {/* ✅ Product Header */}
              <div
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-300 transition"
                onClick={() =>
                  setExpandedProduct(
                    expandedProduct === product.name ? null : product.name
                  )
                }
              >
                <div className="flex items-center space-x-3">
                  <ChevronRightIcon
                    className={`h-6 w-6 text-gray-600 transition-transform ${
                      expandedProduct === product.name
                        ? "rotate-90"
                        : "rotate-0"
                    }`}
                  />
                  <span className="text-lg font-semibold text-gray-800">
                    {product.name}
                  </span>
                </div>
                <span className="text-gray-900 font-semibold text-lg">
                  ${Number(product.price).toFixed(2)}
                </span>
              </div>

              {/* ✅ Expanded Product Details */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  expandedProduct === product.name
                    ? "max-h-[500px] p-6 opacity-100"
                    : "max-h-0 p-0 opacity-0"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start">
                  {/* ✅ Image directly under dropdown on the left */}
                  <div className="flex justify-start">
                    <img
                      src={product.image || "fallback-image-url.jpg"}
                      alt={product.name}
                      className="w-36 h-36 object-cover rounded-lg border border-gray-200 shadow-sm"
                    />
                  </div>

                  {/* ✅ Product Info in the center */}
                  <div className="flex flex-col space-y-3 col-span-2">
                    <p className="text-gray-700 font-medium">
                      <span className="font-semibold text-gray-900">
                        Category:
                      </span>{" "}
                      {product.category_name}
                    </p>
                    <p className="text-gray-700 font-medium">
                      <span className="font-semibold text-gray-900">
                        Discount:
                      </span>{" "}
                      {product.discount ? `${product.discount}%` : "0%"}
                    </p>
                    <p className="text-gray-700 font-medium">
                      <span className="font-semibold text-gray-900">
                        Description:
                      </span>{" "}
                      {product.description || "No Description"}
                    </p>
                  </div>

                  {/* ✅ Admin Buttons in Bottom Left */}
                  {isAdmin && (
                    <div className="flex space-x-3 mt-4 col-span-3 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `/products/edit/${encodeURIComponent(product.name)}`
                          );
                        }}
                        className="px-5 py-2 bg-blue-500 text-white rounded-lg shadow-md flex items-center space-x-2 hover:bg-blue-600 transition-all"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(product.name);
                        }}
                        className="px-5 py-2 bg-red-500 text-white rounded-lg shadow-md flex items-center space-x-2 hover:bg-red-600 transition-all"
                      >
                        <TrashIcon className="h-5 w-5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
