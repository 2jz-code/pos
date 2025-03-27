// src/components/reports/ReportDashboard.jsx
import { motion } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";
import PropTypes from "prop-types";

const ReportDashboard = ({ data, isLoading, error }) => {
	// Calculate the correct success rate by excluding refunded and voided transactions
	const calculateCorrectSuccessRate = (method) => {
		// Check if we have the necessary data
		if (!method || typeof method.transaction_count !== "number") {
			return 0;
		}

		// MODIFIED: Only use failed_count as unsuccessful
		const failedCount = method.failed_count || 0;

		// Calculate success rate
		if (method.transaction_count === 0) {
			return 0;
		}

		const successRate =
			((method.transaction_count - failedCount) / method.transaction_count) *
			100;
		return Math.round(successRate * 100) / 100; // Round to 2 decimal places
	};

	// Success rate tooltip component
	const SuccessRateTooltip = () => (
		<div className="group relative inline-block ml-1">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-4 w-4 text-slate-400 cursor-help"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fillRule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
					clipRule="evenodd"
				/>
			</svg>
			<div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-10">
				Success rate is calculated by counting only failed transactions as
				unsuccessful. Refunded and voided transactions still count as
				successful.
			</div>
		</div>
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-6 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-12 w-12 text-red-500 mb-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<h3 className="text-lg font-medium text-slate-800 mb-2">
					Error Loading Dashboard
				</h3>
				<p className="text-slate-600">{error}</p>
			</div>
		);
	}

	if (!data || !data.today || !data.this_month || !data.this_year) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-6 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-12 w-12 text-slate-300 mb-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
				<h3 className="text-lg font-medium text-slate-800 mb-2">
					No Data Available
				</h3>
				<p className="text-slate-600">
					No sales data is available for the dashboard yet.
				</p>
			</div>
		);
	}

	// Format currency
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
		}).format(amount);
	};

	// Growth indicator component
	const GrowthIndicator = ({ value }) => {
		const isPositive = value >= 0;
		return (
			<div
				className={`flex items-center ${
					isPositive ? "text-emerald-600" : "text-red-600"
				}`}
			>
				{isPositive ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 mr-1"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
							clipRule="evenodd"
						/>
					</svg>
				) : (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 mr-1"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z"
							clipRule="evenodd"
						/>
					</svg>
				)}
				<span className="font-medium">{Math.abs(value).toFixed(2)}%</span>
			</div>
		);
	};

	return (
		<div className="p-6 overflow-auto h-full">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-slate-800 mb-4">
					Sales Overview
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Today's Sales */}
					<motion.div
						className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3 }}
					>
						<div className="flex justify-between items-start mb-4">
							<div>
								<h3 className="text-sm font-medium text-slate-500">
									{"Today's Sales"}
								</h3>
								<p className="text-2xl font-bold text-slate-800">
									{formatCurrency(data.today.sales)}
								</p>
							</div>
							<div className="p-2 bg-blue-50 rounded-lg">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-blue-500"
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
							</div>
						</div>
						<div className="flex justify-between items-center">
							<div className="text-sm text-slate-500">
								<span className="font-medium text-slate-700">
									{data.today.orders}
								</span>{" "}
								orders
							</div>
							<GrowthIndicator value={data.today.growth} />
						</div>
					</motion.div>

					{/* This Month's Sales */}
					<motion.div
						className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: 0.1 }}
					>
						<div className="flex justify-between items-start mb-4">
							<div>
								<h3 className="text-sm font-medium text-slate-500">
									This Month
								</h3>
								<p className="text-2xl font-bold text-slate-800">
									{formatCurrency(data.this_month.sales)}
								</p>
							</div>
							<div className="p-2 bg-purple-50 rounded-lg">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-purple-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
						</div>
						<div className="flex justify-between items-center">
							<div className="text-sm text-slate-500">
								<span className="font-medium text-slate-700">
									{data.this_month.orders}
								</span>{" "}
								orders
							</div>
							<GrowthIndicator value={data.this_month.growth} />
						</div>
					</motion.div>

					{/* This Year's Sales */}
					<motion.div
						className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: 0.2 }}
					>
						<div className="flex justify-between items-start mb-4">
							<div>
								<h3 className="text-sm font-medium text-slate-500">
									This Year
								</h3>
								<p className="text-2xl font-bold text-slate-800">
									{formatCurrency(data.this_year.sales)}
								</p>
							</div>
							<div className="p-2 bg-emerald-50 rounded-lg">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-emerald-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
							</div>
						</div>
						<div className="flex justify-between items-center">
							<div className="text-sm text-slate-500">
								<span className="font-medium text-slate-700">
									{data.this_year.orders}
								</span>{" "}
								orders
							</div>
							<div className="text-sm text-slate-500">
								{data.this_year.year}
							</div>
						</div>
					</motion.div>
				</div>
			</div>

			{/* Top Products */}
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-slate-800 mb-4">
					Top Products
				</h2>
				<div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50">
								<tr>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Product
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Category
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Sold
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Revenue
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-200">
								{data.top_products.map((product) => (
									<tr
										key={product.product_id}
										className="hover:bg-slate-50"
									>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
											{product.product_name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{product.category}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
											{product.quantity_sold}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-800">
											{formatCurrency(product.revenue)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* Payment Methods */}
			<div>
				<h2 className="text-xl font-semibold text-slate-800 mb-4">
					Payment Methods
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Payment Method Distribution */}
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
						<h3 className="text-lg font-medium text-slate-800 mb-4">
							Distribution
						</h3>
						<div className="space-y-4">
							{data.payment_methods.map((method) => (
								<div key={method.payment_method}>
									<div className="flex justify-between mb-1">
										<span className="text-sm font-medium text-slate-700">
											{method.payment_method}
										</span>
										<span className="text-sm text-slate-500">
											{formatCurrency(method.total_amount)}
										</span>
									</div>
									<div className="w-full bg-slate-200 rounded-full h-2">
										<div
											className="bg-blue-500 h-2 rounded-full"
											style={{
												width: `${
													(method.transaction_count /
														data.payment_methods.reduce(
															(sum, m) => sum + m.transaction_count,
															0
														)) *
													100
												}%`,
											}}
										></div>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Payment Success Rate */}
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
						<h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center">
							Success Rate
							<SuccessRateTooltip />
						</h3>
						<div className="grid grid-cols-2 gap-4">
							{data.payment_methods.map((method) => (
								<div
									key={`success-${method.payment_method}`}
									className="bg-slate-50 rounded-lg p-4 text-center"
								>
									<div className="text-3xl font-bold text-slate-800 mb-1">
										{calculateCorrectSuccessRate(method)}%
									</div>
									<div className="text-sm text-slate-500">
										{method.payment_method}
									</div>
									<div className="text-xs text-slate-400 mt-2">
										{method.transaction_count} transactions
										<div className="flex flex-wrap gap-1 mt-1">
											{method.refund_count > 0 && (
												<span className="text-amber-500">
													({method.refund_count} refunded)
												</span>
											)}
											{method.void_count > 0 && (
												<span className="text-red-500 ml-1">
													({method.void_count} voided)
												</span>
											)}
											{method.failed_count > 0 && (
												<span className="text-red-500 ml-1">
													({method.failed_count} failed)
												</span>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

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
				success_rate: PropTypes.number,
				refund_count: PropTypes.number,
				void_count: PropTypes.number,
			})
		),
	}),
	isLoading: PropTypes.bool,
	error: PropTypes.string,
	value: PropTypes.number,
};

export default ReportDashboard;
