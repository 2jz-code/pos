import { useState } from "react"; // Added React import
import { motion } from "framer-motion"; // Original import
import PropTypes from "prop-types";
// Icons for UI
import {
	CreditCardIcon,
	DocumentArrowDownIcon,
	BookmarkIcon,
	ArrowPathIcon,
} from "@heroicons/react/24/outline";

/**
 * PaymentReportForm Component (Logic Preserved from User Provided Code)
 *
 * Form for generating payment analytics reports.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
const PaymentReportForm = ({ onSubmit, isLoading }) => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const [formData, setFormData] = useState({
		start_date: new Date().toISOString().split("T")[0],
		end_date: new Date().toISOString().split("T")[0],
		group_by: "payment_method", // Default grouping
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
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	// Input field base class
	const inputBaseClass =
		"block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm disabled:bg-slate-100";
	const inputNormalClass = `${inputBaseClass} border-slate-300 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400`;
	const selectClass = `${inputNormalClass} appearance-none bg-white bg-no-repeat bg-right-3]`;
	const labelClass = "block text-xs font-medium text-slate-600 mb-1";
	const baseButtonClass =
		"inline-flex justify-center items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
	const primaryButtonClass = `${baseButtonClass} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;

	return (
		<div className="p-4 sm:p-6 h-full overflow-y-auto custom-scrollbar">
			<motion.div
				className="max-w-2xl mx-auto" // Reduced max-width
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
			>
				<h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
					<CreditCardIcon className="h-5 w-5 text-slate-500" /> Generate Payment
					Analytics Report
				</h2>

				<form
					onSubmit={handleSubmit}
					className="space-y-5"
				>
					{/* Report Parameters Card */}
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-4">
						<h3 className="text-base font-medium text-slate-700 mb-2">
							Report Parameters
						</h3>
						{/* Date Inputs */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="pay_start_date"
									className={labelClass}
								>
									Start Date
								</label>
								<input
									type="date"
									id="pay_start_date"
									name="start_date"
									value={formData.start_date}
									onChange={handleChange}
									className={inputNormalClass}
									required
								/>
							</div>
							<div>
								<label
									htmlFor="pay_end_date"
									className={labelClass}
								>
									End Date
								</label>
								<input
									type="date"
									id="pay_end_date"
									name="end_date"
									value={formData.end_date}
									onChange={handleChange}
									className={inputNormalClass}
									required
								/>
							</div>
						</div>
						{/* Group By Select */}
						<div>
							<label
								htmlFor="pay_group_by"
								className={labelClass}
							>
								Group By
							</label>
							<select
								id="pay_group_by"
								name="group_by"
								value={formData.group_by}
								onChange={handleChange}
								className={selectClass}
							>
								<option value="payment_method">Payment Method</option>
								<option value="day">Daily</option>
								<option value="week">Weekly</option>
								<option value="month">Monthly</option>
							</select>
						</div>
					</div>

					{/* Save Report Card */}
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="text-base font-medium text-slate-700">
								Save Report
							</h3>
							<input
								type="checkbox"
								id="pay_save_report"
								name="save_report"
								checked={formData.save_report}
								onChange={handleChange}
								className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
							/>
						</div>
						{formData.save_report && (
							<div>
								<label
									htmlFor="pay_report_name"
									className={labelClass}
								>
									Report Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="pay_report_name"
									name="report_name"
									value={formData.report_name}
									onChange={handleChange}
									placeholder="e.g., Monthly Payment Breakdown"
									className={inputNormalClass}
									required={formData.save_report}
								/>
							</div>
						)}
						<label
							htmlFor="pay_save_report"
							className="flex items-start gap-2 text-xs text-slate-500 cursor-pointer"
						>
							<span className="mt-0.5">
								<BookmarkIcon className="h-3 w-3 inline relative -top-0.5" />{" "}
								Save this report configuration for quick access later.
							</span>
						</label>
					</div>

					{/* Submit Button */}
					<div className="flex justify-end pt-2">
						<button
							type="submit"
							className={primaryButtonClass}
							disabled={isLoading}
						>
							{isLoading ? (
								<ArrowPathIcon className="h-4 w-4 animate-spin" />
							) : (
								<DocumentArrowDownIcon className="h-5 w-5" />
							)}
							{isLoading ? "Generating..." : "Generate Report"}
						</button>
					</div>
				</form>
			</motion.div>
		</div>
	);
	// --- END OF UPDATED UI ---
};

// --- ORIGINAL PROPTYPES (UNCHANGED) ---
PaymentReportForm.propTypes = {
	onSubmit: PropTypes.func.isRequired,
	isLoading: PropTypes.bool,
};

export default PaymentReportForm;
