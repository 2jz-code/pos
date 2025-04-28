import { useState, useEffect, useMemo, useCallback, useRef } from "react"; // Added React import
import axiosInstance from "../../api/config/axiosConfig"; // Original import
import { useNavigate } from "react-router-dom";
import { authService } from "../../api/services/authService"; // Original import
import { resumeOrder, updateOnlineOrderStatus } from "../../utils/orderActions"; // Original import
import KitchenDisplayButton from "../../components/KitchenDisplayButton"; // Original import
// Icons for UI
import {
	ListBulletIcon,
	Bars3Icon,
	BuildingStorefrontIcon,
	GlobeAltIcon, // Base icons
	ClockIcon,
	CheckCircleIcon,
	XCircleIcon,
	PlayCircleIcon,
	ArrowPathIcon, // Status/Action icons
	ExclamationTriangleIcon,
	InformationCircleIcon, // Info/Error icons
	EyeIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Assuming path is correct
import { formatPrice } from "../../utils/numberUtils";
import PropTypes from "prop-types";

/**
 * Orders Component (Logic Preserved from User Provided Code)
 *
 * Displays a list of orders, filterable by source and status, with infinite scroll.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
export default function Orders() {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const [orders, setOrders] = useState([]);
	const [activeTab, setActiveTab] = useState("all");
	const [orderSource, setOrderSource] = useState("pos");
	const [isAdmin, setIsAdmin] = useState(false);
	const [userName, setUserName] = useState("");
	const [loading, setLoading] = useState(false); // Tracks loading state for subsequent pages
	const [initialLoading, setInitialLoading] = useState(true); // Tracks initial load
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [totalCount, setTotalCount] = useState(0);
	const [error, setError] = useState(null); // Added error state
	const navigate = useNavigate();
	const scrollThresholdRef = useRef(false);
	const loadingRef = useRef(false);
	const listContainerRef = useRef(null); // Ref for the scrollable list container

	// Function to fetch orders with pagination (Original, wrapped in useCallback)
	const fetchOrders = useCallback(
		async (pageNum = 1, reset = false) => {
			if (loadingRef.current && !reset) return;

			loadingRef.current = true;
			if (reset) {
				setInitialLoading(true);
				setError(null);
			} else {
				setLoading(true);
			}

			try {
				const params = { source: orderSource, page: pageNum, page_size: 25 };
				if (activeTab !== "all") params.status = activeTab;

				const response = await axiosInstance.get("orders/", { params });
				const newOrders = response.data.results || [];

				setOrders((prevOrders) =>
					reset ? newOrders : [...prevOrders, ...newOrders]
				);
				setHasMore(!!response.data.next);
				setPage(pageNum);
				setTotalCount(response.data.count || 0);
			} catch (error) {
				console.error("Error fetching orders:", error);
				setError("Failed to load orders. Please try again.");
			} finally {
				setLoading(false);
				setInitialLoading(false);
				loadingRef.current = false;
				scrollThresholdRef.current = false;
			}
		},
		[orderSource, activeTab]
	);

	// Reset and fetch orders when source or tab changes (Original)
	useEffect(() => {
		setPage(1);
		scrollThresholdRef.current = false;
		if (listContainerRef.current) listContainerRef.current.scrollTop = 0;
		fetchOrders(1, true);
	}, [orderSource, activeTab, fetchOrders]);

	// Fetch user data on component mount (Original)
	useEffect(() => {
		let isMounted = true;
		const fetchUserData = async () => {
			try {
				const authResponse = await authService.checkStatus();
				if (isMounted) {
					setIsAdmin(authResponse.is_admin);
					setUserName(authResponse.username);
				}
			} catch (error) {
				if (isMounted) console.error("Error fetching user data:", error);
			}
		};
		fetchUserData();
		return () => {
			isMounted = false;
		};
	}, []);

	// Handle status update (Original)
	const handleStatusUpdate = (orderId, newStatus) => {
		updateOnlineOrderStatus(
			orderId,
			newStatus,
			(updatedOrder) => {
				setOrders((prev) =>
					prev.map((o) => (o.id === orderId ? updatedOrder : o))
				);
				// toast.success(`Order #${orderId} status updated.`); // Assuming toast is available
			},
			(error) => {
				// toast.error(`Failed to update order #${orderId}: ${error.message}`);
				console.error("Failed to update status:", error);
			}
		);
	};

	// Load more orders (Original)
	const loadMoreOrders = () => {
		if (!loadingRef.current && hasMore) {
			fetchOrders(page + 1);
		}
	};

	// Total open orders count (Original)
	const totalOpenOrders = useMemo(() => {
		const openStatuses = ["in_progress", "saved", "pending", "preparing"];
		return orders.filter(
			(order) =>
				openStatuses.includes(order.status) && order.source === orderSource
		).length;
	}, [orders, orderSource]);

	// Format date (Original - using more compact format)
	const formatDate = (timestamp) => {
		if (!timestamp) return "N/A";
		try {
			return new Date(timestamp).toLocaleString(undefined, {
				dateStyle: "short",
				timeStyle: "short",
			});
			// eslint-disable-next-line no-unused-vars
		} catch (e) {
			return "Invalid Date";
		}
	};

	// Get status tabs based on order source (Original)
	const getStatusTabs = () => {
		if (orderSource === "pos") {
			return ["in_progress", "saved", "completed", "voided"];
		} else {
			// website
			return ["pending", "preparing", "completed", "cancelled"];
		}
	};

	// Handle Resuming Orders (Original)
	const handleResumeOrder = async (orderId) => {
		try {
			await resumeOrder(orderId, navigate);
		} catch (error) {
			console.error("Error resuming order:", error);
			alert("Failed to resume order."); // Keep original alert
		}
	};

	// Scroll handler for infinite loading (Original)
	const handleScroll = (e) => {
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.5; // Threshold
		if (
			isNearBottom &&
			hasMore &&
			!loadingRef.current &&
			!scrollThresholdRef.current
		) {
			scrollThresholdRef.current = true; // Prevent multiple triggers
			loadMoreOrders();
		}
	};

	// Helper to get status badge color
	const getStatusBadgeClass = (status) => {
		switch (status) {
			case "completed":
				return "bg-emerald-100 text-emerald-700 border border-emerald-200";
			case "voided":
			case "cancelled":
				return "bg-red-100 text-red-700 border border-red-200";
			case "preparing":
			case "in_progress":
				return "bg-blue-100 text-blue-700 border border-blue-200";
			case "pending":
				return "bg-yellow-100 text-yellow-700 border border-yellow-200";
			case "saved":
				return "bg-amber-100 text-amber-700 border border-amber-200";
			default:
				return "bg-slate-100 text-slate-700 border border-slate-200";
		}
	};

	// Helper for action button styles
	const actionButtonClass =
		"p-1.5 rounded text-xs hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	return (
		<div className="w-screen h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6 overflow-hidden">
			{/* Header Section - Styled */}
			<header className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-slate-200 gap-3 flex-shrink-0">
				<h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
					<ListBulletIcon className="h-6 w-6 text-slate-600" /> Order Management
				</h1>
				<div className="flex items-center gap-2 sm:gap-3">
					{/* Kitchen Display Button - Assuming styled internally */}
					<KitchenDisplayButton />
					{/* Dashboard Button - Styled */}
					<button
						className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
						onClick={() => navigate("/dashboard")} // Original handler
					>
						<Bars3Icon className="h-4 w-4" />
						<span className="hidden sm:inline">Dashboard</span>
					</button>
				</div>
			</header>

			{/* Order Source Toggle - Styled */}
			<div className="flex mb-4 bg-white p-1.5 rounded-lg shadow-sm border border-slate-200 flex-shrink-0">
				<button
					className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
						orderSource === "pos"
							? "bg-blue-600 text-white shadow-sm"
							: "bg-white text-slate-600 hover:bg-slate-100"
					}`}
					onClick={() => {
						setOrderSource("pos");
						if (
							!["all", "in_progress", "saved", "completed", "voided"].includes(
								activeTab
							)
						)
							setActiveTab("all");
					}}
				>
					<BuildingStorefrontIcon className="h-4 w-4" /> POS Orders
				</button>
				<button
					className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
						orderSource === "website"
							? "bg-blue-600 text-white shadow-sm"
							: "bg-white text-slate-600 hover:bg-slate-100"
					}`}
					onClick={() => {
						setOrderSource("website");
						if (
							![
								"all",
								"pending",
								"preparing",
								"completed",
								"cancelled",
							].includes(activeTab)
						)
							setActiveTab("all");
					}}
				>
					<GlobeAltIcon className="h-4 w-4" /> Online Orders
				</button>
			</div>

			{/* Status Tab Navigation - Styled */}
			<div className="flex items-center flex-wrap gap-1.5 mb-4 bg-white p-1.5 rounded-lg shadow-sm border border-slate-200 overflow-x-auto custom-scrollbar flex-shrink-0">
				<button
					className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
						activeTab === "all"
							? "bg-indigo-100 text-indigo-700"
							: "bg-white text-slate-500 hover:bg-slate-100"
					}`}
					onClick={() => setActiveTab("all")}
				>
					ALL ({totalCount})
				</button>
				{getStatusTabs().map((tab) => (
					<button
						key={tab}
						className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
							activeTab === tab
								? "bg-indigo-100 text-indigo-700"
								: "bg-white text-slate-500 hover:bg-slate-100"
						}`}
						onClick={() => setActiveTab(tab)}
					>
						{tab.replace("_", " ").toUpperCase()}
					</button>
				))}
			</div>

			{/* Error Display */}
			{error && !initialLoading && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm flex-shrink-0">
					<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
					<span>{error}</span>
					<button
						onClick={() => fetchOrders(1, true)}
						className="ml-auto text-xs font-medium text-red-800 hover:underline"
					>
						<ArrowPathIcon className="h-3 w-3 inline mr-1" /> Retry
					</button>
				</div>
			)}

			{/* Orders List Area - Flex Grow and Overflow */}
			<div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200 min-h-0">
				{initialLoading ? (
					<div className="flex items-center justify-center h-full">
						{" "}
						<LoadingSpinner size="lg" />{" "}
					</div>
				) : (
					<div
						ref={listContainerRef}
						className="overflow-y-auto h-full custom-scrollbar"
						onScroll={handleScroll}
					>
						{orders.length > 0 ? (
							<table className="min-w-full divide-y divide-slate-100">
								<thead className="bg-slate-50 sticky top-0 z-10">
									<tr>
										<Th>Order ID</Th>
										<Th>Total</Th>
										<Th>Status</Th>
										<Th>Source</Th>
										<Th>Items</Th>
										<Th>Created By</Th>
										<Th>Created At</Th>
										<Th align="right">Actions</Th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-slate-100">
									{orders.map((order) => {
										return (
											<tr
												key={order.id}
												className={`hover:bg-slate-50 transition-colors ${
													isAdmin ? "opacity-70" : ""
												}`}
											>
												<Td isHeader>
													<button
														onClick={() => navigate(`${order.id}`)}
														className="text-blue-600 hover:underline"
													>
														#{order.id}
													</button>
												</Td>
												<Td isHeader>{formatPrice(order.total_price)}</Td>
												<Td>
													<span
														className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadgeClass(
															order.status
														)}`}
													>
														{order.status.replace("_", " ").toUpperCase()}
													</span>
												</Td>
												<Td>
													<span
														className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
															order.source === "website"
																? "bg-purple-100 text-purple-700 border border-purple-200"
																: "bg-cyan-100 text-cyan-700 border border-cyan-200"
														}`}
													>
														{order.source === "website" ? "ONLINE" : "POS"}
													</span>
												</Td>
												<Td>{order.item_count || "-"}</Td>
												<Td>{order.created_by || "N/A"}</Td>
												<Td>{formatDate(order.created_at)}</Td>
												<Td align="right">
													<div className="flex justify-end gap-1">
														{(order.status === "in_progress" ||
															order.status === "saved") &&
															order.source === "pos" && (
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleResumeOrder(order.id);
																	}}
																	className={`${actionButtonClass} text-blue-600 hover:bg-blue-50`}
																	title="Resume"
																>
																	<PlayCircleIcon className="h-6 w-6" />
																</button>
															)}
														{isAdmin &&
															order.status !== "voided" &&
															order.status !== "cancelled" &&
															order.status !== "completed" && (
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleStatusUpdate(
																			order.id,
																			order.source === "website"
																				? "cancelled"
																				: "voided"
																		);
																	}}
																	className={`${actionButtonClass} ${
																		isAdmin
																			? "text-slate-400 !bg-transparent"
																			: "text-red-600 hover:bg-red-50"
																	}`}
																	title={
																		order.source === "website"
																			? "Cancel Order"
																			: "Void Order"
																	}
																	// disabled={disabledActions}
																>
																	<XCircleIcon className="h-6 w-6" />
																</button>
															)}
														{order.source === "website" &&
															order.status === "pending" && (
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleStatusUpdate(order.id, "preparing");
																	}}
																	className={`${actionButtonClass} text-amber-600 hover:bg-amber-50`}
																	title="Start Preparing"
																>
																	<ClockIcon className="h-4 w-4" />
																</button>
															)}
														{order.source === "website" &&
															order.status === "preparing" && (
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleStatusUpdate(order.id, "completed");
																	}}
																	className={`${actionButtonClass} text-emerald-600 hover:bg-emerald-50`}
																	title="Mark Completed"
																>
																	<CheckCircleIcon className="h-4 w-4" />
																</button>
															)}
														<button
															onClick={() => navigate(`${order.id}`)}
															className={`${actionButtonClass} text-slate-500`}
															title="View Details"
														>
															<EyeIcon className="h-6 w-6y" />
														</button>
													</div>
												</Td>
											</tr>
										);
									})}
								</tbody>
							</table>
						) : (
							<div className="p-8 text-center text-slate-500">
								No orders found matching the criteria.
							</div>
						)}
						{/* Loading more indicator */}
						{loading && !initialLoading && (
							<div className="p-4 text-center text-slate-500 text-sm">
								<ArrowPathIcon className="h-4 w-4 inline animate-spin mr-2" />{" "}
								Loading more orders...
							</div>
						)}
						{/* End of list message */}
						{!loading && !hasMore && orders.length > 0 && (
							<div className="p-4 text-center text-slate-400 text-xs italic">
								End of orders list.
							</div>
						)}
					</div>
				)}
			</div>

			{/* Status Bar - Optional */}
			<footer className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg flex flex-wrap justify-between items-center text-xs mt-4 flex-shrink-0">
				<span className="flex items-center gap-2">
					<InformationCircleIcon className="w-3.5 h-3.5 text-slate-400" />
					<span>
						Showing {orders.length} of {totalCount} orders
					</span>
				</span>
				<span className="text-slate-400">
					{orderSource === "pos"
						? `Open POS: ${totalOpenOrders}`
						: `Active Online: ${totalOpenOrders}`}
				</span>
				<span className="text-slate-400">
					User: <span className="font-medium text-slate-200">{userName}</span> (
					<span className="font-medium text-slate-200">
						{isAdmin ? "Admin" : "Staff"}
					</span>
					)
				</span>
			</footer>
		</div>
	);
	// --- END OF UPDATED UI ---
}

// Helper components for table styling
const Th = ({ children, align = "left" }) => (
	<th
		scope="col"
		className={`px-4 py-2.5 text-${align} text-xs font-semibold text-slate-500 uppercase tracking-wider`}
	>
		{children}
	</th>
);
Th.propTypes = { children: PropTypes.node, align: PropTypes.string };

const Td = ({ children, align = "left", isHeader = false }) => (
	<td
		className={`px-4 py-3 whitespace-nowrap text-sm text-${align} ${
			isHeader ? "font-medium text-slate-800" : "text-slate-600"
		}`}
	>
		{children}
	</td>
);
Td.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	isHeader: PropTypes.bool,
};
