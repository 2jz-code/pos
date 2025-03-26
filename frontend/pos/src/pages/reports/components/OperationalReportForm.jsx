// src/components/reports/OperationalReportForm.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";
import PropTypes from "prop-types";

const OperationalReportForm = ({ onSubmit, isLoading }) => {
	const [formData, setFormData] = useState({
		start_date: new Date().toISOString().split("T")[0],
		end_date: new Date().toISOString().split("T")[0],
		save_report: false,
		report_name: "",
	});

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData({
			...formData,
			[name]: type === "checkbox" ? checked : value,
		});
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		onSubmit(formData);
	};

	let endDate;
	// Add quick date range selections
	const setDateRange = (range) => {
		const today = new Date();
		let startDate;

		switch (range) {
			case "last7days":
				startDate = new Date(today);
				startDate.setDate(today.getDate() - 7);
				break;
			case "last30days":
				startDate = new Date(today);
				startDate.setDate(today.getDate() - 30);
				break;
			case "thisMonth":
				startDate = new Date(today.getFullYear(), today.getMonth(), 1);
				break;
			case "lastMonth":
				startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
				endDate = new Date(today.getFullYear(), today.getMonth(), 0);
				setFormData({
					...formData,
					start_date: startDate.toISOString().split("T")[0],
					end_date: endDate.toISOString().split("T")[0],
				});
				return; // Early return since we set both dates
			case "thisYear":
				startDate = new Date(today.getFullYear(), 0, 1);
				break;
			default:
				startDate = today;
		}

		setFormData({
			...formData,
			start_date: startDate.toISOString().split("T")[0],
			end_date: today.toISOString().split("T")[0],
		});
	};

	return (
		<div className="p-6">
			<motion.div
				className="max-w-4xl mx-auto"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
			>
				<h2 className="text-xl font-semibold text-slate-800 mb-6">
					Generate Operational Insights
				</h2>

				<form
					onSubmit={handleSubmit}
					className="space-y-6"
				>
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
						<h3 className="text-lg font-medium text-slate-800 mb-2">
							Date Range
						</h3>

						<div className="flex flex-wrap gap-2 mb-4">
							<button
								type="button"
								onClick={() => setDateRange("last7days")}
								className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
							>
								Last 7 Days
							</button>
							<button
								type="button"
								onClick={() => setDateRange("last30days")}
								className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
							>
								Last 30 Days
							</button>
							<button
								type="button"
								onClick={() => setDateRange("thisMonth")}
								className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
							>
								This Month
							</button>
							<button
								type="button"
								onClick={() => setDateRange("lastMonth")}
								className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
							>
								Last Month
							</button>
							<button
								type="button"
								onClick={() => setDateRange("thisYear")}
								className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
							>
								This Year
							</button>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="start_date"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Start Date
								</label>
								<input
									type="date"
									id="start_date"
									name="start_date"
									value={formData.start_date}
									onChange={handleChange}
									className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="end_date"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									End Date
								</label>
								<input
									type="date"
									id="end_date"
									name="end_date"
									value={formData.end_date}
									onChange={handleChange}
									className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									required
								/>
							</div>
						</div>

						<div className="mt-2 text-sm text-slate-500">
							This report will analyze hourly trends, peak times, and
							day-of-week patterns for your business operations.
						</div>
					</div>

					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-medium text-slate-800">
								Save Report
							</h3>
							<div className="flex items-center">
								<input
									type="checkbox"
									id="save_report"
									name="save_report"
									checked={formData.save_report}
									onChange={handleChange}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
								/>
								<label
									htmlFor="save_report"
									className="ml-2 block text-sm text-slate-700"
								>
									Save this report for later
								</label>
							</div>
						</div>

						{formData.save_report && (
							<div>
								<label
									htmlFor="report_name"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Report Name
								</label>
								<input
									type="text"
									id="report_name"
									name="report_name"
									value={formData.report_name}
									onChange={handleChange}
									placeholder="Enter a name for this report"
									className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									required={formData.save_report}
								/>
							</div>
						)}
					</div>

					<div className="flex justify-end">
						<button
							type="submit"
							className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<LoadingSpinner
										size="sm"
										className="mr-2"
									/>{" "}
									Generating Report...
								</>
							) : (
								"Generate Report"
							)}
						</button>
					</div>
				</form>
			</motion.div>
		</div>
	);
};

OperationalReportForm.propTypes = {
	onSubmit: PropTypes.func.isRequired,
	isLoading: PropTypes.bool,
};

export default OperationalReportForm;
