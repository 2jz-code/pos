import { useRef } from "react"; // Added React import
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
} from "recharts"; // Original import
import html2canvas from "html2canvas"; // Original import
import jsPDF from "jspdf"; // Original import
import PropTypes from "prop-types";
// Icons for UI
import {
	ArrowLeftIcon,
	DocumentArrowDownIcon,
	TableCellsIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

/**
 * ReportViewer Component (Logic Preserved from User Provided Code)
 *
 * Displays the generated report data with charts and tables. Includes export functionality.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
const ReportViewer = ({ data, type, onBack }) => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const reportRef = useRef(null);

	// Format currency (Original)
	const formatCurrency = (amount) => {
		const numAmount = Number(amount);
		if (isNaN(numAmount)) {
			return "$ --";
		}
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
		}).format(numAmount);
	};

	// Format date (assuming simple date string like YYYY-MM-DD)
	const formatDate = (dateString) => {
		if (!dateString) return "N/A";
		try {
			// Attempt to create a date object, assuming it might lack time info
			const date = new Date(dateString + "T00:00:00"); // Add time to avoid timezone issues
			if (isNaN(date.getTime())) return dateString; // Return original if invalid
			return date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
			// eslint-disable-next-line no-unused-vars
		} catch (e) {
			return dateString; // Return original string if parsing fails
		}
	};

	// Export as PDF (Original)
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
			const ratio = Math.min(
				(pdfWidth - 20) / imgWidth,
				(pdfHeight - 40) / imgHeight
			); // Add margins
			const imgX = (pdfWidth - imgWidth * ratio) / 2;
			const imgY = 20; // Top margin

			// Add Title
			pdf.setFontSize(16);
			pdf.text(getReportTitle(type), pdfWidth / 2, 15, { align: "center" });

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

	// Export as CSV (Original)
	const exportAsCSV = () => {
		let csvContent = "data:text/csv;charset=utf-8,";
		let headers = [];
		let exportData = [];

		// Prepare data based on report type (Original logic)
		if (type === "sales") {
			headers = [
				"Date",
				"Order Count",
				"Subtotal",
				"Tax",
				"Total",
				"Average Order Value",
			];
			exportData = data.data.map((item) => [
				item.date,
				item.order_count,
				item.subtotal,
				item.tax,
				item.total,
				item.avg_order_value,
			]);
		} else if (type === "product") {
			headers = [
				"Product Name",
				"Category",
				"Quantity Sold",
				"Revenue",
				"Average Price",
			];
			exportData = data.products.map((item) => [
				`"${item.product_name.replace(/"/g, '""')}"`,
				item.category,
				item.quantity_sold,
				item.revenue,
				item.avg_price,
			]); // Handle commas in names
		} else if (type === "payment") {
			const isPaymentMethodBased = data.data[0]?.payment_method;
			headers = [
				isPaymentMethodBased ? "Payment Method" : "Date",
				"Transaction Count",
				"Total Amount",
				"Refund Count",
				"Success Rate",
			];
			exportData = data.data.map((item) => [
				item.payment_method || item.date,
				item.transaction_count,
				item.total_amount,
				item.refund_count,
				item.success_rate,
			]);
		} else if (type === "operational") {
			headers = ["Hour", "Order Count", "Revenue", "Average Order Value"];
			exportData = data.hourly_data.map((item) => [
				item.hour,
				item.order_count,
				item.revenue,
				item.avg_order_value,
			]);
		}

		// Add headers and rows
		csvContent += headers.join(",") + "\n";
		exportData.forEach((row) => {
			csvContent += row.join(",") + "\n";
		});

		// Create download link (Original)
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

	// Colors for charts (Original)
	const COLORS = [
		"#3b82f6",
		"#10b981",
		"#8b5cf6",
		"#f59e0b",
		"#ef4444",
		"#6366f1",
		"#ec4899",
		"#06b6d4",
		"#f97316",
	]; // Added more

	// Get Report Title Helper
	const getReportTitle = (reportType) => {
		switch (reportType) {
			case "sales":
			case "daily_sales":
			case "weekly_sales":
			case "monthly_sales":
				return "Sales Report";
			case "product":
			case "product_performance":
				return "Product Performance Report";
			case "payment":
			case "payment_analytics":
				return "Payment Analytics Report";
			case "operational":
			case "operational_insights":
				return "Operational Insights Report";
			default:
				return "Report";
		}
	};

	// Render different report types (Original logic, adapted for styling)
	const renderSalesReport = () => (
		<div className="space-y-6">
			{/* Summary Cards */}
			<section>
				<h3 className="text-base font-semibold text-slate-700 mb-3">Summary</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<SummaryCard
						title="Total Orders"
						value={data.summary.total_orders}
					/>
					<SummaryCard
						title="Total Revenue"
						value={formatCurrency(data.summary.total_revenue)}
					/>
					<SummaryCard
						title="Avg. Daily Orders"
						value={data.summary.avg_daily_orders.toFixed(1)}
					/>
					<SummaryCard
						title="Avg. Order Value"
						value={formatCurrency(data.summary.avg_order_value)}
					/>
				</div>
			</section>
			{/* Sales Trend Chart */}
			<section>
				<h3 className="text-base font-semibold text-slate-700 mb-3">
					Sales Trend
				</h3>
				<ChartContainer>
					<ResponsiveContainer
						width="100%"
						height={300}
					>
						<LineChart
							data={data.data}
							margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="#e2e8f0"
							/>
							<XAxis
								dataKey="date"
								tick={{ fontSize: 10 }}
								stroke="#64748b"
							/>
							<YAxis
								yAxisId="left"
								orientation="left"
								tick={{ fontSize: 10 }}
								stroke="#64748b"
								tickFormatter={(value) => formatCurrency(value)}
							/>
							<YAxis
								yAxisId="right"
								orientation="right"
								tick={{ fontSize: 10 }}
								stroke="#64748b"
							/>
							<Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
							<Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
							<Line
								yAxisId="left"
								type="monotone"
								dataKey="total"
								name="Total Sales"
								stroke="#3b82f6"
								strokeWidth={2}
								dot={{ r: 3 }}
								activeDot={{ r: 6 }}
							/>
							<Line
								yAxisId="right"
								type="monotone"
								dataKey="order_count"
								name="Orders"
								stroke="#10b981"
								strokeWidth={2}
								dot={{ r: 3 }}
								activeDot={{ r: 6 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</ChartContainer>
			</section>
			{/* Sales Breakdown Table */}
			<section>
				<h3 className="text-base font-semibold text-slate-700 mb-3">
					Sales Breakdown
				</h3>
				<TableContainer>
					<table className="min-w-full divide-y divide-slate-200">
						<thead className="bg-slate-50">
							<tr>
								<Th>Date</Th>
								<Th align="right">Orders</Th>
								<Th align="right">Subtotal</Th>
								<Th align="right">Tax</Th>
								<Th align="right">Total</Th>
								<Th align="right">Avg. Order</Th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-slate-100">
							{data.data.map((item, index) => (
								<tr
									key={index}
									className="hover:bg-slate-50"
								>
									<Td isHeader>{formatDate(item.date)}</Td>
									<Td align="right">{item.order_count}</Td>
									<Td align="right">{formatCurrency(item.subtotal)}</Td>
									<Td align="right">{formatCurrency(item.tax)}</Td>
									<Td
										isHeader
										align="right"
									>
										{formatCurrency(item.total)}
									</Td>
									<Td align="right">{formatCurrency(item.avg_order_value)}</Td>
								</tr>
							))}
						</tbody>
						<tfoot className="bg-slate-100 font-semibold">
							<tr>
								<Td
									isHeader
									colSpan={1}
								>
									Total
								</Td>
								<Td align="right">{data.summary.total_orders}</Td>
								<Td align="right">
									{formatCurrency(
										data.data.reduce((sum, item) => sum + item.subtotal, 0)
									)}
								</Td>
								<Td align="right">
									{formatCurrency(
										data.data.reduce((sum, item) => sum + item.tax, 0)
									)}
								</Td>
								<Td align="right">
									{formatCurrency(data.summary.total_revenue)}
								</Td>
								<Td align="right">
									{formatCurrency(data.summary.avg_order_value)}
								</Td>
							</tr>
						</tfoot>
					</table>
				</TableContainer>
			</section>
		</div>
	);

	const renderProductReport = () => (
		<div className="space-y-6">
			{/* Summary Cards */}
			<section>
				<h3 className="text-base font-semibold text-slate-700 mb-3">Summary</h3>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<SummaryCard
						title="Total Products Sold"
						value={data.summary.total_products_sold}
					/>
					<SummaryCard
						title="Total Revenue"
						value={formatCurrency(data.summary.total_revenue)}
					/>
					<SummaryCard
						title="Top Performing"
						value={data.summary.top_product}
						subValue={`Category: ${data.summary.top_category}`}
					/>
				</div>
			</section>
			{/* Charts */}
			<section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div>
					<h3 className="text-base font-semibold text-slate-700 mb-3">
						Top Products (by Revenue)
					</h3>
					<ChartContainer>
						<ResponsiveContainer
							width="100%"
							height={300}
						>
							<BarChart
								data={data.products.slice(0, 10)}
								layout="vertical"
								margin={{ top: 5, right: 5, left: 70, bottom: 5 }}
							>
								{" "}
								{/* Increased left margin */}
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="#e2e8f0"
								/>
								<XAxis
									type="number"
									tick={{ fontSize: 10 }}
									stroke="#64748b"
									tickFormatter={(value) => formatCurrency(value)}
								/>
								<YAxis
									dataKey="product_name"
									type="category"
									width={100}
									tick={{ fontSize: 10, width: 90 }}
									stroke="#64748b"
									interval={0}
								/>
								<Tooltip
									content={
										<CustomTooltip
											formatter={formatCurrency}
											nameMap={{
												revenue: "Revenue",
												quantity_sold: "Qty Sold",
											}}
										/>
									}
								/>
								<Legend
									wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
								/>
								<Bar
									dataKey="revenue"
									name="Revenue"
									fill="#3b82f6"
									barSize={15}
								/>
								{/* Optionally add Quantity bar if needed */}
								{/* <Bar dataKey="quantity_sold" name="Qty Sold" fill="#10b981" barSize={15}/> */}
							</BarChart>
						</ResponsiveContainer>
					</ChartContainer>
				</div>
				<div>
					<h3 className="text-base font-semibold text-slate-700 mb-3">
						Revenue by Category
					</h3>
					<ChartContainer>
						<ResponsiveContainer
							width="100%"
							height={300}
						>
							<PieChart>
								<Pie
									data={data.categories}
									cx="50%"
									cy="50%"
									labelLine={false}
									label={({ name, percent }) =>
										`${name} (${(percent * 100).toFixed(0)}%)`
									}
									outerRadius={85}
									fill="#8884d8"
									dataKey="revenue"
									nameKey="category"
									fontSize={10}
								>
									{data.categories.map((entry, index) => (
										<Cell
											key={`cell-${index}`}
											fill={COLORS[index % COLORS.length]}
										/>
									))}
								</Pie>
								<Tooltip
									content={<CustomTooltip formatter={formatCurrency} />}
								/>
								<Legend
									wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
								/>
							</PieChart>
						</ResponsiveContainer>
					</ChartContainer>
				</div>
			</section>
			{/* Product Details Table */}
			<section>
				<h3 className="text-base font-semibold text-slate-700 mb-3">
					Product Details
				</h3>
				<TableContainer>
					<table className="min-w-full divide-y divide-slate-200">
						<thead className="bg-slate-50">
							<tr>
								<Th>Product</Th>
								<Th>Category</Th>
								<Th align="right">Qty Sold</Th>
								<Th align="right">Avg. Price</Th>
								<Th align="right">Revenue</Th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-slate-100">
							{data.products.map((product) => (
								<tr
									key={product.product_id}
									className="hover:bg-slate-50"
								>
									<Td isHeader>{product.product_name}</Td>
									<Td>{product.category}</Td>
									<Td align="right">{product.quantity_sold}</Td>
									<Td align="right">{formatCurrency(product.avg_price)}</Td>
									<Td
										isHeader
										align="right"
									>
										{formatCurrency(product.revenue)}
									</Td>
								</tr>
							))}
						</tbody>
					</table>
				</TableContainer>
			</section>
		</div>
	);

	const renderPaymentReport = () => {
		const isPaymentMethodBased = data.data[0]?.payment_method;
		return (
			<div className="space-y-6">
				{/* Summary Cards */}
				<section>
					<h3 className="text-base font-semibold text-slate-700 mb-3">
						Summary
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						<SummaryCard
							title="Total Transactions"
							value={data.summary.total_transactions}
						/>
						<SummaryCard
							title="Total Amount"
							value={formatCurrency(data.summary.total_amount)}
						/>
						<SummaryCard
							title="Refunds"
							value={data.summary.total_refunds}
							subValue={`Rate: ${data.summary.refund_rate}%`}
						/>
						<SummaryCard
							title="Period"
							value={formatDate(data.summary.period_start)}
							subValue={`To: ${formatDate(data.summary.period_end)}`}
						/>
					</div>
				</section>
				{/* Charts */}
				<section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{isPaymentMethodBased ? (
						<>
							<div>
								<h3 className="text-base font-semibold text-slate-700 mb-3">
									Distribution by Amount
								</h3>
								<ChartContainer>
									<ResponsiveContainer
										width="100%"
										height={300}
									>
										<PieChart>
											<Pie
												data={data.data}
												cx="50%"
												cy="50%"
												labelLine={false}
												label={({ name, percent }) =>
													`${name} (${(percent * 100).toFixed(0)}%)`
												}
												outerRadius={85}
												fill="#8884d8"
												dataKey="total_amount"
												nameKey="payment_method"
												fontSize={10}
											>
												{data.data.map((entry, index) => (
													<Cell
														key={`cell-${index}`}
														fill={COLORS[index % COLORS.length]}
													/>
												))}
											</Pie>
											<Tooltip
												content={<CustomTooltip formatter={formatCurrency} />}
											/>
											<Legend
												wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
											/>
										</PieChart>
									</ResponsiveContainer>
								</ChartContainer>
							</div>
							<div>
								<h3 className="text-base font-semibold text-slate-700 mb-3">
									Transaction Counts
								</h3>
								<ChartContainer>
									<ResponsiveContainer
										width="100%"
										height={300}
									>
										<BarChart
											data={data.data}
											margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#e2e8f0"
											/>
											<XAxis
												dataKey="payment_method"
												tick={{ fontSize: 10 }}
												stroke="#64748b"
											/>
											<YAxis
												tick={{ fontSize: 10 }}
												stroke="#64748b"
											/>
											<Tooltip content={<CustomTooltip />} />
											<Legend
												wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
											/>
											<Bar
												dataKey="transaction_count"
												name="Transactions"
												fill="#3b82f6"
												barSize={20}
											/>
											<Bar
												dataKey="refund_count"
												name="Refunds"
												fill="#ef4444"
												barSize={20}
											/>
										</BarChart>
									</ResponsiveContainer>
								</ChartContainer>
							</div>
						</>
					) : (
						// Date-based chart
						<div className="lg:col-span-2">
							<h3 className="text-base font-semibold text-slate-700 mb-3">
								Payment Trend
							</h3>
							<ChartContainer>
								<ResponsiveContainer
									width="100%"
									height={300}
								>
									<LineChart
										data={data.data}
										margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
									>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="#e2e8f0"
										/>
										<XAxis
											dataKey="date"
											tick={{ fontSize: 10 }}
											stroke="#64748b"
										/>
										<YAxis
											yAxisId="left"
											orientation="left"
											tick={{ fontSize: 10 }}
											stroke="#64748b"
											tickFormatter={(value) => formatCurrency(value)}
										/>
										<YAxis
											yAxisId="right"
											orientation="right"
											tick={{ fontSize: 10 }}
											stroke="#64748b"
										/>
										<Tooltip
											content={
												<CustomTooltip
													formatter={formatCurrency}
													nameMap={{
														total_amount: "Total Amount",
														transaction_count: "Transactions",
													}}
												/>
											}
										/>
										<Legend
											wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
										/>
										<Line
											yAxisId="left"
											type="monotone"
											dataKey="total_amount"
											name="Total Amount"
											stroke="#3b82f6"
											strokeWidth={2}
											dot={{ r: 3 }}
											activeDot={{ r: 6 }}
										/>
										<Line
											yAxisId="right"
											type="monotone"
											dataKey="transaction_count"
											name="Transactions"
											stroke="#10b981"
											strokeWidth={2}
											dot={{ r: 3 }}
											activeDot={{ r: 6 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</ChartContainer>
						</div>
					)}
				</section>
				{/* Payment Details Table */}
				<section>
					<h3 className="text-base font-semibold text-slate-700 mb-3">
						Payment Details
					</h3>
					<TableContainer>
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50">
								<tr>
									<Th>{isPaymentMethodBased ? "Payment Method" : "Date"}</Th>
									<Th align="right">Transactions</Th>
									<Th align="right">Total Amount</Th>
									<Th align="right">Refunds</Th>
									<Th align="right">Success Rate</Th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-100">
								{data.data.map((item, index) => (
									<tr
										key={index}
										className="hover:bg-slate-50"
									>
										<Td isHeader>
											{isPaymentMethodBased
												? item.payment_method
												: formatDate(item.date)}
										</Td>
										<Td align="right">{item.transaction_count}</Td>
										<Td
											isHeader
											align="right"
										>
											{formatCurrency(item.total_amount)}
										</Td>
										<Td align="right">{item.refund_count}</Td>
										<Td align="right">{item.success_rate}%</Td>
									</tr>
								))}
							</tbody>
						</table>
					</TableContainer>
				</section>
			</div>
		);
	};

	const renderOperationalReport = () => (
		<div className="space-y-6">
			{/* Summary Cards */}
			<section>
				<h3 className="text-base font-semibold text-slate-700 mb-3">Summary</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<SummaryCard
						title="Total Orders"
						value={data.summary.total_orders}
					/>
					<SummaryCard
						title="Total Revenue"
						value={formatCurrency(data.summary.total_revenue)}
					/>
					<SummaryCard
						title="Avg. Daily Orders"
						value={data.summary.avg_orders_per_day.toFixed(1)}
					/>
					<SummaryCard
						title="Peak Hours"
						value={data.summary.peak_hours[0]}
						subValue={data.summary.peak_hours[1]}
					/>
				</div>
			</section>
			{/* Charts */}
			<section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div>
					<h3 className="text-base font-semibold text-slate-700 mb-3">
						Hourly Trend
					</h3>
					<ChartContainer>
						<ResponsiveContainer
							width="100%"
							height={300}
						>
							<BarChart
								data={data.hourly_data}
								margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="#e2e8f0"
								/>
								<XAxis
									dataKey="hour"
									tick={{ fontSize: 10 }}
									stroke="#64748b"
								/>
								<YAxis
									yAxisId="left"
									orientation="left"
									tick={{ fontSize: 10 }}
									stroke="#64748b"
								/>
								<YAxis
									yAxisId="right"
									orientation="right"
									tick={{ fontSize: 10 }}
									stroke="#64748b"
									tickFormatter={(value) => formatCurrency(value)}
								/>
								<Tooltip
									content={
										<CustomTooltip
											formatter={formatCurrency}
											nameMap={{ order_count: "Orders", revenue: "Revenue" }}
										/>
									}
								/>
								<Legend
									wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
								/>
								<Bar
									yAxisId="left"
									dataKey="order_count"
									name="Orders"
									fill="#3b82f6"
									barSize={15}
								/>
								<Bar
									yAxisId="right"
									dataKey="revenue"
									name="Revenue"
									fill="#10b981"
									barSize={15}
								/>
							</BarChart>
						</ResponsiveContainer>
					</ChartContainer>
				</div>
				<div>
					<h3 className="text-base font-semibold text-slate-700 mb-3">
						Day of Week Performance
					</h3>
					<ChartContainer>
						<ResponsiveContainer
							width="100%"
							height={300}
						>
							<BarChart
								data={data.day_of_week_summary}
								margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="#e2e8f0"
								/>
								<XAxis
									dataKey="day_of_week"
									tick={{ fontSize: 10 }}
									stroke="#64748b"
								/>
								<YAxis
									yAxisId="left"
									orientation="left"
									tick={{ fontSize: 10 }}
									stroke="#64748b"
								/>
								<YAxis
									yAxisId="right"
									orientation="right"
									tick={{ fontSize: 10 }}
									stroke="#64748b"
									tickFormatter={(value) => formatCurrency(value)}
								/>
								<Tooltip
									content={
										<CustomTooltip
											formatter={formatCurrency}
											nameMap={{
												avg_order_count: "Avg Orders",
												avg_revenue: "Avg Revenue",
											}}
										/>
									}
								/>
								<Legend
									wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
								/>
								<Bar
									yAxisId="left"
									dataKey="avg_order_count"
									name="Avg Orders"
									fill="#8b5cf6"
									barSize={15}
								/>
								<Bar
									yAxisId="right"
									dataKey="avg_revenue"
									name="Avg Revenue"
									fill="#f59e0b"
									barSize={15}
								/>
							</BarChart>
						</ResponsiveContainer>
					</ChartContainer>
				</div>
			</section>
			{/* Daily Performance Table */}
			<section>
				<h3 className="text-base font-semibold text-slate-700 mb-3">
					Daily Performance
				</h3>
				<TableContainer>
					<table className="min-w-full divide-y divide-slate-200">
						<thead className="bg-slate-50">
							<tr>
								<Th>Date</Th>
								<Th>Day</Th>
								<Th align="right">Orders</Th>
								<Th align="right">Revenue</Th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-slate-100">
							{data.daily_data.map((day, index) => (
								<tr
									key={index}
									className="hover:bg-slate-50"
								>
									<Td isHeader>{formatDate(day.date)}</Td>
									<Td>{day.day_of_week}</Td>
									<Td align="right">{day.order_count}</Td>
									<Td
										isHeader
										align="right"
									>
										{formatCurrency(day.revenue)}
									</Td>
								</tr>
							))}
						</tbody>
					</table>
				</TableContainer>
			</section>
		</div>
	);

	// Render the appropriate report based on type (Original logic)
	const renderReport = () => {
		console.log("Rendering report of type:", type); // Keep for debugging
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
				return <InvalidReportTypeDisplay type={type} />;
		}
	};

	// Validate report data structure (Original logic)
	const validateReportData = (reportData) => {
		if (!reportData || !reportData.summary) {
			console.error("Invalid report data: missing summary section", reportData);
			return false;
		}
		if (!reportData.summary.period_start || !reportData.summary.period_end) {
			console.warn(
				"Report data missing period information",
				reportData.summary
			);
		}
		// Add more specific checks per report type if needed
		return true;
	};

	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	// Helper components for styling consistency
	const SummaryCard = ({ title, value, subValue = null }) => (
		<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
			{" "}
			{/* Reduced padding */}
			<h3
				className="text-xs font-medium text-slate-500 mb-0.5 truncate"
				title={title}
			>
				{title}
			</h3>{" "}
			{/* Reduced size/margin */}
			<p
				className="text-lg font-bold text-slate-800 truncate"
				title={value}
			>
				{value}
			</p>{" "}
			{/* Reduced size */}
			{subValue && (
				<p
					className="text-[11px] text-slate-500 mt-0.5 truncate"
					title={subValue}
				>
					{subValue}
				</p>
			)}{" "}
			{/* Reduced size/margin */}
		</div>
	);
	SummaryCard.propTypes = {
		title: PropTypes.string,
		value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		subValue: PropTypes.string,
	};

	const ChartContainer = ({ children }) => (
		<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 h-[350px]">
			{" "}
			{/* Fixed height */}
			{children}
		</div>
	);
	ChartContainer.propTypes = { children: PropTypes.node };

	const TableContainer = ({ children }) => (
		<div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
			<div className="overflow-x-auto">{children}</div>
		</div>
	);
	TableContainer.propTypes = { children: PropTypes.node };

	const Th = ({ children, align = "left" }) => (
		<th
			scope="col"
			className={`px-4 py-2 text-${align} text-[11px] font-semibold text-slate-500 uppercase tracking-wider`}
		>
			{children}
		</th>
	);
	Th.propTypes = { children: PropTypes.node, align: PropTypes.string };

	const Td = ({ children, align = "left", isHeader = false }) => (
		<td
			className={`px-4 py-2 whitespace-nowrap text-xs text-${align} ${
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

	// Custom Tooltip for Charts
	const CustomTooltip = ({ active, payload, label, formatter, nameMap }) => {
		if (active && payload && payload.length) {
			return (
				<div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-md border border-slate-200 p-2 text-xs">
					<p className="font-medium text-slate-700 mb-1">{label}</p>
					{payload.map((entry, index) => (
						<p
							key={`item-${index}`}
							style={{ color: entry.color }}
						>
							{`${nameMap ? nameMap[entry.name] : entry.name}: ${
								formatter ? formatter(entry.value) : entry.value
							}`}
						</p>
					))}
				</div>
			);
		}
		return null;
	};
	CustomTooltip.propTypes = {
		active: PropTypes.bool,
		payload: PropTypes.array,
		label: PropTypes.string,
		formatter: PropTypes.func,
		nameMap: PropTypes.object,
	};

	const InvalidReportTypeDisplay = ({ type }) => (
		<div className="p-6 text-center">
			<ExclamationTriangleIcon className="h-10 w-10 text-red-500 mx-auto mb-3" />
			<h3 className="text-base font-medium text-slate-700 mb-1">
				Unknown Report Type
			</h3>
			<p className="text-sm text-slate-600 mb-3">
				Cannot display report with type: &quot;{type}&quot;.
			</p>
		</div>
	);
	InvalidReportTypeDisplay.propTypes = { type: PropTypes.string };

	return (
		<div className="p-4 sm:p-6 overflow-y-auto h-full custom-scrollbar">
			{" "}
			{/* Ensure parent scrolls */}
			{/* Header with Back and Export Buttons */}
			<div className="flex flex-wrap justify-between items-center mb-4 gap-3">
				<button
					onClick={onBack} // Original handler
					className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
				>
					<ArrowLeftIcon className="h-4 w-4 mr-1.5" />
					Back to Report Selection
				</button>
				<div className="flex space-x-2">
					<button
						onClick={exportAsPDF} // Original handler
						className="px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 border border-red-200 transition-colors flex items-center text-xs font-medium gap-1"
					>
						<DocumentArrowDownIcon className="h-3.5 w-3.5" /> Export PDF
					</button>
					<button
						onClick={exportAsCSV} // Original handler
						className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center text-xs font-medium gap-1"
					>
						<TableCellsIcon className="h-3.5 w-3.5" /> Export CSV
					</button>
				</div>
			</div>
			{/* Report Title Card */}
			{validateReportData(data) ? ( // Validate before showing title
				<>
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5 mb-5">
						<h1 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">
							{getReportTitle(type)}
						</h1>
						<p className="text-xs text-slate-500">
							Period: {formatDate(data.summary.period_start) || "Unknown"} to{" "}
							{formatDate(data.summary.period_end) || "Unknown"}
						</p>
					</div>

					{/* Render the specific report content */}
					<div ref={reportRef}>{renderReport()}</div>
				</>
			) : (
				// Invalid Data Structure Error
				<div className="p-6 text-center bg-white rounded-lg shadow-sm border border-red-200">
					<ExclamationTriangleIcon className="h-10 w-10 text-red-500 mx-auto mb-3" />
					<h3 className="text-base font-medium text-slate-700 mb-1">
						Invalid Report Data
					</h3>
					<p className="text-sm text-slate-600 mb-3">
						The report data structure is invalid or incomplete.
					</p>
					<button
						onClick={onBack}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
					>
						Back to Reports
					</button>
				</div>
			)}
		</div>
	);
	// --- END OF UPDATED UI ---
};

// --- ORIGINAL PROPTYPES (Adjusted based on usage) ---
ReportViewer.propTypes = {
	data: PropTypes.object, // Can be null initially or on error
	type: PropTypes.string, // Can be null initially
	onBack: PropTypes.func.isRequired,
};

export default ReportViewer;
