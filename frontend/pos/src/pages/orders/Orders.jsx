import { useState, useEffect } from "react";
import axiosInstance from "../../api/api";
import { useNavigate } from "react-router-dom";
import { checkAuthStatus } from "../../api/auth";
import { resumeOrder, voidOrder } from "../../utils/orderActions";

export default function Orders() {
	const [orders, setOrders] = useState([]);
	const [activeTab, setActiveTab] = useState("in_progress"); // Default tab now includes in-progress
	const [isAdmin, setIsAdmin] = useState(false);
	const navigate = useNavigate();

	// ✅ Fetch orders from backend
	useEffect(() => {
		const fetchOrdersAndUser = async () => {
			try {
				const [ordersResponse, authResponse] = await Promise.all([
					axiosInstance.get("orders/"), // Fetch all orders
					checkAuthStatus(), // Fetch user authentication details
				]);

				setOrders(ordersResponse.data);
				setIsAdmin(authResponse.is_admin);
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		};

		fetchOrdersAndUser();
	}, []);

	const formatDate = (timestamp) => new Date(timestamp).toLocaleString();

	// ✅ Categorize Orders
	const filteredOrders = orders.filter((order) => order.status === activeTab);

	// ✅ Handle Resuming "In Progress" and "Saved" Orders
	const handleResumeOrder = async (orderId) => {
		try {
			await resumeOrder(orderId, navigate);
		} catch (error) {
			console.error("Error resuming order:", error);
			alert("Failed to resume order.");
		}
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-gray-50 text-black p-6">
			<h1 className="text-4xl font-bold text-gray-800 mb-6">Orders</h1>

			{/* ✅ Back Button */}
			<button
				className="px-5 py-3 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 transition-all mb-4"
				onClick={() => navigate("/dashboard")}
			>
				← Back to Dashboard
			</button>

			{/* ✅ Tab Navigation */}
			<div className="flex space-x-4 mb-6">
				{["in_progress", "saved", "completed", "voided"].map((tab) => (
					<button
						key={tab}
						className={`px-5 py-3 rounded-lg font-semibold ${
							activeTab === tab
								? "bg-yellow-500 text-black"
								: "bg-gray-300 text-gray-800"
						} transition-all hover:bg-gray-400`}
						onClick={() => setActiveTab(tab)}
					>
						{tab.replace("_", " ").toUpperCase()} Orders
					</button>
				))}
			</div>

			{/* ✅ Orders List */}
			<div className="bg-gray-200 p-6 rounded-lg shadow-md">
				{filteredOrders.length > 0 ? (
					filteredOrders.map((order) => (
						<div
							key={order.id}
							className="flex justify-between items-center bg-gray-100 p-4 rounded-lg mb-3 shadow cursor-pointer hover:bg-gray-300 transition-all"
							onClick={() => navigate(`${order.id}`)}
						>
							<div>
								<p className="text-lg font-bold text-gray-900">
									Order #{order.id}
								</p>
								<p className="text-sm text-gray-700">
									Total: ${order.total_price}
								</p>
								<p className="text-xs text-gray-600">
									Created: {formatDate(order.created_at)}
								</p>
								<p className="text-xs text-gray-600">
									Last Updated: {formatDate(order.updated_at)}
								</p>
							</div>

							<div className="flex space-x-2">
								{/* ✅ Resume Button (For "In Progress" & "Saved" Orders) */}
								{(order.status === "in_progress" ||
									order.status === "saved") && (
									<button
										className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-all"
										onClick={() => handleResumeOrder(order.id)}
									>
										Resume
									</button>
								)}

								{/* ✅ Void Button (Only for Admins) */}
								{isAdmin && order.status !== "voided" && (
									<button
										className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-all"
										onClick={() => voidOrder(order.id, navigate)}
									>
										Void
									</button>
								)}
							</div>
						</div>
					))
				) : (
					<p className="text-center text-gray-500">No orders available.</p>
				)}
			</div>
		</div>
	);
}
