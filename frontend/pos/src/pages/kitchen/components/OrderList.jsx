// src/pages/kitchen/components/OrderList.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import OrderCard from "./OrderCard";

const OrderList = ({ orders, onPrepare, onComplete, isLoading }) => {
	const [statusFilter, setStatusFilter] = useState("active"); // 'active', 'pending', 'preparing', 'completed'
	const [sourceFilter, setSourceFilter] = useState("all"); // 'all', 'pos', 'website'

	// Map orders to consistent kitchen statuses for filtering
	const getKitchenStatus = (order) => {
		if (order.kitchen_status) {
			return order.kitchen_status;
		}

		// Fallback mapping if kitchen_status is not provided
		if (order.source === "website") {
			return order.status;
		} else if (order.source === "pos") {
			if (order.status === "saved") return "pending";
			if (order.status === "in_progress") return "preparing";
			return order.status;
		}

		return order.status;
	};

	// Filter orders based on the selected filters
	const filteredOrders = orders.filter((order) => {
		const kitchenStatus = getKitchenStatus(order);

		// Apply source filter
		if (sourceFilter !== "all" && order.source !== sourceFilter) {
			return false;
		}

		// Apply status filter
		if (statusFilter === "active") {
			return kitchenStatus === "pending" || kitchenStatus === "preparing";
		}
		return kitchenStatus === statusFilter;
	});

	// Group orders by status
	const pendingCount = orders.filter(
		(o) => getKitchenStatus(o) === "pending"
	).length;
	const preparingCount = orders.filter(
		(o) => getKitchenStatus(o) === "preparing"
	).length;
	const completedCount = orders.filter(
		(o) => getKitchenStatus(o) === "completed"
	).length;

	// Count by source
	const posCount = orders.filter((o) => o.source === "pos").length;
	const websiteCount = orders.filter((o) => o.source === "website").length;

	return (
		<div className="space-y-4">
			{/* Status filter tabs */}
			<div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm">
				<button
					onClick={() => setStatusFilter("active")}
					className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
						statusFilter === "active"
							? "bg-blue-600 text-white"
							: "text-gray-700 hover:bg-gray-100"
					}`}
				>
					Active ({pendingCount + preparingCount})
				</button>
				<button
					onClick={() => setStatusFilter("pending")}
					className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
						statusFilter === "pending"
							? "bg-yellow-500 text-white"
							: "text-gray-700 hover:bg-gray-100"
					}`}
				>
					Pending ({pendingCount})
				</button>
				<button
					onClick={() => setStatusFilter("preparing")}
					className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
						statusFilter === "preparing"
							? "bg-blue-600 text-white"
							: "text-gray-700 hover:bg-gray-100"
					}`}
				>
					Preparing ({preparingCount})
				</button>
				<button
					onClick={() => setStatusFilter("completed")}
					className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
						statusFilter === "completed"
							? "bg-green-600 text-white"
							: "text-gray-700 hover:bg-gray-100"
					}`}
				>
					Completed ({completedCount})
				</button>
			</div>

			{/* Source filter tabs */}
			<div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm">
				<button
					onClick={() => setSourceFilter("all")}
					className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
						sourceFilter === "all"
							? "bg-gray-800 text-white"
							: "text-gray-700 hover:bg-gray-100"
					}`}
				>
					All Sources ({orders.length})
				</button>
				<button
					onClick={() => setSourceFilter("pos")}
					className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
						sourceFilter === "pos"
							? "bg-blue-600 text-white"
							: "text-gray-700 hover:bg-gray-100"
					}`}
				>
					POS Orders ({posCount})
				</button>
				<button
					onClick={() => setSourceFilter("website")}
					className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
						sourceFilter === "website"
							? "bg-purple-600 text-white"
							: "text-gray-700 hover:bg-gray-100"
					}`}
				>
					Online Orders ({websiteCount})
				</button>
			</div>

			{/* Active filters display */}
			<div className="flex items-center text-sm text-gray-600">
				<span className="mr-2">Filters:</span>
				<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2">
					Status:{" "}
					{statusFilter === "active"
						? "Active Orders"
						: `${statusFilter.charAt(0).toUpperCase()}${statusFilter.slice(1)}`}
				</span>
				<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
					Source:{" "}
					{sourceFilter === "all"
						? "All Sources"
						: sourceFilter === "pos"
						? "POS Orders"
						: "Online Orders"}
				</span>
			</div>

			{/* Orders grid */}
			{isLoading ? (
				<div className="flex justify-center items-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			) : filteredOrders.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredOrders.map((order) => (
						<OrderCard
							key={order.id}
							order={order}
							onPrepare={onPrepare}
							onComplete={onComplete}
						/>
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center h-64 text-gray-500">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-16 w-16 mb-4 text-gray-300"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1}
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
						/>
					</svg>
					<p className="text-lg font-medium">No matching orders</p>
					<p className="text-sm">
						Try changing your filters to see more orders
					</p>
				</div>
			)}
		</div>
	);
};

OrderList.propTypes = {
	orders: PropTypes.array.isRequired,
	onPrepare: PropTypes.func.isRequired,
	onComplete: PropTypes.func.isRequired,
	isLoading: PropTypes.bool.isRequired,
};

export default OrderList;
