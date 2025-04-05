import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axiosInstance from "../../api/config/axiosConfig";
import { useNavigate } from "react-router-dom";
import { authService } from "../../api/services/authService";
import { resumeOrder, updateOnlineOrderStatus } from "../../utils/orderActions";
import KitchenDisplayButton from "../../components/KitchenDisplayButton";

export default function Orders() {
	const [orders, setOrders] = useState([]);
	const [activeTab, setActiveTab] = useState("all");
	const [orderSource, setOrderSource] = useState("pos");
	const [isAdmin, setIsAdmin] = useState(false);
	const [userName, setUserName] = useState("");
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [totalCount, setTotalCount] = useState(0);
	const navigate = useNavigate();
	const scrollThresholdRef = useRef(false);
	const loadingRef = useRef(false);

	// Function to fetch orders with pagination
	const fetchOrders = useCallback(
		async (pageNum = 1, reset = false) => {
			// Check if already loading using ref to prevent race conditions
			if (loadingRef.current && !reset) return;

			loadingRef.current = true;
			setLoading(true);

			try {
				// Build query parameters for our optimized endpoint
				const params = {
					source: orderSource,
					page: pageNum,
					page_size: 25,
				};

				// Add status filter if not "all"
				if (activeTab !== "all") {
					params.status = activeTab;
				}

				const response = await axiosInstance.get("orders/", { params });

				// Handle paginated response
				const newOrders = response.data.results || [];

				if (reset) {
					setOrders(newOrders);
				} else {
					setOrders((prevOrders) => [...prevOrders, ...newOrders]);
				}

				// Update pagination state
				setHasMore(!!response.data.next);
				setPage(pageNum);
				setTotalCount(response.data.count || 0);
			} catch (error) {
				console.error("Error fetching orders:", error);
			} finally {
				setLoading(false);
				loadingRef.current = false;
			}
		},
		[orderSource, activeTab]
	);

	// Reset and fetch orders when source or tab changes
	useEffect(() => {
		setPage(1);
		scrollThresholdRef.current = false;
		fetchOrders(1, true);
	}, [orderSource, activeTab, fetchOrders]);

	// Fetch user data on component mount
	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const authResponse = await authService.checkStatus();
				setIsAdmin(authResponse.is_admin);
				setUserName(authResponse.username);
			} catch (error) {
				console.error("Error fetching user data:", error);
			}
		};

		fetchUserData();
	}, []);

	const handleStatusUpdate = (orderId, newStatus) => {
		updateOnlineOrderStatus(orderId, newStatus, (updatedOrder) => {
			// Update the orders array by replacing the updated order
			setOrders(
				orders.map((order) => (order.id === orderId ? updatedOrder : order))
			);
		});
	};

	// Load more orders - now more safely implemented
	const loadMoreOrders = () => {
		if (!loadingRef.current && hasMore) {
			fetchOrders(page + 1);
		}
	};

	// Total open orders count
	const totalOpenOrders = useMemo(() => {
		return orders.filter(
			(order) =>
				(order.status === "in_progress" ||
					order.status === "saved" ||
					order.status === "pending" ||
					order.status === "preparing") &&
				order.source === orderSource
		).length;
	}, [orders, orderSource]);

	const formatDate = (timestamp) => new Date(timestamp).toLocaleString();

	// Get status tabs based on order source
	const getStatusTabs = () => {
		if (orderSource === "pos") {
			return ["in_progress", "saved", "completed", "voided"];
		} else {
			return ["pending", "preparing", "completed", "cancelled"];
		}
	};

	// Handle Resuming Orders
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
				<KitchenDisplayButton />
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

			{/* Order Source Toggle */}
			<div className="flex mb-6 bg-white p-2 rounded-xl shadow-sm">
				<button
					className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
						orderSource === "pos"
							? "bg-blue-600 text-white"
							: "bg-white text-slate-700 hover:bg-slate-50"
					}`}
					onClick={() => {
						setOrderSource("pos");
						// Keep the current tab if it's "all", otherwise set to default POS tab
						if (
							activeTab !== "all" &&
							!["in_progress", "saved", "completed", "voided"].includes(
								activeTab
							)
						) {
							setActiveTab("all");
						}
					}}
				>
					POS Orders
				</button>
				<button
					className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
						orderSource === "website"
							? "bg-blue-600 text-white"
							: "bg-white text-slate-700 hover:bg-slate-50"
					}`}
					onClick={() => {
						setOrderSource("website");
						// Keep the current tab if it's "all", otherwise set to default online tab
						if (
							activeTab !== "all" &&
							!["pending", "preparing", "completed", "cancelled"].includes(
								activeTab
							)
						) {
							setActiveTab("all");
						}
					}}
				>
					Online Orders
				</button>
			</div>

			{/* Tab Navigation */}
			<div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm">
				<button
					className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
						activeTab === "all"
							? "bg-blue-600 text-white"
							: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
					}`}
					onClick={() => setActiveTab("all")}
				>
					ALL ORDERS
				</button>

				{getStatusTabs().map((tab) => (
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

			{/* Loading indicator for initial load */}
			{loading && page === 1 && (
				<div className="flex justify-center p-8">
					<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
				</div>
			)}

			{/* Orders List with Infinite Scroll - FIXED SCROLL HANDLER */}
			<div
				className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm"
				onScroll={(e) => {
					const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

					// Only proceed if we're not already loading and there are more items to load
					if (!loadingRef.current && hasMore) {
						// Calculate if we've crossed the threshold to load more
						const shouldLoadMore =
							scrollHeight - scrollTop <= clientHeight * 1.5;

						// Only trigger load if we crossed the threshold and weren't already at the threshold
						if (shouldLoadMore && !scrollThresholdRef.current) {
							scrollThresholdRef.current = true;
							loadMoreOrders();
						}
						// Reset the threshold when we scroll back up
						else if (!shouldLoadMore && scrollThresholdRef.current) {
							scrollThresholdRef.current = false;
						}
					}
				}}
			>
				{orders.length > 0 ? (
					<>
						{orders.map((order) => (
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
											<span
												className={`text-xs px-2 py-1 rounded-lg ${
													order.source === "website"
														? "bg-purple-100 text-purple-700"
														: "bg-blue-100 text-blue-700"
												}`}
											>
												{order.source === "website" ? "ONLINE" : "POS"}
											</span>
											{/* Status indicator */}
											<span
												className={`
                        text-xs px-2 py-1 rounded-lg
                        ${
													order.status === "completed"
														? "bg-emerald-50 text-emerald-700"
														: order.status === "voided" ||
														  order.status === "cancelled"
														? "bg-red-50 text-red-700"
														: order.status === "preparing" ||
														  order.status === "in_progress"
														? "bg-blue-50 text-blue-700"
														: order.status === "pending"
														? "bg-yellow-50 text-yellow-700"
														: "bg-amber-50 text-amber-700"
												}
                      `}
											>
												{order.status.replace("_", " ").toUpperCase()}
											</span>

											{/* Item count badge - using our new serializer field */}
											{order.item_count > 0 && (
												<span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">
													{order.item_count} item
													{order.item_count !== 1 ? "s" : ""}
												</span>
											)}
										</div>
										<div className="text-sm text-slate-500 space-x-4">
											<span>Created: {formatDate(order.created_at)}</span>
											<span>Updated: {formatDate(order.updated_at)}</span>
											<span className="text-slate-600">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="h-4 w-4 inline mr-1"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
													/>
												</svg>
												Created by: {order.created_by || "Unknown"}
											</span>
										</div>
									</div>

									{/* Order Actions */}
									<div
										className="flex gap-2"
										onClick={(e) => e.stopPropagation()}
									>
										{(order.status === "in_progress" ||
											order.status === "saved") &&
											order.source === "pos" && (
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
										{isAdmin &&
											order.status !== "voided" &&
											order.status !== "cancelled" &&
											order.status !== "completed" && (
												<button
													className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors flex items-center gap-1.5"
													onClick={() =>
														handleStatusUpdate(
															order.id,
															order.source === "website"
																? "cancelled"
																: "voided"
														)
													}
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
													{order.source === "website" ? "Cancel" : "Void"}
												</button>
											)}
										{order.source === "website" &&
											order.status === "pending" && (
												<button
													className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition-colors flex items-center gap-1.5"
													onClick={(e) => {
														e.stopPropagation();
														handleStatusUpdate(order.id, "preparing");
													}}
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
													</svg>
													Start Preparing
												</button>
											)}
										{order.source === "website" &&
											order.status === "preparing" && (
												<button
													className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition-colors flex items-center gap-1.5"
													onClick={(e) => {
														e.stopPropagation();
														handleStatusUpdate(order.id, "completed");
													}}
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
													</svg>
													Complete
												</button>
											)}
									</div>
								</div>
							</div>
						))}

						{/* Loading more indicator */}
						{loading && page > 1 && (
							<div className="p-4 text-center text-slate-500">
								<div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
								Loading more orders...
							</div>
						)}

						{/* End of list message */}
						{!loading && !hasMore && orders.length > 0 && (
							<div className="p-4 text-center text-slate-500">
								End of orders list
							</div>
						)}
					</>
				) : (
					// No orders found message
					<div className="p-8 text-center text-slate-500">
						{!loading && (
							<>
								{activeTab === "all" ? (
									<>
										No {orderSource === "pos" ? "POS" : "online"} orders found
									</>
								) : (
									<>
										No {orderSource === "pos" ? "POS" : "online"} orders with
										status {activeTab.replace("_", " ")}
									</>
								)}
							</>
						)}
					</div>
				)}
			</div>

			{/* Status Bar */}
			<div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl flex justify-between text-xs mt-4">
				<span className="flex items-center">
					<span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
					System Operational
				</span>
				<span>
					{orderSource === "pos"
						? `Open POS Orders: ${totalOpenOrders}`
						: `Active Online Orders: ${totalOpenOrders}`}
					{totalCount > 0 && ` (${orders.length} of ${totalCount} loaded)`}
				</span>
				<span>
					User: {userName} ({isAdmin ? "Admin" : "Staff"})
				</span>
			</div>
		</div>
	);
}
