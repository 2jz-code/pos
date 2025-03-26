// src/pages/Payments.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { paymentService } from "../../api/services/paymentService";
import { authService } from "../../api/services/authService";

export default function Payments() {
	const [payments, setPayments] = useState([]);
	const [activeTab, setActiveTab] = useState("all"); // Default tab
	const [paymentMethod, setPaymentMethod] = useState("all"); // Default payment method filter
	const [isAdmin, setIsAdmin] = useState(false);
	const [userName, setUserName] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	// Fetch payments from backend
	useEffect(() => {
		const fetchPaymentsAndUser = async () => {
			setIsLoading(true);
			try {
				// Prepare filters based on active tab and payment method
				const filters = {};
				if (activeTab !== "all") {
					filters.status = activeTab;
				}
				if (paymentMethod !== "all") {
					filters.payment_method = paymentMethod;
				}

				// Fetch payments and user status in parallel
				const [paymentsData, authResponse] = await Promise.all([
					paymentService.getPayments(filters),
					authService.checkStatus(),
				]);

				setPayments(paymentsData);
				setIsAdmin(authResponse.is_admin);
				setUserName(authResponse.username);
				setError(null);
			} catch (error) {
				console.error("Error fetching payments:", error);
				setError("Failed to load payments. Please try again.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchPaymentsAndUser();
	}, [activeTab, paymentMethod]);

	// Format currency
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	// Format date
	const formatDate = (timestamp) => new Date(timestamp).toLocaleString();

	// Filter payments based on active tab and payment method
	const filteredPayments = useMemo(() => {
		return payments.filter((payment) => {
			// Filter by status (if not "all")
			const statusMatch = activeTab === "all" || payment.status === activeTab;

			// Filter by payment method (if not "all")
			const methodMatch =
				paymentMethod === "all" ||
				payment.payment_method === paymentMethod ||
				(paymentMethod === "split" && payment.is_split_payment);

			return statusMatch && methodMatch;
		});
	}, [payments, activeTab, paymentMethod]);

	// Payment refund handler
	const handleRefund = async (paymentId) => {
		if (!confirm("Are you sure you want to process this refund?")) return;

		try {
			const response = await paymentService.processRefund(paymentId);

			if (response.success) {
				// Update the payment in the state
				setPayments(
					payments.map((payment) =>
						payment.id === paymentId
							? { ...payment, status: "refunded" }
							: payment
					)
				);
				alert("Refund processed successfully");
			}
		} catch (error) {
			console.error("Error processing refund:", error);
			alert(
				"Failed to process refund: " +
					(error.response?.data?.message || error.message)
			);
		}
	};

	// View payment details
	const viewPaymentDetails = (paymentId) => {
		navigate(`/payments/${paymentId}`);
	};

	// View associated order
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
					<span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium flex items-center">
						<span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5"></span>
						Online
					</span>
				</div>
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

			{/* Filter Section */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				{/* Status Filter */}
				<div className="bg-white p-2 rounded-xl shadow-sm">
					<div className="text-sm font-medium text-slate-500 mb-2 px-2">
						Payment Status
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
								activeTab === "all"
									? "bg-blue-600 text-white"
									: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() => setActiveTab("all")}
						>
							ALL
						</button>
						<button
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
								activeTab === "completed"
									? "bg-blue-600 text-white"
									: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() => setActiveTab("completed")}
						>
							COMPLETED
						</button>
						<button
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
								activeTab === "refunded"
									? "bg-blue-600 text-white"
									: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() => setActiveTab("refunded")}
						>
							REFUNDED
						</button>
						<button
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
								activeTab === "failed"
									? "bg-blue-600 text-white"
									: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() => setActiveTab("failed")}
						>
							FAILED
						</button>
					</div>
				</div>

				{/* Payment Method Filter */}
				<div className="bg-white p-2 rounded-xl shadow-sm">
					<div className="text-sm font-medium text-slate-500 mb-2 px-2">
						Payment Method
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
								paymentMethod === "all"
									? "bg-blue-600 text-white"
									: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() => setPaymentMethod("all")}
						>
							ALL METHODS
						</button>
						<button
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
								paymentMethod === "cash"
									? "bg-blue-600 text-white"
									: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() => setPaymentMethod("cash")}
						>
							CASH
						</button>
						<button
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
								paymentMethod === "credit"
									? "bg-blue-600 text-white"
									: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() => setPaymentMethod("credit")}
						>
							CREDIT CARD
						</button>
						<button
							className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
								paymentMethod === "split"
									? "bg-blue-600 text-white"
									: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() => setPaymentMethod("split")}
						>
							SPLIT PAYMENT
						</button>
					</div>
				</div>
			</div>

			{/* Payments List */}
			<div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm flex flex-col">
				{/* Table Header */}
				<div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-600 text-sm">
					<div className="col-span-1">ID</div>
					<div className="col-span-2">Date</div>
					<div className="col-span-2">Method</div>
					<div className="col-span-1">Amount</div>
					<div className="col-span-2">Status</div>
					<div className="col-span-2">Order</div>
					<div className="col-span-2 text-right">Actions</div>
				</div>

				{/* Table Body */}
				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="flex items-center justify-center h-64">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						</div>
					) : error ? (
						<div className="p-8 text-center text-red-500">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-12 w-12 mx-auto mb-4 text-red-400"
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
							<p>{error}</p>
						</div>
					) : filteredPayments.length === 0 ? (
						<div className="p-8 text-center text-slate-500">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-12 w-12 mx-auto mb-4 text-slate-300"
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
							<p>No payments found</p>
						</div>
					) : (
						filteredPayments.map((payment) => (
							<div
								key={payment.id}
								className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 hover:bg-slate-50 transition-colors"
							>
								<div className="col-span-1 font-medium text-slate-800">
									#{payment.id}
								</div>
								<div className="col-span-2 text-slate-600">
									{formatDate(payment.created_at)}
								</div>
								<div className="col-span-2">
									{payment.is_split_payment ? (
										<span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-medium">
											SPLIT PAYMENT
										</span>
									) : (
										<span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
											{payment.payment_method
												? payment.payment_method.replace("_", " ").toUpperCase()
												: "N/A"}
										</span>
									)}
								</div>
								<div className="col-span-1 font-medium">
									{formatCurrency(payment.amount)}
								</div>
								<div className="col-span-2">
									<span
										className={`px-2 py-1 rounded-md text-xs font-medium ${
											payment.status === "completed"
												? "bg-emerald-50 text-emerald-700"
												: payment.status === "refunded"
												? "bg-red-50 text-red-700"
												: payment.status === "failed"
												? "bg-amber-50 text-amber-700"
												: "bg-slate-50 text-slate-700"
										}`}
									>
										{payment.status.toUpperCase()}
									</span>
								</div>
								<div className="col-span-2">
									<button
										onClick={() => viewAssociatedOrder(payment.order_id)}
										className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
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
												d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
											/>
										</svg>
										Order #{payment.order_id}
									</button>
								</div>
								<div className="col-span-2 text-right">
									<button
										onClick={() => viewPaymentDetails(payment.id)}
										className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors mr-2"
									>
										Details
									</button>
									{payment.status === "completed" && isAdmin && (
										<button
											onClick={() => handleRefund(payment.id)}
											className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-colors"
										>
											Refund
										</button>
									)}
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Status Bar */}
			<div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl flex justify-between text-xs mt-4">
				<span className="flex items-center">
					<span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
					Payment System Operational
				</span>
				<span>Total Payments: {payments.length}</span>
				<span>
					User: {userName} ({isAdmin ? "Admin" : "Staff"})
				</span>
			</div>
		</div>
	);
}
