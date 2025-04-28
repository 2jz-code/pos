import { useState, useEffect, useCallback } from "react"; // Added React import
import { useNavigate } from "react-router-dom";
// Original component/service imports
import { reportService } from "../../api/services/reportService";
import ReportDashboard from "./components/ReportDashboard";
import SalesReportForm from "./components/SalesReportForm";
import ProductReportForm from "./components/ProductReportForm";
import PaymentReportForm from "./components/PaymentReportForm";
import OperationalReportForm from "./components/OperationalReportForm";
import SavedReportsList from "./components/SavedReportsList";
import ReportViewer from "./components/ReportViewer";
// Icons for UI
import {
	ChartBarIcon,
	Bars3Icon,
	DocumentChartBarIcon, // Sales
	ArchiveBoxIcon, // Products
	CreditCardIcon, // Payments
	CogIcon, // Operational
	BookmarkSquareIcon, // Saved
	ExclamationTriangleIcon,
	ArrowPathIcon,
	HomeIcon, // Dashboard Icon
} from "@heroicons/react/24/outline"; // Added relevant icons
import { toast } from "react-toastify";

/**
 * Reports Component (Logic Preserved from User Provided Code)
 *
 * Main container for viewing reports and analytics. Handles tab navigation and data fetching.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
const Reports = () => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState("dashboard");
	const [dashboardData, setDashboardData] = useState(null);
	const [isLoading, setIsLoading] = useState(true); // Start loading initially for dashboard
	const [error, setError] = useState(null);
	const [reportData, setReportData] = useState(null); // Holds generated/loaded report data
	const [reportType, setReportType] = useState(null); // Type of the currently viewed report
	const [savedReports, setSavedReports] = useState([]);

	// Fetch dashboard data (Original, wrapped in useCallback)
	const fetchDashboardData = useCallback(async () => {
		setIsLoading(true);
		setError(null); // Clear previous errors
		try {
			const data = await reportService.getDashboardSummary();
			setDashboardData(data);
		} catch (err) {
			console.error("Error fetching dashboard data:", err);
			setError("Failed to load dashboard data. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Fetch saved reports (Original, wrapped in useCallback)
	const fetchSavedReports = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await reportService.getSavedReports();
			setSavedReports(data);
		} catch (err) {
			console.error("Error fetching saved reports:", err);
			setError("Failed to load saved reports. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Fetch data based on active tab (Original logic)
	useEffect(() => {
		// Clear report viewer when changing main tabs
		setReportData(null);
		setReportType(null);
		setError(null); // Clear errors on tab change

		if (activeTab === "dashboard") {
			fetchDashboardData();
		} else if (activeTab === "saved") {
			fetchSavedReports();
		} else {
			// For other tabs (report forms), set loading to false as data is generated on submit
			setIsLoading(false);
		}
	}, [activeTab, fetchDashboardData, fetchSavedReports]);

	// Handle report form submissions (Original handlers)
	const handleSalesReportSubmit = async (formData) => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await reportService.generateSalesReport(formData);
			setReportData(data);
			setReportType("sales");
		} catch (err) {
			console.error("Error generating sales report:", err);
			setError("Failed to generate sales report. Please try again.");
			setReportData(null); // Clear previous data on error
		} finally {
			setIsLoading(false);
		}
	};

	const handleProductReportSubmit = async (formData) => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await reportService.generateProductReport(formData);
			setReportData(data);
			setReportType("product");
		} catch (err) {
			console.error("Error generating product report:", err);
			setError("Failed to generate product report. Please try again.");
			setReportData(null);
		} finally {
			setIsLoading(false);
		}
	};

	const handlePaymentReportSubmit = async (formData) => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await reportService.generatePaymentReport(formData);
			setReportData(data);
			setReportType("payment");
		} catch (err) {
			console.error("Error generating payment report:", err);
			setError("Failed to generate payment report. Please try again.");
			setReportData(null);
		} finally {
			setIsLoading(false);
		}
	};

	const handleOperationalReportSubmit = async (formData) => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await reportService.generateOperationalInsights(formData);
			setReportData(data);
			setReportType("operational");
		} catch (err) {
			console.error("Error generating operational report:", err);
			setError("Failed to generate operational report. Please try again.");
			setReportData(null);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle loading a saved report (Original handler)
	const handleSavedReportClick = async (reportId) => {
		setIsLoading(true);
		setError(null);
		try {
			console.log("Loading saved report with ID:", reportId);
			const data = await reportService.getSavedReport(reportId);
			console.log("Received saved report data:", data);

			// Ensure result_data exists before setting
			if (!data.result_data) {
				throw new Error("Saved report data is missing or invalid.");
			}
			setReportData(data.result_data);

			const reportTypeMapping = {
				daily_sales: "sales",
				weekly_sales: "sales",
				monthly_sales: "sales",
				product_performance: "product",
				payment_analytics: "payment",
				operational_insights: "operational",
			};
			const mappedType =
				reportTypeMapping[data.report_type] || data.report_type;
			console.log(`Mapping report type: ${data.report_type} → ${mappedType}`);
			setReportType(mappedType);
		} catch (err) {
			console.error("Error loading saved report:", err);
			setError(
				"Failed to load saved report. Please check the data or try again."
			);
			setReportData(null); // Clear viewer on error
			setReportType(null);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle deleting a saved report (Original handler)
	const handleDeleteSavedReport = async (reportId) => {
		if (!window.confirm("Are you sure you want to delete this saved report?"))
			return;

		try {
			await reportService.deleteSavedReport(reportId);
			toast.success("Report deleted successfully.");
			// Refetch or filter locally
			setSavedReports((prev) =>
				prev.filter((report) => report.id !== reportId)
			);
		} catch (err) {
			console.error("Error deleting saved report:", err);
			setError("Failed to delete saved report. Please try again.");
			toast.error("Failed to delete report.");
		}
	};

	// Clear report viewer (Original handler)
	const clearReportData = () => {
		setReportData(null);
		setReportType(null);
		setError(null); // Also clear errors when going back
		// Stay on the current form tab or go to dashboard if coming from saved reports
		const formTabs = ["sales", "products", "payments", "operational"];
		if (!formTabs.includes(activeTab)) {
			setActiveTab("dashboard");
		}
	};

	// Render content based on state (Original logic)
	const renderContent = () => {
		if (reportData) {
			return (
				<ReportViewer
					data={reportData}
					type={reportType}
					onBack={clearReportData}
				/>
			);
		}
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
				return (
					<div className="p-6 text-center text-slate-500">
						Select a report type from the tabs above.
					</div>
				);
		}
	};

	// Define Tabs for cleaner rendering
	const tabs = [
		{ id: "dashboard", label: "Dashboard", icon: HomeIcon },
		{ id: "sales", label: "Sales", icon: DocumentChartBarIcon },
		{ id: "products", label: "Products", icon: ArchiveBoxIcon },
		{ id: "payments", label: "Payments", icon: CreditCardIcon },
		{ id: "operational", label: "Operational", icon: CogIcon },
		{ id: "saved", label: "Saved Reports", icon: BookmarkSquareIcon },
	];
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	return (
		<div className="w-screen h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6 overflow-hidden">
			{/* Header Section - Styled */}
			<header className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-slate-200 gap-3 flex-shrink-0">
				<h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
					<ChartBarIcon className="h-6 w-6 text-slate-600" /> Reports &
					Analytics
				</h1>
				<button
					className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
					onClick={() => navigate("/dashboard")} // Original handler
				>
					<Bars3Icon className="h-4 w-4" />
					<span className="hidden sm:inline">Dashboard</span>
				</button>
			</header>

			{/* Tabs - Styled */}
			<div className="flex items-center flex-wrap gap-1 mb-4 bg-white p-1.5 rounded-lg shadow-sm border border-slate-200 overflow-x-auto custom-scrollbar flex-shrink-0">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
							activeTab === tab.id
								? "bg-blue-600 text-white shadow-sm"
								: "bg-white text-slate-600 hover:bg-slate-100"
						}`}
						onClick={() => setActiveTab(tab.id)} // Original handler
					>
						<tab.icon className="h-4 w-4" />
						{tab.label}
					</button>
				))}
			</div>

			{/* Main Content Area - Handles overflow */}
			<main className="flex-1 overflow-hidden bg-white rounded-lg shadow-sm border border-slate-200 min-h-0">
				{/* Error Display within content area */}
				{error &&
					!isLoading &&
					!reportData && ( // Show only if not loading and not viewing a specific report
						<div className="p-4 bg-red-50 text-red-700 border-b border-red-200 flex items-center gap-2 text-sm">
							<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
							<span>{error}</span>
							{/* Optionally add a retry button specific to the error context */}
							{(activeTab === "dashboard" || activeTab === "saved") && (
								<button
									onClick={
										activeTab === "dashboard"
											? fetchDashboardData
											: fetchSavedReports
									}
									className="ml-auto text-xs font-medium text-red-800 hover:underline"
								>
									<ArrowPathIcon className="h-3 w-3 inline mr-1" /> Retry
								</button>
							)}
						</div>
					)}
				{/* Render content - takes full height and handles own scrolling */}
				<div className="h-full overflow-y-auto custom-scrollbar">
					{renderContent()}
				</div>
			</main>
		</div>
	);
	// --- END OF UPDATED UI ---
};

export default Reports;
