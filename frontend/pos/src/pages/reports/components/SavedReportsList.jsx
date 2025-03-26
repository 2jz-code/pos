// src/components/reports/SavedReportsList.jsx
import { motion } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";
import PropTypes from "prop-types";

const SavedReportsList = ({
	reports,
	isLoading,
	error,
	onReportClick,
	onDeleteReport,
}) => {
	const getReportTypeIcon = (reportType) => {
		switch (reportType) {
			case "daily_sales":
			case "weekly_sales":
			case "monthly_sales":
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 text-blue-500"
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
				);
			case "product_performance":
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 text-purple-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
						/>
					</svg>
				);
			case "payment_analytics":
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 text-green-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
						/>
					</svg>
				);
			case "operational_insights":
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 text-amber-500"
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
				);
			default:
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 text-slate-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				);
		}
	};

	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full p-6">
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
					Error Loading Reports
				</h3>
				<p className="text-slate-600">{error}</p>
			</div>
		);
	}

	if (!reports || reports.length === 0) {
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
						d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<h3 className="text-lg font-medium text-slate-800 mb-2">
					No Saved Reports
				</h3>
				<p className="text-slate-600">
					You haven&apos;t saved any reports yet. Generate a report and check
					&quot;Save this report&quot; to save it for later.
				</p>
			</div>
		);
	}

	return (
		<div className="p-6">
			<h2 className="text-xl font-semibold text-slate-800 mb-6">
				Saved Reports
			</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{reports.map((report) => (
					<motion.div
						key={report.id}
						className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						whileHover={{ y: -2 }}
					>
						<div
							className="p-4 cursor-pointer"
							onClick={() => onReportClick(report.id)}
						>
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center">
									{getReportTypeIcon(report.report_type)}
									<span className="ml-2 text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
										{report.report_type_display}
									</span>
								</div>
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDeleteReport(report.id);
									}}
									className="text-slate-400 hover:text-red-500"
									title="Delete report"
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
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</div>

							<h3 className="font-medium text-slate-800 mb-1 truncate">
								{report.name}
							</h3>

							<div className="flex items-center text-xs text-slate-500 mb-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-3.5 w-3.5 mr-1"
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
								<span>Created: {formatDate(report.date_created)}</span>
							</div>

							{report.date_range_start && report.date_range_end && (
								<div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
									<div>
										From:{" "}
										{new Date(report.date_range_start).toLocaleDateString()}
									</div>
									<div>
										To: {new Date(report.date_range_end).toLocaleDateString()}
									</div>
								</div>
							)}
						</div>

						<div className="bg-slate-50 p-3 border-t border-slate-200">
							<button
								onClick={() => onReportClick(report.id)}
								className="w-full text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center"
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
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
								View Report
							</button>
						</div>
					</motion.div>
				))}
			</div>
		</div>
	);
};

SavedReportsList.propTypes = {
	reports: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			name: PropTypes.string,
			report_type: PropTypes.string,
			report_type_display: PropTypes.string,
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
