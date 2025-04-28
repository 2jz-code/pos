import { motion } from "framer-motion"; // Original import
import LoadingSpinner from "./LoadingSpinner"; // Original import
import PropTypes from "prop-types";
// Icons for UI
import {
	ArrowUpIcon,
	ArrowDownIcon,
	InformationCircleIcon,
	ExclamationTriangleIcon,
	ChartBarIcon,
	CurrencyDollarIcon,
	ArchiveBoxIcon,
	CreditCardIcon,
} from "@heroicons/react/24/outline";

/**
 * ReportDashboard Component (Logic Preserved from User Provided Code)
 *
 * Displays summary cards for sales and payment metrics.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
const ReportDashboard = ({ data, isLoading, error }) => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	// Calculate the correct success rate (Original)
	const calculateCorrectSuccessRate = (method) => {
		if (!method || typeof method.transaction_count !== "number") return 0;
		const failedCount = method.failed_count || 0;
		if (method.transaction_count === 0) return 0;
		const successRate =
			((method.transaction_count - failedCount) / method.transaction_count) *
			100;
		return Math.round(successRate * 100) / 100;
	};

	// Success rate tooltip component (Original)
	const SuccessRateTooltip = () => (
		<div className="group relative inline-block ml-1">
			<InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 cursor-help" />
			<div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-slate-700 text-white text-xs rounded shadow-lg z-10">
				Success rate excludes refunded and voided transactions. Only failed
				transactions count against the success rate.
			</div>
		</div>
	);

	// Format currency (Original)
	const formatCurrency = (amount) => {
		// Handle potential null/undefined safely
		const numAmount = Number(amount);
		if (isNaN(numAmount)) {
			return "$ --"; // Or some other placeholder
		}
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
		}).format(numAmount);
	};

	// Growth indicator component (Original)
	const GrowthIndicator = ({ value }) => {
		const numValue = Number(value);
		if (isNaN(numValue)) {
			return <span className="text-xs text-slate-400">-</span>;
		}
		const isPositive = numValue >= 0;
		return (
			<div
				className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
					isPositive
						? "bg-emerald-100 text-emerald-700"
						: "bg-red-100 text-red-700"
				}`}
			>
				{isPositive ? (
					<ArrowUpIcon className="h-3 w-3 mr-0.5" />
				) : (
					<ArrowDownIcon className="h-3 w-3 mr-0.5" />
				)}
				<span>{Math.abs(numValue).toFixed(1)}%</span>{" "}
				{/* Adjusted to 1 decimal place */}
			</div>
		);
	};
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	// Loading State
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full p-6">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	// Error State
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-6 text-center">
				<ExclamationTriangleIcon className="h-10 w-10 text-red-500 mb-3" />
				<h3 className="text-base font-medium text-slate-700 mb-1">
					Error Loading Dashboard
				</h3>
				<p className="text-sm text-slate-500">{error}</p>
			</div>
		);
	}

	// No Data State
	if (
		!data ||
		!data.today ||
		!data.this_month ||
		!data.this_year ||
		!data.top_products ||
		!data.payment_methods
	) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-6 text-center">
				<ChartBarIcon className="h-12 w-12 text-slate-300 mb-4" />
				<h3 className="text-lg font-medium text-slate-700 mb-2">
					No Data Available
				</h3>
				<p className="text-sm text-slate-500">
					No summary data is available for the dashboard yet.
				</p>
			</div>
		);
	}

	// Dashboard Card Base Style
	const cardBaseStyle =
		"bg-white rounded-lg shadow-sm border border-slate-200 p-4"; // Reduced padding

	return (
		<div className="p-4 sm:p-6 space-y-6">
			{" "}
			{/* Adjusted padding and spacing */}
			{/* Sales Overview Section */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.1 }}
			>
				<h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
					<CurrencyDollarIcon className="h-5 w-5 text-slate-500" /> Sales
					Overview
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{" "}
					{/* Adjusted gap */}
					{/* Today Card */}
					<div className={cardBaseStyle}>
						<div className="flex justify-between items-center mb-1">
							<h3 className="text-sm font-medium text-slate-500">Today</h3>
							<GrowthIndicator value={data.today.growth} />
						</div>
						<p className="text-xl font-bold text-slate-800">
							{formatCurrency(data.today.sales)}
						</p>
						<p className="text-xs text-slate-500 mt-1">
							{data.today.orders} orders
						</p>
					</div>
					{/* Month Card */}
					<div className={cardBaseStyle}>
						<div className="flex justify-between items-center mb-1">
							<h3 className="text-sm font-medium text-slate-500">This Month</h3>
							<GrowthIndicator value={data.this_month.growth} />
						</div>
						<p className="text-xl font-bold text-slate-800">
							{formatCurrency(data.this_month.sales)}
						</p>
						<p className="text-xs text-slate-500 mt-1">
							{data.this_month.orders} orders
						</p>
					</div>
					{/* Year Card */}
					<div className={`${cardBaseStyle} sm:col-span-2 lg:col-span-1`}>
						{" "}
						{/* Span across on small screens */}
						<div className="flex justify-between items-center mb-1">
							<h3 className="text-sm font-medium text-slate-500">
								This Year ({data.this_year.year})
							</h3>
							{/* No growth indicator for year in original data */}
						</div>
						<p className="text-xl font-bold text-slate-800">
							{formatCurrency(data.this_year.sales)}
						</p>
						<p className="text-xs text-slate-500 mt-1">
							{data.this_year.orders} orders
						</p>
					</div>
				</div>
			</motion.div>
			{/* Top Products Section */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
			>
				<h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
					<ArchiveBoxIcon className="h-5 w-5 text-slate-500" /> Top Products (by
					Revenue)
				</h2>
				<div className={`${cardBaseStyle} overflow-x-auto`}>
					{data.top_products.length > 0 ? (
						<table className="min-w-full text-xs">
							<thead className="text-slate-500">
								<tr>
									<th className="py-1.5 px-2 text-left font-medium">Product</th>
									<th className="py-1.5 px-2 text-left font-medium">
										Category
									</th>
									<th className="py-1.5 px-2 text-right font-medium">Sold</th>
									<th className="py-1.5 px-2 text-right font-medium">
										Revenue
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{data.top_products.map((product) => (
									<tr
										key={product.product_id}
										className="hover:bg-slate-50"
									>
										<td
											className="py-1.5 px-2 font-medium text-slate-700 truncate max-w-[150px]"
											title={product.product_name}
										>
											{product.product_name}
										</td>
										<td className="py-1.5 px-2 text-slate-600">
											{product.category || "-"}
										</td>
										<td className="py-1.5 px-2 text-right text-slate-600">
											{product.quantity_sold}
										</td>
										<td className="py-1.5 px-2 text-right font-semibold text-slate-700">
											{formatCurrency(product.revenue)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<p className="text-sm text-slate-500 text-center py-4">
							No product data available for this period.
						</p>
					)}
				</div>
			</motion.div>
			{/* Payment Methods Section */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3 }}
			>
				<h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
					<CreditCardIcon className="h-5 w-5 text-slate-500" /> Payment Methods
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Distribution */}
					<div className={`${cardBaseStyle} space-y-3`}>
						<h3 className="text-sm font-medium text-slate-600">
							Distribution by Amount
						</h3>
						{data.payment_methods.length > 0 ? (
							data.payment_methods.map((method) => (
								<div key={method.payment_method}>
									<div className="flex justify-between mb-0.5">
										<span className="text-xs font-medium text-slate-700">
											{method.payment_method}
										</span>
										<span className="text-xs text-slate-500">
											{formatCurrency(method.total_amount)}
										</span>
									</div>
									<div className="w-full bg-slate-200 rounded-full h-1.5">
										<div
											className="bg-blue-500 h-1.5 rounded-full"
											style={{
												width: `${
													(method.total_amount /
														data.payment_methods.reduce(
															(sum, m) => sum + m.total_amount,
															1
														)) *
													100
												}%`,
											}}
										></div>{" "}
										{/* Avoid division by zero */}
									</div>
								</div>
							))
						) : (
							<p className="text-sm text-slate-500 text-center py-4">
								No payment data available.
							</p>
						)}
					</div>
					{/* Success Rate */}
					<div className={`${cardBaseStyle} space-y-3`}>
						<h3 className="text-sm font-medium text-slate-600 flex items-center">
							Success Rate <SuccessRateTooltip />
						</h3>
						{data.payment_methods.length > 0 ? (
							<div className="grid grid-cols-2 gap-3">
								{data.payment_methods.map((method) => (
									<div
										key={`success-${method.payment_method}`}
										className="bg-slate-50 rounded p-2 text-center border border-slate-200"
									>
										<div className="text-xl font-bold text-slate-800">
											{calculateCorrectSuccessRate(method)}%
										</div>
										<div className="text-xs text-slate-500">
											{method.payment_method}
										</div>
										<div className="text-[10px] text-slate-400 mt-1">
											({method.transaction_count} txns)
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-slate-500 text-center py-4">
								No payment data available.
							</p>
						)}
					</div>
				</div>
			</motion.div>
		</div>
	);
	// --- END OF UPDATED UI ---
};

// --- ORIGINAL PROPTYPES (UNCHANGED) ---
ReportDashboard.propTypes = {
	data: PropTypes.shape({
		today: PropTypes.shape({
			sales: PropTypes.number,
			orders: PropTypes.number,
			growth: PropTypes.number,
		}),
		this_month: PropTypes.shape({
			sales: PropTypes.number,
			orders: PropTypes.number,
			growth: PropTypes.number,
		}),
		this_year: PropTypes.shape({
			year: PropTypes.string,
			sales: PropTypes.number,
			orders: PropTypes.number,
		}),
		top_products: PropTypes.arrayOf(
			PropTypes.shape({
				product_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
				product_name: PropTypes.string,
				category: PropTypes.string,
				quantity_sold: PropTypes.number,
				revenue: PropTypes.number,
			})
		),
		payment_methods: PropTypes.arrayOf(
			PropTypes.shape({
				payment_method: PropTypes.string,
				transaction_count: PropTypes.number,
				total_amount: PropTypes.number,
				success_rate: PropTypes.number, // Note: Original data might have this, but we recalculate
				refund_count: PropTypes.number,
				void_count: PropTypes.number,
				failed_count: PropTypes.number, // Added based on calculation function
			})
		),
	}),
	isLoading: PropTypes.bool,
	error: PropTypes.string,
	value: PropTypes.number, // Removed as it's not used in the component logic provided
};

export default ReportDashboard;
