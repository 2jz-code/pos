import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/api";

const ProductDetail = () => {
	const { id } = useParams();
	const [product, setProduct] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		axiosInstance
			.get(`products/${id}/`)
			.then((response) => setProduct(response.data))
			.catch((error) => console.error("Error fetching product:", error));
	}, [id]);

	if (!product) return <p>Loading...</p>;

	return (
		<div className="p-6">
			<h1 className="text-3xl font-bold">{product.name}</h1>
			<p className="text-gray-600">${product.price.toFixed(2)}</p>
			<p className="mt-2">{product.description}</p>

			<button
				onClick={() => navigate("/products")}
				className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
			>
				Back to Products
			</button>
		</div>
	);
};

export default ProductDetail;
