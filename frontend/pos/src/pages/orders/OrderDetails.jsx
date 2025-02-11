import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/api";
import { checkAuthStatus } from "../../api/auth";
import { resumeOrder, voidOrder } from "../../utils/orderActions";

export default function OrderDetails() {
	const { orderId } = useParams(); // ✅ Get Order ID from URL
	const [order, setOrder] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchOrderDetails = async () => {
			try {
				const [orderResponse, authResponse] = await Promise.all([
					axiosInstance.get(`orders/${orderId}/`), // Fetch order details
					checkAuthStatus(), // Check if user is admin
				]);

				setOrder(orderResponse.data);
				setIsAdmin(authResponse.is_admin); // ✅ Set admin status
			} catch (error) {
				console.error("Error fetching order details:", error);
			}
		};

		fetchOrderDetails();
	}, [orderId]);

	// ✅ Format Date Helper
	const formatDate = (timestamp) => new Date(timestamp).toLocaleString();

	if (!order)
		return (
			<p className="text-gray-700 text-center mt-6">Loading order details...</p>
		);

	return (
		<div className="w-screen h-screen flex flex-col bg-gray-100 text-black p-6 overflow-hidden">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center space-x-4">
					<h1 className="text-2xl font-bold text-gray-800">Order Details</h1>
					<span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
						● #{orderId}
					</span>
				</div>
				<button
					className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
					onClick={() => navigate("/orders")}
				>
					Back to Orders
				</button>
			</div>

			{/* Order Summary Card */}
			<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<label className="text-sm font-medium text-gray-600">Status</label>
						<p className="font-medium text-gray-900">{order.status}</p>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-600">Total</label>
						<p className="font-medium text-gray-900">${order.total_price}</p>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-600">Created</label>
						<p className="text-gray-900">{formatDate(order.created_at)}</p>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-600">Updated</label>
						<p className="text-gray-900">{formatDate(order.updated_at)}</p>
					</div>
				</div>
			</div>

			{/* Order Items */}
			<div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col">
				<div className="p-6 border-b">
					<h2 className="text-lg font-semibold text-gray-800">Order Items</h2>
				</div>
				<div className="overflow-y-auto max-h-[calc(100vh-460px)]">
					{" "}
					{/* Scrollable container */}
					{order.items.length > 0 ? (
						order.items.map((item) => (
							<div
								key={item.id}
								className="p-4 border-b last:border-b-0 hover:bg-gray-50"
							>
								<div className="flex justify-between items-center">
									<div>
										<h3 className="font-medium text-gray-900">
											{item.product.name}
										</h3>
										<p className="text-sm text-gray-600">
											{item.quantity} × ${item.product.price}
										</p>
									</div>
									<p className="font-medium text-gray-900">
										${(item.quantity * item.product.price).toFixed(2)}
									</p>
								</div>
							</div>
						))
					) : (
						<div className="p-6 text-center text-gray-500">
							No items in this order
						</div>
					)}
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex gap-4 mt-6">
				<button
					className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					onClick={() => resumeOrder(order.id, navigate)}
				>
					Resume Order
				</button>
				{isAdmin && order.status !== "voided" && (
					<button
						className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						onClick={() => voidOrder(order.id, navigate)}
					>
						Void Order
					</button>
				)}
			</div>

			{/* Status Bar */}
			<div className="bg-gray-800 text-white px-4 py-2 rounded-lg flex justify-between text-sm mt-4">
				<span>Status: {order.status.replace("_", " ")}</span>
				<span>User: {isAdmin ? "Admin" : "Staff"}</span>
				<span>Items: {order.items.length}</span>
			</div>
		</div>
	);
}
