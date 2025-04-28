import { motion } from "framer-motion"; // Original import
import LoadingSpinner from "./LoadingSpinner"; // Original import
import PropTypes from "prop-types";
// Icons for UI
import {
	DocumentChartBarIcon,
	ArchiveBoxIcon,
	CreditCardIcon,
	CogIcon,
	DocumentTextIcon, // Report types
	CalendarDaysIcon,
	EyeIcon,
	TrashIcon,
	ExclamationTriangleIcon,
	BookmarkSlashIcon, // Actions and status
} from "@heroicons/react/24/outline";

/**
 * SavedReportsList Component (Logic Preserved from User Provided Code)
 *
 * Displays a list of previously saved reports with actions to view or delete.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
const SavedReportsList = ({
	reports,
	isLoading,
	error,
	onReportClick,
	onDeleteReport,
}) => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	// Get Report Type Icon (Original)
	const getReportTypeIcon = (reportType) => {
		const iconClass = "h-5 w-5 flex-shrink-0"; // Consistent size
		switch (reportType) {
			case "daily_sales":
			case "weekly_sales":
			case "monthly_sales":
				return (
					<DocumentChartBarIcon className={`${iconClass} text-blue-500`} />
				);
			case "product_performance":
				return <ArchiveBoxIcon className={`${iconClass} text-purple-500`} />;
			case "payment_analytics":
				return <CreditCardIcon className={`${iconClass} text-green-500`} />;
			case "operational_insights":
				return <CogIcon className={`${iconClass} text-amber-500`} />;
			default:
				return <DocumentTextIcon className={`${iconClass} text-slate-500`} />;
		}
	};

	// Format Date (Original)
	const formatDate = (dateString) => {
		if (!dateString) return "N/A";
		try {
			return new Date(dateString).toLocaleString(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			});
			// eslint-disable-next-line no-unused-vars
		} catch (e) {
			return "Invalid Date";
		}
	};
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	// Loading State
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full p-6">
				<LoadingSpinner size="lg" />
				<p className="text-slate-500 ml-3">Loading saved reports...</p>
			</div>
		);
	}

	// Error State
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-6 text-center">
				<ExclamationTriangleIcon className="h-10 w-10 text-red-500 mb-3" />
				<h3 className="text-base font-medium text-slate-700 mb-1">
					Error Loading Reports
				</h3>
				<p className="text-sm text-slate-500">{error}</p>
				{/* Optionally add a retry button here */}
			</div>
		);
	}

	// No Reports State
	if (!reports || reports.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-6 text-center">
				<BookmarkSlashIcon className="h-12 w-12 text-slate-300 mb-4" />
				<h3 className="text-lg font-medium text-slate-700 mb-2">
					No Saved Reports
				</h3>
				<p className="text-sm text-slate-500">
					Generate a report and check &quot;Save this report&quot; to save it
					here.
				</p>
			</div>
		);
	}

	// Base button style
	const actionButtonClass =
		"p-1.5 rounded text-xs hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

	return (
		<div className="p-4 sm:p-6 h-full overflow-y-auto custom-scrollbar">
			<h2 className="text-lg font-semibold text-slate-800 mb-4">
				Saved Reports
			</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{reports.map((report, index) => (
					<motion.div
						key={report.id}
						className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-150"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: index * 0.05 }} // Stagger animation
					>
						{/* Main Content */}
						<div className="p-4 flex-grow">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									{getReportTypeIcon(report.report_type)}
									<span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
										{report.report_type_display ||
											report.report_type.replace(/_/g, " ")}{" "}
										{/* Use display name */}
									</span>
								</div>
								{/* Delete Button */}
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDeleteReport(report.id);
									}} // Original handler
									className={`${actionButtonClass} text-slate-400 hover:text-red-600 hover:bg-red-50`}
									title="Delete report"
								>
									<TrashIcon className="h-4 w-4" />
								</button>
							</div>

							<h3
								className="font-semibold text-slate-800 mb-1 truncate text-sm"
								title={report.name}
							>
								{report.name}
							</h3>

							<div className="flex items-center text-xs text-slate-500 mb-2">
								<CalendarDaysIcon className="h-3.5 w-3.5 mr-1 text-slate-400" />
								<span>Created: {formatDate(report.date_created)}</span>
							</div>

							{/* Date Range */}
							{report.date_range_start && report.date_range_end && (
								<div className="text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
									<span>Range: {formatDate(report.date_range_start)}</span> -{" "}
									<span>{formatDate(report.date_range_end)}</span>
								</div>
							)}
						</div>

						{/* View Button Footer */}
						<div className="bg-slate-50 p-2 border-t border-slate-100">
							<button
								onClick={() => onReportClick(report.id)} // Original handler
								className="w-full text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1 py-1"
							>
								<EyeIcon className="h-3.5 w-3.5" />
								View Report
							</button>
						</div>
					</motion.div>
				))}
			</div>
		</div>
	);
	// --- END OF UPDATED UI ---
};

// --- ORIGINAL PROPTYPES (UNCHANGED) ---
SavedReportsList.propTypes = {
	reports: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			name: PropTypes.string,
			report_type: PropTypes.string,
			report_type_display: PropTypes.string, // Added based on potential usage
			date_created: PropTypes.string,
			date_range_start: PropTypes.string,
			date_range_end: PropTypes.string,
		})
	),
	isLoading: PropTypes.bool,
	error: PropTypes.string,
	onReportClick: PropTypes.func.isRequired,
	onDeleteReport: PropTypes.func.isRequired,
};

export default SavedReportsList;
