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
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center space-x-4">
					<h1 className="text-2xl font-bold text-slate-800">
						Order Management
					</h1>
					<span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium flex items-center">
						<span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5"></span>
						Online
					</span>
				</div>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
					onClick={() => navigate("/dashboard")}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 6h16M4 12h16M4 18h7"
						/>
					</svg>
					Dashboard
				</button>
			</div>

			{/* Tab Navigation */}
			<div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm">
				{["in_progress", "saved", "completed", "voided"].map((tab) => (
					<button
						key={tab}
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === tab
								? "bg-blue-600 text-white"
								: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
						}`}
						onClick={() => setActiveTab(tab)}
					>
						{tab.replace("_", " ").toUpperCase()}
					</button>
				))}
			</div>

			{/* Orders List */}
			<div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm">
				{filteredOrders.length > 0 ? (
					filteredOrders.map((order) => (
						<div
							key={order.id}
							className="p-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer"
							onClick={() => navigate(`${order.id}`)}
						>
							<div className="flex justify-between items-start">
								{/* Order Info */}
								<div className="space-y-1">
									<div className="flex items-center gap-3">
										<span className="font-medium text-slate-800">
											Order #{order.id}
										</span>
										<span className="text-sm px-2 py-1 bg-slate-100 text-slate-700 rounded-lg">
											${order.total_price}
										</span>
									</div>
									<div className="text-sm text-slate-500 space-x-4">
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
											className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors flex items-center gap-1.5"
											onClick={() => handleResumeOrder(order.id)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
												/>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											Resume
										</button>
									)}
									{isAdmin && order.status !== "voided" && (
										<button
											className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors flex items-center gap-1.5"
											onClick={() => voidOrder(order.id, navigate)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M6 18L18 6M6 6l12 12"
												/>
											</svg>
											Void
										</button>
									)}
								</div>
							</div>
						</div>
					))
				) : (
					<div className="p-8 text-center text-slate-500">
						No orders in this category
					</div>
				)}
			</div>

			{/* Status Bar */}
			<div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl flex justify-between text-xs mt-4">
				<span className="flex items-center">
					<span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
					System Operational
				</span>
				<span>Total Open Orders: {totalOpenOrders}</span>
				<span>User: {isAdmin ? "Admin" : "Staff"}</span>
			</div>
		</div>
	);
}
