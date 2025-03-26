// src/components/reports/SalesReportForm.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";
import PropTypes from "prop-types";

const SalesReportForm = ({ onSubmit, isLoading }) => {
	const [formData, setFormData] = useState({
		start_date: new Date().toISOString().split("T")[0],
		end_date: new Date().toISOString().split("T")[0],
		group_by: "day",
		include_tax: true,
		include_refunds: true,
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

	return (
		<div className="p-6">
			<motion.div
				className="max-w-4xl mx-auto"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
			>
				<h2 className="text-xl font-semibold text-slate-800 mb-6">
					Generate Sales Report
				</h2>

				<form
					onSubmit={handleSubmit}
					className="space-y-6"
				>
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
						<h3 className="text-lg font-medium text-slate-800 mb-2">
							Date Range
						</h3>

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

						<div>
							<label
								htmlFor="group_by"
								className="block text-sm font-medium text-slate-700 mb-1"
							>
								Group By
							</label>
							<select
								id="group_by"
								name="group_by"
								value={formData.group_by}
								onChange={handleChange}
								className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="day">Daily</option>
								<option value="week">Weekly</option>
								<option value="month">Monthly</option>
							</select>
						</div>

						<div className="flex items-center space-x-6">
							<div className="flex items-center">
								<input
									type="checkbox"
									id="include_tax"
									name="include_tax"
									checked={formData.include_tax}
									onChange={handleChange}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
								/>
								<label
									htmlFor="include_tax"
									className="ml-2 block text-sm text-slate-700"
								>
									Include Tax
								</label>
							</div>
							<div className="flex items-center">
								<input
									type="checkbox"
									id="include_refunds"
									name="include_refunds"
									checked={formData.include_refunds}
									onChange={handleChange}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
								/>
								<label
									htmlFor="include_refunds"
									className="ml-2 block text-sm text-slate-700"
								>
									Include Refunds
								</label>
							</div>
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

SalesReportForm.propTypes = {
	onSubmit: PropTypes.func.isRequired,
	isLoading: PropTypes.bool,
};

export default SalesReportForm;
