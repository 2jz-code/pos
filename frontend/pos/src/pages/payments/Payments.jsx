// src/pages/payments/Payments.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { paymentService } from "../../api/services/paymentService";
import { authService } from "../../api/services/authService";
// Removed RefundConfirmation import as it's not opened from here anymore
import RefundSuccessModal from "./RefundSuccessModal";
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Assuming LoadingSpinner exists
import {
	CreditCardIcon,
	BanknotesIcon,
	TicketIcon,
	EyeIcon,
} from "@heroicons/react/24/outline"; // Added icons

export default function Payments() {
	const [payments, setPayments] = useState([]);
	const [activeTab, setActiveTab] = useState("all");
	const [paymentMethodFilter, setPaymentMethodFilter] = useState("all"); // Renamed for clarity
	const [isAdmin, setIsAdmin] = useState(false);
	const [userName, setUserName] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();
	// Removed state related to refund modal triggered from this page
	const [refundSuccessData, setRefundSuccessData] = useState(null); // Keep success modal state

	// Fetch payments from backend
	useEffect(() => {
		const fetchPaymentsAndUser = async () => {
			setIsLoading(true);
			setError(null); // Clear previous errors
			try {
				const filters = {};
				if (activeTab !== "all") filters.status = activeTab;
				if (paymentMethodFilter !== "all")
					filters.payment_method = paymentMethodFilter;

				const [paymentsData, authResponse] = await Promise.all([
					paymentService.getPayments(filters),
					authService.checkStatus(),
				]);

				setPayments(Array.isArray(paymentsData) ? paymentsData : []); // Ensure it's an array
				setIsAdmin(authResponse.is_admin);
				setUserName(authResponse.username);
			} catch (error) {
				console.error("Error fetching payments:", error);
				setError("Failed to load payments. Please try again.");
				setPayments([]); // Set empty array on error
			} finally {
				setIsLoading(false);
			}
		};

		fetchPaymentsAndUser();
	}, [activeTab, paymentMethodFilter]); // Dependencies for refetching

	// --- Helper Functions ---
	const formatCurrency = (amount) => {
		const numAmount = Number(amount);
		if (isNaN(numAmount)) return "$0.00";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(numAmount);
	};
	const formatDate = (timestamp) =>
		timestamp ? new Date(timestamp).toLocaleString() : "N/A";

	const getStatusPill = (status) => {
		status = status?.toLowerCase();
		const baseClasses =
			"px-2 py-1 rounded-full text-xs font-medium inline-flex items-center";
		switch (status) {
			case "completed":
				return (
					<span className={`${baseClasses} bg-emerald-50 text-emerald-700`}>
						COMPLETED
					</span>
				);
			case "refunded":
				return (
					<span className={`${baseClasses} bg-red-50 text-red-700`}>
						REFUNDED
					</span>
				);
			case "partially_refunded":
				return (
					<span className={`${baseClasses} bg-orange-50 text-orange-700`}>
						PARTIALLY REFUNDED
					</span>
				);
			case "failed":
				return (
					<span className={`${baseClasses} bg-amber-50 text-amber-700`}>
						FAILED
					</span>
				);
			case "pending":
				return (
					<span className={`${baseClasses} bg-slate-50 text-slate-700`}>
						PENDING
					</span>
				);
			default:
				return (
					<span className={`${baseClasses} bg-slate-50 text-slate-700`}>
						{String(status).toUpperCase()}
					</span>
				);
		}
	};

	const getPaymentMethodDisplay = (payment) => {
		if (payment.is_split_payment) {
			return (
				<span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-medium inline-block">
					SPLIT PAYMENT
				</span>
			);
		}
		const method = payment.payment_method?.toLowerCase();
		const icon =
			method === "cash" ? (
				<BanknotesIcon className="h-4 w-4 mr-1.5 text-green-600" />
			) : method === "credit" ? (
				<CreditCardIcon className="h-4 w-4 mr-1.5 text-blue-600" />
			) : (
				<TicketIcon className="h-4 w-4 mr-1.5 text-gray-500" />
			); // Default icon
		const textClass =
			method === "cash"
				? "text-green-700"
				: method === "credit"
				? "text-blue-700"
				: "text-slate-700";
		const bgClass =
			method === "cash"
				? "bg-green-50"
				: method === "credit"
				? "bg-blue-50"
				: "bg-slate-50";

		return (
			<span
				className={`${bgClass} ${textClass} px-2 py-1 rounded-md text-xs font-medium inline-flex items-center`}
			>
				{icon}{" "}
				{payment.payment_method ? payment.payment_method.toUpperCase() : "N/A"}
			</span>
		);
	};

	// --- Event Handlers ---
	// Removed handleRefund and related state, as refunds are initiated from details page

	const viewPaymentDetails = (paymentId) => {
		navigate(`/payments/${paymentId}`);
	};

	const viewAssociatedOrder = (orderId) => {
		navigate(`/orders/${orderId}`);
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center space-x-4">
					<h1 className="text-2xl font-bold text-slate-800">
						Payment Management
					</h1>
					{/* Online Status Indicator can go here if needed */}
				</div>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 flex items-center gap-1.5"
					onClick={() => navigate("/dashboard")}
				>
					{/* Dashboard Icon */} Dashboard
				</button>
			</div>

			{/* Filter Section */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				{/* Status Filter */}
				<div className="bg-white p-2 rounded-xl shadow-sm">
					<div className="text-sm font-medium text-slate-500 mb-2 px-2">
						Payment Status
					</div>
					<div className="flex flex-wrap gap-2">
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
								className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
									activeTab === tab
										? "bg-blue-600 text-white"
										: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
								}`}
								onClick={() => setActiveTab(tab)}
							>
								{tab.toUpperCase().replace("_", " ")}
							</button>
						))}
					</div>
				</div>

				{/* Payment Method Filter */}
				<div className="bg-white p-2 rounded-xl shadow-sm">
					<div className="text-sm font-medium text-slate-500 mb-2 px-2">
						Payment Method
					</div>
					<div className="flex flex-wrap gap-2">
						{["all", "cash", "credit", "split"].map((method) => (
							<button
								key={method}
								className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
									paymentMethodFilter === method
										? "bg-blue-600 text-white"
										: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
								}`}
								onClick={() => setPaymentMethodFilter(method)}
							>
								{method.toUpperCase()}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Payments List */}
			<div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm flex flex-col">
				{/* Table Header */}
				<div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-600 text-sm sticky top-0 z-10">
					<div className="col-span-1">ID</div>
					<div className="col-span-2">Date</div>
					<div className="col-span-2">Method</div>
					<div className="col-span-1 text-right">Amount</div>
					<div className="col-span-2">Status</div>
					<div className="col-span-2">Order</div>
					<div className="col-span-2 text-right">Actions</div>
				</div>

				{/* Table Body */}
				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="flex items-center justify-center h-64">
							<LoadingSpinner size="md" />
						</div>
					) : error ? (
						<div className="p-8 text-center text-red-500">{error}</div>
					) : payments.length === 0 ? (
						<div className="p-8 text-center text-slate-500">
							No payments found matching filters.
						</div>
					) : (
						payments.map((payment) => (
							<div
								key={payment.id}
								className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm"
							>
								<div className="col-span-1 font-medium text-slate-800 truncate">
									#{payment.id}
								</div>
								<div className="col-span-2 text-slate-600 truncate">
									{formatDate(payment.created_at)}
								</div>
								<div className="col-span-2">
									{getPaymentMethodDisplay(payment)}
								</div>
								<div className="col-span-1 font-medium text-right">
									{formatCurrency(payment.amount)}
								</div>
								<div className="col-span-2">
									{getStatusPill(payment.status)}
								</div>
								<div className="col-span-2 truncate">
									<button
										onClick={() => viewAssociatedOrder(payment.order)}
										className="text-blue-600 hover:underline flex items-center gap-1"
									>
										<TicketIcon className="h-4 w-4 flex-shrink-0" />
										<span className="truncate">Order #{payment.order}</span>
									</button>
								</div>
								<div className="col-span-2 text-right">
									<button
										onClick={() => viewPaymentDetails(payment.id)}
										className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors mr-2 inline-flex items-center gap-1"
										title="View Details"
									>
										<EyeIcon className="h-3.5 w-3.5" /> Details
									</button>
									{/* Refund button removed from list view */}
									{/* {payment.status === "completed" && isAdmin && (
                                        <button
                                            onClick={() => handleRefund(payment)} // Pass full payment object
                                            className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-colors"
                                        >
                                            Refund
                                        </button>
                                    )} */}
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Status Bar */}
			<div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl flex justify-between text-xs mt-4">
				<span>System Status: Operational</span>
				<span>Total Payments: {payments.length}</span>
				<span>
					User: {userName} ({isAdmin ? "Admin" : "Staff"})
				</span>
			</div>

			{/* Modals (Only RefundSuccessModal is needed here now) */}
			{refundSuccessData && (
				<RefundSuccessModal
					isOpen={!!refundSuccessData}
					onClose={() => setRefundSuccessData(null)}
					refundData={
						refundSuccessData.refund_details || {
							amount: refundSuccessData.amount,
						}
					}
					paymentMethod={refundSuccessData.payment_method || ""} // Pass method if available
				/>
			)}
		</div>
	);
}
