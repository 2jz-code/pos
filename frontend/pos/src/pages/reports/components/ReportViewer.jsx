// src/components/reports/ReportViewer.jsx
import { useRef } from "react";
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PropTypes from "prop-types";

const ReportViewer = ({ data, type, onBack }) => {
	const reportRef = useRef(null);

	// Format currency
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
		}).format(amount);
	};

	// Export as PDF
	const exportAsPDF = async () => {
		if (!reportRef.current) return;

		try {
			const canvas = await html2canvas(reportRef.current, {
				scale: 2,
				logging: false,
				useCORS: true,
			});

			const imgData = canvas.toDataURL("image/png");
			const pdf = new jsPDF("p", "mm", "a4");
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();
			const imgWidth = canvas.width;
			const imgHeight = canvas.height;
			const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
			const imgX = (pdfWidth - imgWidth * ratio) / 2;
			const imgY = 30;

			pdf.addImage(
				imgData,
				"PNG",
				imgX,
				imgY,
				imgWidth * ratio,
				imgHeight * ratio
			);
			pdf.save(`report-${type}-${new Date().toISOString().split("T")[0]}.pdf`);
		} catch (error) {
			console.error("Error exporting PDF:", error);
			alert("Failed to export as PDF. Please try again.");
		}
	};

	// Export as CSV
	const exportAsCSV = () => {
		let csvContent = "data:text/csv;charset=utf-8,";
		let exportData = [];

		// Prepare data based on report type
		if (type === "sales") {
			csvContent += "Date,Order Count,Subtotal,Tax,Total,Average Order Value\n";
			exportData = data.data.map((item) => [
				item.date,
				item.order_count,
				item.subtotal,
				item.tax,
				item.total,
				item.avg_order_value,
			]);
		} else if (type === "product") {
			csvContent +=
				"Product Name,Category,Quantity Sold,Revenue,Average Price\n";
			exportData = data.products.map((item) => [
				item.product_name,
				item.category,
				item.quantity_sold,
				item.revenue,
				item.avg_price,
			]);
		} else if (type === "payment") {
			if (data.data[0] && data.data[0].payment_method) {
				csvContent +=
					"Payment Method,Transaction Count,Total Amount,Refund Count,Success Rate\n";
			} else {
				csvContent +=
					"Date,Transaction Count,Total Amount,Refund Count,Success Rate\n";
			}
			exportData = data.data.map((item) => [
				item.payment_method || item.date,
				item.transaction_count,
				item.total_amount,
				item.refund_count,
				item.success_rate,
			]);
		} else if (type === "operational") {
			csvContent += "Hour,Order Count,Revenue,Average Order Value\n";
			exportData = data.hourly_data.map((item) => [
				item.hour,
				item.order_count,
				item.revenue,
				item.avg_order_value,
			]);
		}

		// Add rows to CSV
		exportData.forEach((row) => {
			csvContent += row.join(",") + "\n";
		});

		// Create download link
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute(
			"download",
			`report-${type}-${new Date().toISOString().split("T")[0]}.csv`
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Colors for charts
	const COLORS = [
		"#3b82f6",
		"#10b981",
		"#8b5cf6",
		"#f59e0b",
		"#ef4444",
		"#6366f1",
		"#ec4899",
	];

	// Render different report types
	const renderSalesReport = () => {
		return (
			<>
				<div className="mb-8">
					<h2 className="text-xl font-semibold text-slate-800 mb-6">
						Sales Summary
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Total Orders
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{data.summary.total_orders}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Total Revenue
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{formatCurrency(data.summary.total_revenue)}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Avg. Daily Orders
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{data.summary.avg_daily_orders.toFixed(1)}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Avg. Order Value
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{formatCurrency(data.summary.avg_order_value)}
							</p>
						</div>
					</div>
				</div>

				<div className="mb-8">
					<h2 className="text-xl font-semibold text-slate-800 mb-6">
						Sales Trend
					</h2>
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
						<div className="h-80">
							<ResponsiveContainer
								width="100%"
								height="100%"
							>
								<LineChart
									data={data.data}
									margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
								>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="date" />
									<YAxis
										yAxisId="left"
										orientation="left"
									/>
									<YAxis
										yAxisId="right"
										orientation="right"
									/>
									<Tooltip formatter={(value) => formatCurrency(value)} />
									<Legend />
									<Line
										yAxisId="left"
										type="monotone"
										dataKey="total"
										name="Total Sales"
										stroke="#3b82f6"
										activeDot={{ r: 8 }}
									/>
									<Line
										yAxisId="right"
										type="monotone"
										dataKey="order_count"
										name="Order Count"
										stroke="#10b981"
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>

				<div>
					<h2 className="text-xl font-semibold text-slate-800 mb-6">
						Sales Breakdown
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
											Date
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Orders
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Subtotal
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Tax
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Total
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Avg. Order
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-slate-200">
									{data.data.map((item, index) => (
										<tr
											key={index}
											className="hover:bg-slate-50"
										>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
												{item.date}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
												{item.order_count}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
												{formatCurrency(item.subtotal)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
												{formatCurrency(item.tax)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-800">
												{formatCurrency(item.total)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
												{formatCurrency(item.avg_order_value)}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot className="bg-slate-50">
									<tr>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
											Total
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-800">
											{data.summary.total_orders}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-800">
											{formatCurrency(
												data.data.reduce((sum, item) => sum + item.subtotal, 0)
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-800">
											{formatCurrency(
												data.data.reduce((sum, item) => sum + item.tax, 0)
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-800">
											{formatCurrency(data.summary.total_revenue)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-800">
											{formatCurrency(data.summary.avg_order_value)}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					</div>
				</div>
			</>
		);
	};

	const renderProductReport = () => {
		return (
			<>
				<div className="mb-8">
					<h2 className="text-xl font-semibold text-slate-800 mb-6">
						Product Performance Summary
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Total Products Sold
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{data.summary.total_products_sold}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Total Revenue
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{formatCurrency(data.summary.total_revenue)}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Top Performing
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{data.summary.top_product}
							</p>
							<p className="text-xs text-slate-500 mt-1">
								Category: {data.summary.top_category}
							</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
					<div>
						<h2 className="text-xl font-semibold text-slate-800 mb-6">
							Top Products
						</h2>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<div className="h-80">
								<ResponsiveContainer
									width="100%"
									height="100%"
								>
									<BarChart
										data={data.products.slice(0, 10)}
										margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
										layout="vertical"
									>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" />
										<YAxis
											dataKey="product_name"
											type="category"
											width={150}
										/>
										<Tooltip
											formatter={(value, name) => {
												return name === "revenue"
													? formatCurrency(value)
													: value;
											}}
										/>
										<Legend />
										<Bar
											dataKey="revenue"
											name="Revenue"
											fill="#3b82f6"
										/>
										<Bar
											dataKey="quantity_sold"
											name="Quantity Sold"
											fill="#10b981"
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>

					<div>
						<h2 className="text-xl font-semibold text-slate-800 mb-6">
							Revenue by Category
						</h2>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<div className="h-80">
								<ResponsiveContainer
									width="100%"
									height="100%"
								>
									<PieChart>
										<Pie
											data={data.categories}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({ name, percent }) =>
												`${name}: ${(percent * 100).toFixed(0)}%`
											}
											outerRadius={80}
											fill="#8884d8"
											dataKey="revenue"
											nameKey="category"
										>
											{data.categories.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={COLORS[index % COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip formatter={(value) => formatCurrency(value)} />
										<Legend />
									</PieChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>
				</div>

				<div>
					<h2 className="text-xl font-semibold text-slate-800 mb-6">
						Product Details
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
											Quantity Sold
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Avg. Price
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
									{data.products.map((product) => (
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
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
												{formatCurrency(product.avg_price)}
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
			</>
		);
	};

	const renderPaymentReport = () => {
		// Check if we have payment method data or date-based data
		const isPaymentMethodBased = data.data[0] && data.data[0].payment_method;

		return (
			<>
				<div className="mb-8">
					<h2 className="text-xl font-semibold text-slate-800 mb-6">
						Payment Analytics Summary
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Total Transactions
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{data.summary.total_transactions}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Total Amount
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{formatCurrency(data.summary.total_amount)}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Refunds
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{data.summary.total_refunds}
							</p>
							<p className="text-xs text-slate-500 mt-1">
								Rate: {data.summary.refund_rate}%
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Period
							</h3>
							<p className="text-lg font-medium text-slate-800">
								{data.summary.period_start}
							</p>
							<p className="text-xs text-slate-500 mt-1">
								to {data.summary.period_end}
							</p>
						</div>
					</div>
				</div>

				{isPaymentMethodBased ? (
					// Payment method based visualization
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
						<div>
							<h2 className="text-xl font-semibold text-slate-800 mb-6">
								Payment Method Distribution
							</h2>
							<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
								<div className="h-80">
									<ResponsiveContainer
										width="100%"
										height="100%"
									>
										<PieChart>
											<Pie
												data={data.data}
												cx="50%"
												cy="50%"
												labelLine={false}
												label={({ name, percent }) =>
													`${name}: ${(percent * 100).toFixed(0)}%`
												}
												outerRadius={80}
												fill="#8884d8"
												dataKey="total_amount"
												nameKey="payment_method"
											>
												{data.data.map((entry, index) => (
													<Cell
														key={`cell-${index}`}
														fill={COLORS[index % COLORS.length]}
													/>
												))}
											</Pie>
											<Tooltip formatter={(value) => formatCurrency(value)} />
											<Legend />
										</PieChart>
									</ResponsiveContainer>
								</div>
							</div>
						</div>

						<div>
							<h2 className="text-xl font-semibold text-slate-800 mb-6">
								Transaction Counts
							</h2>
							<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
								<div className="h-80">
									<ResponsiveContainer
										width="100%"
										height="100%"
									>
										<BarChart
											data={data.data}
											margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
										>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="payment_method" />
											<YAxis />
											<Tooltip />
											<Legend />
											<Bar
												dataKey="transaction_count"
												name="Transactions"
												fill="#3b82f6"
											/>
											<Bar
												dataKey="refund_count"
												name="Refunds"
												fill="#ef4444"
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>
						</div>
					</div>
				) : (
					// Date-based visualization
					<div className="mb-8">
						<h2 className="text-xl font-semibold text-slate-800 mb-6">
							Payment Trend
						</h2>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<div className="h-80">
								<ResponsiveContainer
									width="100%"
									height="100%"
								>
									<LineChart
										data={data.data}
										margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
									>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis
											yAxisId="left"
											orientation="left"
										/>
										<YAxis
											yAxisId="right"
											orientation="right"
										/>
										<Tooltip
											formatter={(value, name) => {
												return name === "total_amount"
													? formatCurrency(value)
													: value;
											}}
										/>
										<Legend />
										<Line
											yAxisId="left"
											type="monotone"
											dataKey="total_amount"
											name="Total Amount"
											stroke="#3b82f6"
											activeDot={{ r: 8 }}
										/>
										<Line
											yAxisId="right"
											type="monotone"
											dataKey="transaction_count"
											name="Transaction Count"
											stroke="#10b981"
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>
				)}

				<div>
					<h2 className="text-xl font-semibold text-slate-800 mb-6">
						Payment Details
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
											{isPaymentMethodBased ? "Payment Method" : "Date"}
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Transactions
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Total Amount
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Refunds
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Success Rate
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-slate-200">
									{data.data.map((item, index) => (
										<tr
											key={index}
											className="hover:bg-slate-50"
										>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
												{isPaymentMethodBased ? item.payment_method : item.date}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
												{item.transaction_count}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-800">
												{formatCurrency(item.total_amount)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
												{item.refund_count}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
												{item.success_rate}%
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</>
		);
	};

	const renderOperationalReport = () => {
		return (
			<>
				<div className="mb-8">
					<h2 className="text-xl font-semibold text-slate-800 mb-6">
						Operational Insights Summary
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Total Orders
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{data.summary.total_orders}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Total Revenue
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{formatCurrency(data.summary.total_revenue)}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Avg. Daily Orders
							</h3>
							<p className="text-2xl font-bold text-slate-800">
								{data.summary.avg_orders_per_day.toFixed(1)}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<h3 className="text-sm font-medium text-slate-500 mb-1">
								Peak Hours
							</h3>
							<p className="text-lg font-medium text-slate-800">
								{data.summary.peak_hours[0]}
							</p>
							<p className="text-xs text-slate-500 mt-1">
								{data.summary.peak_hours[1]}
							</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
					<div>
						<h2 className="text-xl font-semibold text-slate-800 mb-6">
							Hourly Trend
						</h2>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<div className="h-80">
								<ResponsiveContainer
									width="100%"
									height="100%"
								>
									<BarChart
										data={data.hourly_data}
										margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
									>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="hour" />
										<YAxis
											yAxisId="left"
											orientation="left"
										/>
										<YAxis
											yAxisId="right"
											orientation="right"
										/>
										<Tooltip
											formatter={(value, name) => {
												return name === "revenue"
													? formatCurrency(value)
													: value;
											}}
										/>
										<Legend />
										<Bar
											yAxisId="left"
											dataKey="order_count"
											name="Orders"
											fill="#3b82f6"
										/>
										<Bar
											yAxisId="right"
											dataKey="revenue"
											name="Revenue"
											fill="#10b981"
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>

					<div>
						<h2 className="text-xl font-semibold text-slate-800 mb-6">
							Day of Week Performance
						</h2>
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
							<div className="h-80">
								<ResponsiveContainer
									width="100%"
									height="100%"
								>
									<BarChart
										data={data.day_of_week_summary}
										margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
									>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="day_of_week" />
										<YAxis
											yAxisId="left"
											orientation="left"
										/>
										<YAxis
											yAxisId="right"
											orientation="right"
										/>
										<Tooltip
											formatter={(value, name) => {
												return name === "avg_revenue"
													? formatCurrency(value)
													: value;
											}}
										/>
										<Legend />
										<Bar
											yAxisId="left"
											dataKey="avg_order_count"
											name="Avg. Orders"
											fill="#8b5cf6"
										/>
										<Bar
											yAxisId="right"
											dataKey="avg_revenue"
											name="Avg. Revenue"
											fill="#f59e0b"
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>
				</div>

				<div>
					<h2 className="text-xl font-semibold text-slate-800 mb-6">
						Daily Performance
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
											Date
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Day
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Orders
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
									{data.daily_data.map((day, index) => (
										<tr
											key={index}
											className="hover:bg-slate-50"
										>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
												{day.date}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
												{day.day_of_week}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
												{day.order_count}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-800">
												{formatCurrency(day.revenue)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</>
		);
	};

	// Render the appropriate report based on type
	// In ReportViewer.jsx, update the renderReport function
	const renderReport = () => {
		// Add logging to help debug report type issues
		console.log("Rendering report of type:", type);

		switch (type) {
			case "sales":
			case "daily_sales":
			case "weekly_sales":
			case "monthly_sales":
				return renderSalesReport();
			case "product":
			case "product_performance":
				return renderProductReport();
			case "payment":
			case "payment_analytics":
				return renderPaymentReport();
			case "operational":
			case "operational_insights":
				return renderOperationalReport();
			default:
				console.warn("Unknown report type:", type);
				return (
					<div className="p-6 text-center">
						<div className="text-red-500 mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-12 w-12 mx-auto mb-4"
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
							Unknown Report Type
						</div>
						<p className="text-gray-600 mb-4">
							The report type &quot;{type}&quot; is not recognized. This may be
							due to a format change or incompatible report version.
						</p>
						<p className="text-gray-500 text-sm mb-6">
							Report types supported: sales, product, payment, operational
						</p>
					</div>
				);
		}
	};

	const validateReportData = (reportData) => {
		if (!reportData || !reportData.summary) {
			console.error("Invalid report data: missing summary section", reportData);
			return false;
		}

		// Check for required period data
		if (!reportData.summary.period_start || !reportData.summary.period_end) {
			console.warn(
				"Report data missing period information",
				reportData.summary
			);
			// Continue anyway as this is not critical
		}

		return true;
	};

	return (
		<div className="p-6 overflow-auto h-full">
			<div className="flex justify-between items-center mb-6">
				<button
					onClick={onBack}
					className="flex items-center text-blue-600 hover:text-blue-800"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 mr-1"
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
					Back to Report Selection
				</button>
				<div className="flex space-x-2">
					<button
						onClick={exportAsPDF}
						className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4 mr-1"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
						Export PDF
					</button>
					<button
						onClick={exportAsCSV}
						className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4 mr-1"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
						Export CSV
					</button>
				</div>
			</div>

			{validateReportData(data) ? (
				<>
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
						<h1 className="text-2xl font-bold text-slate-800 mb-2">
							{type === "sales" ||
							type === "daily_sales" ||
							type === "weekly_sales" ||
							type === "monthly_sales"
								? "Sales Report"
								: type === "product" || type === "product_performance"
								? "Product Performance Report"
								: type === "payment" || type === "payment_analytics"
								? "Payment Analytics Report"
								: type === "operational" || type === "operational_insights"
								? "Operational Insights Report"
								: "Report"}
						</h1>
						<p className="text-slate-600">
							Period: {data.summary.period_start || "Unknown"} to{" "}
							{data.summary.period_end || "Unknown"}
						</p>
					</div>

					<div ref={reportRef}>{renderReport()}</div>
				</>
			) : (
				<div className="p-6 text-center">
					<div className="text-red-500 mb-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-12 w-12 mx-auto mb-4"
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
						Invalid Report Data
					</div>
					<p className="text-gray-600 mb-4">
						The report data structure is invalid or incomplete. This may be due
						to a format change or corrupted data.
					</p>
					<button
						onClick={onBack}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Back to Reports
					</button>
				</div>
			)}
		</div>
	);
};

ReportViewer.propTypes = {
	data: PropTypes.object.isRequired,
	type: PropTypes.oneOf(["sales", "product", "payment", "operational"])
		.isRequired,
	onBack: PropTypes.func.isRequired,
};

export default ReportViewer;
