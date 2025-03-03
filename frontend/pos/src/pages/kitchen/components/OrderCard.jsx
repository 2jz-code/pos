// src/pages/kitchen/components/OrderCard.jsx
import PropTypes from "prop-types";
import { formatDistanceToNow } from "date-fns";

const OrderCard = ({ order, onPrepare, onComplete }) => {
	// Calculate time elapsed since order creation
	const timeElapsed = formatDistanceToNow(new Date(order.created_at), {
		addSuffix: true,
	});

	// Use kitchen_status for consistent UI regardless of order source
	const kitchenStatus =
		order.kitchen_status ||
		(order.source === "website"
			? order.status
			: order.status === "saved"
			? "pending"
			: order.status === "in_progress"
			? "preparing"
			: order.status);

	// Determine card styles based on kitchen status and source
	const getCardClasses = () => {
		let baseClasses =
			"border rounded-lg shadow-sm p-4 transition-all duration-300 ";

		if (kitchenStatus === "pending") {
			return baseClasses + "bg-yellow-50 border-yellow-300";
		} else if (kitchenStatus === "preparing") {
			return baseClasses + "bg-blue-50 border-blue-300";
		} else if (kitchenStatus === "completed") {
			return baseClasses + "bg-green-50 border-green-300 opacity-60";
		} else {
			return baseClasses + "bg-gray-50 border-gray-300";
		}
	};

	return (
		<div
			id={`order-${order.id}`}
			className={getCardClasses()}
		>
			{/* Header */}
			<div className="flex justify-between items-center mb-3">
				<div className="flex items-center gap-2">
					<span className="font-bold text-lg">#{order.id}</span>
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium ${
							order.source === "website"
								? "bg-purple-100 text-purple-700"
								: "bg-blue-100 text-blue-700"
						}`}
					>
						{order.source_display}
					</span>
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium ${
							kitchenStatus === "pending"
								? "bg-yellow-100 text-yellow-700"
								: kitchenStatus === "preparing"
								? "bg-blue-100 text-blue-700"
								: "bg-green-100 text-green-700"
						}`}
					>
						{kitchenStatus.toUpperCase()}
					</span>
				</div>
				<div className="text-sm text-gray-500">{timeElapsed}</div>
			</div>
			{/* Progress indicator */}
			{(kitchenStatus === "pending" || kitchenStatus === "preparing") && (
				<div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
					<div
						className={`h-2.5 rounded-full ${
							kitchenStatus === "pending" ? "bg-yellow-400" : "bg-blue-500"
						}`}
						style={{ width: `${order.progress_percent || 0}%` }}
					></div>
				</div>
			)}
			{/* Customer info */}
			{order.customer_name && (
				<div className="text-sm text-gray-700 mb-2 flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 mr-1 text-gray-500"
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
					{order.customer_name}
				</div>
			)}
			{/* Price information */}
			<div className="text-sm text-gray-700 mb-2 flex items-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-4 w-4 mr-1 text-gray-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				${parseFloat(order.total_price).toFixed(2)}
			</div>
			{/* Order items */}
			<div className="space-y-2 mb-3">
				<h3 className="font-medium text-gray-700 text-sm">
					Items ({order.items.length})
				</h3>
				<ul className="space-y-1">
					{order.items.map((item) => (
						<li
							key={item.id}
							className="text-sm flex items-center"
						>
							<span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded mr-2 font-medium">
								{item.quantity}×
							</span>
							{item.product.name}
						</li>
					))}
				</ul>
			</div>
			{/* Action buttons - use kitchen status for consistent behavior */}
			<div className="flex gap-2 mt-3">
				{kitchenStatus === "pending" && (
					<button
						onClick={() => onPrepare(order.id)}
						className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
					>
						Start Preparing
					</button>
				)}

				{kitchenStatus === "preparing" && (
					<button
						onClick={() => onComplete(order.id)}
						className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
					>
						Mark Completed
					</button>
				)}

				{kitchenStatus === "completed" && (
					<button
						disabled
						className="flex-1 bg-gray-200 text-gray-500 py-2 px-3 rounded-lg text-sm font-medium cursor-not-allowed"
					>
						Completed
					</button>
				)}
			</div>
		</div>
	);
};

OrderCard.propTypes = {
	order: PropTypes.shape({
		id: PropTypes.number.isRequired,
		status: PropTypes.string.isRequired,
		kitchen_status: PropTypes.string,
		source: PropTypes.string.isRequired,
		source_display: PropTypes.string.isRequired,
		created_at: PropTypes.string.isRequired,
		updated_at: PropTypes.string.isRequired,
		customer_name: PropTypes.string,
		total_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
			.isRequired,
		items: PropTypes.arrayOf(
			PropTypes.shape({
				id: PropTypes.number.isRequired,
				quantity: PropTypes.number.isRequired,
				product: PropTypes.shape({
					id: PropTypes.number.isRequired,
					name: PropTypes.string.isRequired,
				}).isRequired,
			})
		).isRequired,
		progress_percent: PropTypes.number,
	}).isRequired,
	onPrepare: PropTypes.func.isRequired,
	onComplete: PropTypes.func.isRequired,
};

export default OrderCard;
