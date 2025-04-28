import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { paymentService } from "../../api/services/paymentService";
import { authService } from "../../api/services/authService";
import RefundSuccessModal from "./RefundSuccessModal";
import LoadingSpinner from "../reports/components/LoadingSpinner";
// Icons for UI
import {
	CreditCardIcon,
	BanknotesIcon,
	TicketIcon,
	EyeIcon,
	Bars3Icon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
	InformationCircleIcon,
	SquaresPlusIcon, // For Split
} from "@heroicons/react/24/outline";

/**
 * Payments Component
 * Displays a list of payments, filterable by status and method.
 * Status filtering is done backend, Method filtering is done frontend.
 */
export default function Payments() {
	// --- State Variables ---
	const [allPaymentsForStatus, setAllPaymentsForStatus] = useState([]); // Store payments fetched based on status ONLY
	const [filteredPayments, setFilteredPayments] = useState([]); // Payments displayed after frontend method filtering
	const [activeTab, setActiveTab] = useState("all"); // Status filter
	const [paymentMethodFilter, setPaymentMethodFilter] = useState("all"); // Method filter ('all', 'cash', 'credit', 'split')
	const [isAdmin, setIsAdmin] = useState(false);
	const [userName, setUserName] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();
	const [refundSuccessData, setRefundSuccessData] = useState(null);

	// --- Data Fetching ---
	// Fetch payments based ONLY on the status filter
	const fetchPaymentsByStatus = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		setAllPaymentsForStatus([]); // Clear previous results
		setFilteredPayments([]); // Clear displayed results
		try {
			// --- FILTER LOGIC (Backend - Status Only) ---
			const filters = {};
			if (activeTab !== "all") {
				filters.status = activeTab;
			}
			// --- No Method filtering applied here ---

			const [paymentsData, authResponse] = await Promise.all([
				paymentService.getPayments(filters), // Only pass status filter
				authService.checkStatus(),
			]);

			const fetchedPayments = Array.isArray(paymentsData) ? paymentsData : [];
			setAllPaymentsForStatus(fetchedPayments); // Store all fetched payments for this status
			setIsAdmin(authResponse.is_admin);
			setUserName(authResponse.username);
			// Apply initial frontend method filtering (will be re-applied if method filter changes)
			applyFrontendMethodFilter(fetchedPayments, paymentMethodFilter);
		} catch (err) {
			console.error("Error fetching payments:", err);
			setError(
				err.response?.data?.detail ||
					"Failed to load payments. Please try again."
			);
			setAllPaymentsForStatus([]);
			setFilteredPayments([]);
		} finally {
			setIsLoading(false);
		}
	}, [activeTab]); // Dependency: refetch only when status tab changes

	// --- Frontend Filtering ---
	// Function to apply the method filter to the fetched payments
	const applyFrontendMethodFilter = (paymentsToFilter, methodFilter) => {
		let newlyFiltered = [];
		if (methodFilter === "all") {
			newlyFiltered = paymentsToFilter; // Show all fetched payments
		} else if (methodFilter === "split") {
			newlyFiltered = paymentsToFilter.filter((p) => p.is_split_payment);
		} else if (methodFilter === "cash") {
			newlyFiltered = paymentsToFilter.filter(
				(p) => !p.is_split_payment && p.payment_method?.toLowerCase() === "cash"
			);
		} else if (methodFilter === "credit") {
			newlyFiltered = paymentsToFilter.filter(
				(p) =>
					!p.is_split_payment &&
					(p.payment_method?.toLowerCase() === "credit" ||
						p.payment_method?.toLowerCase() === "card")
			);
		}
		setFilteredPayments(newlyFiltered); // Update the state for displayed payments
	};

	// Effect to fetch payments when status tab changes
	useEffect(() => {
		fetchPaymentsByStatus();
	}, [fetchPaymentsByStatus]);

	// Effect to re-apply frontend filter when method filter changes
	useEffect(() => {
		// Don't run while loading initial data
		if (!isLoading) {
			applyFrontendMethodFilter(allPaymentsForStatus, paymentMethodFilter);
		}
	}, [paymentMethodFilter, allPaymentsForStatus, isLoading]); // Re-filter when method or base data changes

	// --- Helper Functions (Unchanged) ---
	const formatCurrency = (amount) => {
		const numAmount = Number(amount);
		if (isNaN(numAmount)) return "$ --";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(numAmount);
	};

	const formatDate = (timestamp) => {
		if (!timestamp) return "N/A";
		try {
			return new Date(timestamp).toLocaleString(undefined, {
				dateStyle: "short",
				timeStyle: "short",
			});
		} catch (e) {
			console.warn("Invalid Date format:", timestamp, e);
			return "Invalid Date";
		}
	};

	const getStatusPill = (status) => {
		const lowerStatus = status?.toLowerCase();
		const baseClasses =
			"px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center border whitespace-nowrap";
		switch (lowerStatus) {
			case "completed":
				return (
					<span
						className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}
					>
						COMPLETED
					</span>
				);
			case "refunded":
				return (
					<span
						className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-200`}
					>
						REFUNDED
					</span>
				);
			case "partially_refunded":
				return (
					<span
						className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}
					>
						PARTIAL REFUND
					</span>
				);
			case "failed":
				return (
					<span
						className={`${baseClasses} bg-red-50 text-red-700 border-red-200`}
					>
						FAILED
					</span>
				);
			case "pending":
			case "processing":
				return (
					<span
						className={`${baseClasses} bg-sky-50 text-sky-700 border-sky-200`}
					>
						{lowerStatus.toUpperCase()}
					</span>
				);
			default:
				return (
					<span
						className={`${baseClasses} bg-slate-100 text-slate-600 border-slate-200`}
					>
						{String(status ?? "UNKNOWN").toUpperCase()}
					</span>
				);
		}
	};

	const getPaymentMethodDisplay = (payment) => {
		const baseClasses =
			"px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 border whitespace-nowrap";
		if (payment.is_split_payment) {
			return (
				<span
					className={`${baseClasses} bg-purple-50 text-purple-700 border-purple-200`}
				>
					<SquaresPlusIcon className="h-3 w-3" />
					SPLIT
				</span>
			);
		}
		const method = payment.payment_method?.toLowerCase();
		if (method === "cash") {
			return (
				<span
					className={`${baseClasses} bg-green-50 text-green-700 border-green-200`}
				>
					<BanknotesIcon className="h-3 w-3" />
					CASH
				</span>
			);
		}
		if (method === "credit" || method === "card") {
			return (
				<span
					className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-200`}
				>
					<CreditCardIcon className="h-3 w-3" />
					CARD
				</span>
			);
		}
		return (
			<span
				className={`${baseClasses} bg-slate-100 text-slate-700 border-slate-200`}
			>
				<TicketIcon className="h-3 w-3" />
				{method ? method.toUpperCase() : "N/A"}
			</span>
		);
	};

	// --- Event Handlers ---
	const viewPaymentDetails = (paymentId) => navigate(`/payments/${paymentId}`);
	const viewAssociatedOrder = (orderId) => {
		if (orderId) {
			navigate(`/orders/${orderId}`);
		} else {
			console.warn("No associated order ID found for this payment.");
		}
	};

	// --- UI Rendering ---
	const tabButtonBase =
		"flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1";
	const tabButtonActive = "bg-blue-600 text-white shadow-sm";
	const tabButtonInactive =
		"bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700";
	const actionButtonClass =
		"p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-400";

	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 p-4 text-slate-900 sm:p-6">
			{/* Header Section */}
			<header className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 sm:text-2xl">
					<CreditCardIcon className="h-6 w-6 text-slate-600" /> Payment
					Management
				</h1>
				<button
					className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					onClick={() => navigate("/dashboard")}
				>
					<Bars3Icon className="h-4 w-4" />
					<span className="hidden sm:inline">Dashboard</span>
				</button>
			</header>

			{/* Filter Section */}
			<div className="mb-4 grid flex-shrink-0 grid-cols-1 gap-3 md:grid-cols-2">
				{/* Status Filter */}
				<div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
					<div className="mb-1.5 px-1 text-xs font-semibold text-slate-500">
						Filter by Status
					</div>
					<div className="flex flex-wrap gap-1.5">
						{[
							"all",
							"completed",
							"refunded",
							"partially_refunded",
							"failed",
							"pending",
						].map((tab) => (
							<button
								key={tab}
								className={`${tabButtonBase} ${
									activeTab === tab ? tabButtonActive : tabButtonInactive
								}`}
								onClick={() => setActiveTab(tab)} // Triggers fetchPaymentsByStatus via useEffect
							>
								{tab.toUpperCase().replace("_", " ")}
							</button>
						))}
					</div>
				</div>
				{/* Payment Method Filter */}
				<div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
					<div className="mb-1.5 px-1 text-xs font-semibold text-slate-500">
						Filter by Method
					</div>
					<div className="flex flex-wrap gap-1.5">
						{["all", "cash", "credit", "split"].map((method) => (
							<button
								key={method}
								className={`${tabButtonBase} ${
									paymentMethodFilter === method
										? tabButtonActive
										: tabButtonInactive
								}`}
								onClick={() => setPaymentMethodFilter(method)} // Triggers frontend filtering via useEffect
							>
								{method.toUpperCase()}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Payments List Area */}
			<div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
				{isLoading ? (
					<div className="flex h-full items-center justify-center">
						<LoadingSpinner size="md" />
					</div>
				) : error ? (
					<div className="flex h-full flex-col items-center justify-center p-6 text-center">
						<ExclamationTriangleIcon className="mb-2 h-8 w-8 text-red-400" />
						<p className="mb-3 text-sm text-red-600">{error}</p>
						<button
							onClick={fetchPaymentsByStatus} // Retry button fetches by status again
							className="flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
						>
							<ArrowPathIcon className="h-3.5 w-3.5" /> Retry
						</button>
					</div>
				) : (
					<div className="custom-scrollbar h-full overflow-auto">
						<table className="min-w-full divide-y divide-slate-100">
							<thead className="sticky top-0 z-10 bg-slate-50">
								<tr>
									<Th>ID</Th>
									<Th>Date</Th>
									<Th>Method</Th>
									<Th align="right">Amount</Th>
									<Th>Status</Th>
									<Th>Order</Th>
									<Th align="right">Actions</Th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 bg-white">
								{/* *** Display filteredPayments instead of payments *** */}
								{filteredPayments.length === 0 ? (
									<tr>
										<td
											colSpan="7"
											className="p-8 text-center text-sm text-slate-500"
										>
											No payments match the current filters.
										</td>
									</tr>
								) : (
									filteredPayments.map((payment) => (
										<tr
											key={payment.id}
											className="transition-colors hover:bg-slate-50/50"
										>
											<Td isHeader>#{payment.id}</Td>
											<Td>{formatDate(payment.created_at)}</Td>
											<Td>{getPaymentMethodDisplay(payment)}</Td>
											<Td
												isHeader
												align="right"
											>
												{formatCurrency(payment.amount)}
											</Td>
											<Td>{getStatusPill(payment.status)}</Td>
											<Td>
												{payment.order ? (
													<button
														onClick={() => viewAssociatedOrder(payment.order)}
														className="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-blue-600 hover:bg-blue-50 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-400"
														title={`View Order #${payment.order}`}
													>
														<TicketIcon className="h-3.5 w-3.5 flex-shrink-0" />{" "}
														#{payment.order}
													</button>
												) : (
													<span className="text-xs text-slate-400 italic">
														N/A
													</span>
												)}
											</Td>
											<Td align="right">
												<button
													onClick={() => viewPaymentDetails(payment.id)}
													className={actionButtonClass}
													title="View Details"
												>
													<EyeIcon className="h-4 w-4" />
												</button>
											</Td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Status Bar */}
			<footer className="mt-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-white px-4 py-2 text-xs shadow-sm border border-slate-200">
				<span className="flex items-center gap-2 text-slate-600">
					<InformationCircleIcon className="h-3.5 w-3.5 text-slate-400" />
					{/* Show count of displayed payments */}
					<span>Payments Shown: {filteredPayments.length}</span>
					{/* Optionally show total fetched for the status */}
					{/* {paymentMethodFilter !== 'all' && <span> (out of {allPaymentsForStatus.length} {activeTab !== 'all' ? activeTab : ''} payments)</span>} */}
				</span>
				<span className="text-slate-500">
					User: <span className="font-medium text-slate-700">{userName}</span> (
					<span className="font-medium text-slate-700">
						{isAdmin ? "Admin" : "Staff"}
					</span>
					)
				</span>
			</footer>

			{/* Modals */}
			{refundSuccessData && (
				<RefundSuccessModal
					isOpen={!!refundSuccessData}
					onClose={() => setRefundSuccessData(null)}
					refundData={
						refundSuccessData.refund_details || {
							amount: refundSuccessData.amount,
						}
					}
					paymentMethod={refundSuccessData.payment_method || ""}
				/>
			)}
		</div>
	);
}

// Helper components for table styling (Unchanged)
const Th = ({ children, align = "left" }) => (
	<th
		scope="col"
		className={`whitespace-nowrap px-4 py-2.5 text-${align} text-xs font-semibold uppercase tracking-wider text-slate-500`}
	>
		{children}
	</th>
);
Th.propTypes = { children: PropTypes.node, align: PropTypes.string };

const Td = ({ children, align = "left", isHeader = false }) => (
	<td
		className={`whitespace-nowrap px-4 py-2 text-${align} text-xs ${
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
