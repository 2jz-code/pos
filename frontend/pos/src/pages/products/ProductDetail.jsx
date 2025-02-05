import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/api";

const ProductDetail = () => {
  const { name } = useParams();
  const [product, setProduct] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance
      .get(`products/${encodeURIComponent(name)}/`)
      .then((response) => {
        setProduct(response.data);
      })
      .catch((error) => console.error("Error fetching product:", error));
  }, [name]);

  if (!product) return <p className="text-center text-red-500">Loading...</p>;

  return (
    <div className="h-screen min-w-screen p-6 max-w-lg mx-auto bg-white">
      <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
      <p className="text-gray-600 text-lg">
        ${Number(product.price).toFixed(2)}
      </p>
      <p className="mt-2 text-gray-700">{product.description}</p>

      <button
        onClick={() => navigate("/products")}
        className="mt-4 bg-blue-500 text-black px-4 py-2 rounded"
      >
        Back to Products
      </button>
    </div>
  );
};

export default ProductDetail;
