// src/pages/Reports.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reportService } from "../../api/services/reportService";
import ReportDashboard from "./components/ReportDashboard";
import SalesReportForm from "./components/SalesReportForm";
import ProductReportForm from "./components/ProductReportForm";
import PaymentReportForm from "./components/PaymentReportForm";
import OperationalReportForm from "./components/OperationalReportForm";
import SavedReportsList from "./components/SavedReportsList";
import ReportViewer from "./components/ReportViewer";

const Reports = () => {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState("dashboard");
	const [dashboardData, setDashboardData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [reportData, setReportData] = useState(null);
	const [reportType, setReportType] = useState(null);
	const [savedReports, setSavedReports] = useState([]);

	// Fetch dashboard summary on initial load
	useEffect(() => {
		const fetchDashboardData = async () => {
			setIsLoading(true);
			try {
				const data = await reportService.getDashboardSummary();
				setDashboardData(data);
				setError(null);
			} catch (err) {
				console.error("Error fetching dashboard data:", err);
				setError("Failed to load dashboard data. Please try again.");
			} finally {
				setIsLoading(false);
			}
		};

		if (activeTab === "dashboard") {
			fetchDashboardData();
		}
	}, [activeTab]);

	// Fetch saved reports when the saved tab is selected
	useEffect(() => {
		const fetchSavedReports = async () => {
			setIsLoading(true);
			try {
				const data = await reportService.getSavedReports();
				setSavedReports(data);
				setError(null);
			} catch (err) {
				console.error("Error fetching saved reports:", err);
				setError("Failed to load saved reports. Please try again.");
			} finally {
				setIsLoading(false);
			}
		};

		if (activeTab === "saved") {
			fetchSavedReports();
		}
	}, [activeTab]);

	// Handle report form submissions
	const handleSalesReportSubmit = async (formData) => {
		setIsLoading(true);
		try {
			const data = await reportService.generateSalesReport(formData);
			setReportData(data);
			setReportType("sales");
			setError(null);
		} catch (err) {
			console.error("Error generating sales report:", err);
			setError("Failed to generate sales report. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleProductReportSubmit = async (formData) => {
		setIsLoading(true);
		try {
			const data = await reportService.generateProductReport(formData);
			setReportData(data);
			setReportType("product");
			setError(null);
		} catch (err) {
			console.error("Error generating product report:", err);
			setError("Failed to generate product report. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handlePaymentReportSubmit = async (formData) => {
		setIsLoading(true);
		try {
			const data = await reportService.generatePaymentReport(formData);
			setReportData(data);
			setReportType("payment");
			setError(null);
		} catch (err) {
			console.error("Error generating payment report:", err);
			setError("Failed to generate payment report. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleOperationalReportSubmit = async (formData) => {
		setIsLoading(true);
		try {
			const data = await reportService.generateOperationalInsights(formData);
			setReportData(data);
			setReportType("operational");
			setError(null);
		} catch (err) {
			console.error("Error generating operational report:", err);
			setError("Failed to generate operational report. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSavedReportClick = async (reportId) => {
		setIsLoading(true);
		try {
			console.log("Loading saved report with ID:", reportId);
			const data = await reportService.getSavedReport(reportId);
			console.log("Received saved report data:", data);

			setReportData(data.result_data);

			// Map backend report types to frontend report types
			const reportTypeMapping = {
				daily_sales: "sales",
				weekly_sales: "sales",
				monthly_sales: "sales",
				product_performance: "product",
				payment_analytics: "payment",
				operational_insights: "operational",
			};

			// Use the mapping or default to the original type
			const mappedType =
				reportTypeMapping[data.report_type] || data.report_type;
			console.log(`Mapping report type: ${data.report_type} → ${mappedType}`);

			setReportType(mappedType);
			setError(null);
		} catch (err) {
			console.error("Error loading saved report:", err);
			setError("Failed to load saved report. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteSavedReport = async (reportId) => {
		if (!confirm("Are you sure you want to delete this report?")) return;

		setIsLoading(true);
		try {
			await reportService.deleteSavedReport(reportId);
			setSavedReports(savedReports.filter((report) => report.id !== reportId));
			setError(null);
		} catch (err) {
			console.error("Error deleting saved report:", err);
			setError("Failed to delete saved report. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const clearReportData = () => {
		setReportData(null);
		setReportType(null);
	};

	// Render the appropriate content based on the active tab
	const renderContent = () => {
		// If we have report data to display, show the report viewer
		if (reportData) {
			return (
				<ReportViewer
					data={reportData}
					type={reportType}
					onBack={clearReportData}
				/>
			);
		}

		// Otherwise, show the appropriate tab content
		switch (activeTab) {
			case "dashboard":
				return (
					<ReportDashboard
						data={dashboardData}
						isLoading={isLoading}
						error={error}
					/>
				);
			case "sales":
				return (
					<SalesReportForm
						onSubmit={handleSalesReportSubmit}
						isLoading={isLoading}
					/>
				);
			case "products":
				return (
					<ProductReportForm
						onSubmit={handleProductReportSubmit}
						isLoading={isLoading}
					/>
				);
			case "payments":
				return (
					<PaymentReportForm
						onSubmit={handlePaymentReportSubmit}
						isLoading={isLoading}
					/>
				);
			case "operational":
				return (
					<OperationalReportForm
						onSubmit={handleOperationalReportSubmit}
						isLoading={isLoading}
					/>
				);
			case "saved":
				return (
					<SavedReportsList
						reports={savedReports}
						isLoading={isLoading}
						error={error}
						onReportClick={handleSavedReportClick}
						onDeleteReport={handleDeleteSavedReport}
					/>
				);
			default:
				return <div>Select a report type from the tabs above</div>;
		}
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-slate-800">
					Reports & Analytics
				</h1>
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

			{/* Tabs */}
			<div className="bg-white p-2 rounded-xl shadow-sm mb-6">
				<div className="flex flex-wrap gap-2">
					<button
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === "dashboard"
								? "bg-blue-600 text-white"
								: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
						}`}
						onClick={() => setActiveTab("dashboard")}
					>
						Dashboard
					</button>
					<button
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === "sales"
								? "bg-blue-600 text-white"
								: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
						}`}
						onClick={() => setActiveTab("sales")}
					>
						Sales Reports
					</button>
					<button
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === "products"
								? "bg-blue-600 text-white"
								: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
						}`}
						onClick={() => setActiveTab("products")}
					>
						Product Reports
					</button>
					<button
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === "payments"
								? "bg-blue-600 text-white"
								: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
						}`}
						onClick={() => setActiveTab("payments")}
					>
						Payment Analytics
					</button>
					<button
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === "operational"
								? "bg-blue-600 text-white"
								: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
						}`}
						onClick={() => setActiveTab("operational")}
					>
						Operational Insights
					</button>
					<button
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === "saved"
								? "bg-blue-600 text-white"
								: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
						}`}
						onClick={() => setActiveTab("saved")}
					>
						Saved Reports
					</button>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm">
				{error && !isLoading && (
					<div className="p-4 bg-red-50 text-red-600 border-b border-red-100">
						<div className="flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 mr-2"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
							{error}
						</div>
					</div>
				)}
				{renderContent()}
			</div>
		</div>
	);
};

export default Reports;
