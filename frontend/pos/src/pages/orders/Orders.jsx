import { useState, useEffect, useMemo } from "react";
import axiosInstance from "../../api/config/axiosConfig";
import { useNavigate } from "react-router-dom";
import { authService } from "../../api/services/authService";
import { resumeOrder, voidOrder } from "../../utils/orderActions";

export default function Orders() {
	const [orders, setOrders] = useState([]);
	const [activeTab, setActiveTab] = useState("in_progress"); // Default tab now includes in-progress
	const [isAdmin, setIsAdmin] = useState(false);
	const navigate = useNavigate();

	const totalOpenOrders = useMemo(() => {
		return orders.filter(
			(order) => order.status === "in_progress" || order.status === "saved"
		).length;
	}, [orders]); // Only recalculate when orders array changes
	// ✅ Fetch orders from backend
	useEffect(() => {
		const fetchOrdersAndUser = async () => {
			try {
				const [ordersResponse, authResponse] = await Promise.all([
					axiosInstance.get("orders/"),
					authService.checkStatus(), // Changed to use checkStatus method
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
		<div className="w-screen h-screen flex flex-col bg-gray-100 text-black p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center space-x-4">
					<h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
					<span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
						● Online
					</span>
				</div>
				<button
					className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
					onClick={() => navigate("/dashboard")}
				>
					Dashboard
				</button>
			</div>

			{/* Tab Navigation */}
			<div className="flex flex-wrap gap-2 mb-6">
				{["in_progress", "saved", "completed", "voided"].map((tab) => (
					<button
						key={tab}
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === tab
								? "bg-blue-600 text-white"
								: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
						}`}
						onClick={() => setActiveTab(tab)}
					>
						{tab.replace("_", " ").toUpperCase()}
					</button>
				))}
			</div>

			{/* Orders List */}
			<div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm">
				{filteredOrders.length > 0 ? (
					filteredOrders.map((order) => (
						<div
							key={order.id}
							className="p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
							onClick={() => navigate(`${order.id}`)}
						>
							<div className="flex justify-between items-start">
								{/* Order Info */}
								<div className="space-y-1">
									<div className="flex items-center gap-3">
										<span className="font-medium text-gray-900">
											Order #{order.id}
										</span>
										<span className="text-sm px-2 py-1 bg-gray-100 rounded-md">
											${order.total_price}
										</span>
									</div>
									<div className="text-sm text-gray-500 space-x-4">
										<span>Created: {formatDate(order.created_at)}</span>
										<span>Updated: {formatDate(order.updated_at)}</span>
									</div>
								</div>

								{/* Order Actions */}
								<div
									className="flex gap-2"
									onClick={(e) => e.stopPropagation()}
								>
									{(order.status === "in_progress" ||
										order.status === "saved") && (
										<button
											className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-md text-sm hover:bg-blue-200 transition-colors"
											onClick={() => handleResumeOrder(order.id)}
										>
											Resume
										</button>
									)}
									{isAdmin && order.status !== "voided" && (
										<button
											className="px-3 py-1.5 bg-red-100 text-red-600 rounded-md text-sm hover:bg-red-200 transition-colors"
											onClick={() => voidOrder(order.id, navigate)}
										>
											Void
										</button>
									)}
								</div>
							</div>
						</div>
					))
				) : (
					<div className="p-8 text-center text-gray-500">
						No orders in this category
					</div>
				)}
			</div>

			{/* Status Bar */}
			<div className="bg-gray-800 text-white px-4 py-2 rounded-lg flex justify-between text-sm mt-4">
				<span>System Status: Operational</span>
				<span>Total Open Orders: {totalOpenOrders}</span>
				<span>User: {isAdmin ? "Admin" : "Staff"}</span>
			</div>
		</div>
	);
}
