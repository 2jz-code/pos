import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";
import { authService } from "../../api/services/authService";
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
					axiosInstance.get(`orders/${orderId}/`),
					authService.checkStatus(), // Changed to use checkStatus method
				]);

				setOrder(orderResponse.data);
				setIsAdmin(authResponse.is_admin);
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
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6 overflow-hidden">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center space-x-4">
					<h1 className="text-2xl font-bold text-slate-800">Order Details</h1>
					<span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex items-center">
						<span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>#
						{orderId}
					</span>
				</div>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
					onClick={() => navigate("/orders")}
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
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back to Orders
				</button>
			</div>

			{/* Order Summary Card */}
			<div className="bg-white rounded-xl shadow-sm p-6 mb-6">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
					<div>
						<label className="text-sm font-medium text-slate-500 mb-1 block">
							Status
						</label>
						<div
							className={`
					  font-medium text-slate-800 py-1 px-2 rounded-md inline-block
					  ${
							order.status === "completed"
								? "bg-emerald-50 text-emerald-700"
								: order.status === "voided"
								? "bg-red-50 text-red-700"
								: order.status === "in_progress"
								? "bg-blue-50 text-blue-700"
								: "bg-amber-50 text-amber-700"
						}
					`}
						>
							{order.status.replace("_", " ").toUpperCase()}
						</div>
					</div>
					<div>
						<label className="text-sm font-medium text-slate-500 mb-1 block">
							Total
						</label>
						<p className="font-medium text-slate-800 text-lg">
							${order.total_price}
						</p>
					</div>
					<div>
						<label className="text-sm font-medium text-slate-500 mb-1 block">
							Created
						</label>
						<p className="text-slate-800">{formatDate(order.created_at)}</p>
					</div>
					<div>
						<label className="text-sm font-medium text-slate-500 mb-1 block">
							Updated
						</label>
						<p className="text-slate-800">{formatDate(order.updated_at)}</p>
					</div>
				</div>
			</div>

			{/* Order Items */}
			<div className="bg-white rounded-xl shadow-sm flex-1 flex flex-col">
				<div className="p-4 border-b border-slate-200 flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 mr-2 text-slate-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
						/>
					</svg>
					<h2 className="text-lg font-semibold text-slate-800">Order Items</h2>
				</div>
				<div className="overflow-y-auto max-h-[calc(100vh-460px)]">
					{order.items.length > 0 ? (
						order.items.map((item) => (
							<div
								key={item.id}
								className="p-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors"
							>
								<div className="flex justify-between items-center">
									<div>
										<h3 className="font-medium text-slate-800 mb-1">
											{item.product.name}
										</h3>
										<p className="text-sm text-slate-500 flex items-center">
											<span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded mr-2">
												{item.quantity} × ${item.product.price}
											</span>
											{item.discount > 0 && (
												<span className="text-emerald-600 text-xs">
													({item.discount}% discount applied)
												</span>
											)}
										</p>
									</div>
									<p className="font-medium text-slate-800">
										${(item.quantity * item.product.price).toFixed(2)}
									</p>
								</div>
							</div>
						))
					) : (
						<div className="p-6 text-center text-slate-500">
							No items in this order
						</div>
					)}
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex gap-4 mt-6">
				<button
					className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
					onClick={() => resumeOrder(order.id, navigate)}
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
							d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
						/>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					Resume Order
				</button>
				{isAdmin && order.status !== "voided" && (
					<button
						className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
						onClick={() => voidOrder(order.id, navigate)}
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
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						Void Order
					</button>
				)}
			</div>

			{/* Status Bar */}
			<div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl flex justify-between text-xs mt-6">
				<span className="flex items-center">
					<span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
					Status: {order.status.replace("_", " ")}
				</span>
				<span>User: {isAdmin ? "Admin" : "Staff"}</span>
				<span>Items: {order.items.length}</span>
			</div>
		</div>
	);
}
