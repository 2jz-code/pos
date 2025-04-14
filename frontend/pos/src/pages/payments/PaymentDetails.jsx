// src/pages/payments/PaymentDetails.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { paymentService } from "../../api/services/paymentService";
import { authService } from "../../api/services/authService";
// Removed unused import: axiosInstance
import RefundConfirmation from "./RefundConfirmation"; // Will update this component next
import RefundSuccessModal from "./RefundSuccessModal";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import {
	ArrowLeftIcon,
	BanknotesIcon,
	CreditCardIcon,
	ArrowUturnLeftIcon,
	TicketIcon,
} from "@heroicons/react/24/outline";
import {
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

export default function PaymentDetails() {
	const { paymentId } = useParams();
	const navigate = useNavigate();

	// State
	const [payment, setPayment] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
	const [isProcessingRefund, setIsProcessingRefund] = useState(false);
	const [refundSuccessData, setRefundSuccessData] = useState(null);
	const [transactionToRefund, setTransactionToRefund] = useState(null); // Store the specific transaction being refunded

	// Fetch payment details (includes nested transactions and order ID)
	useEffect(() => {
		const fetchPaymentDetails = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const [paymentResponse, authResponse] = await Promise.all([
					paymentService.getPaymentById(paymentId),
					authService.checkStatus(),
				]);

				// Log the raw payment data received
				console.log("Fetched Payment Data:", paymentResponse);

				setPayment(paymentResponse);
				setIsAdmin(authResponse.is_admin);
			} catch (error) {
				console.error("Error fetching payment details:", error);
				setError("Failed to load payment details. Please try again.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchPaymentDetails();
	}, [paymentId]);

	// --- Helper Functions ---
	const formatCurrency = (amount) => {
		// Ensure amount is a valid number before formatting
		const numAmount = Number(amount);
		if (isNaN(numAmount)) {
			return "$0.00"; // Or handle as appropriate
		}
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
						<CheckCircleIcon className="h-3 w-3 mr-1" />
						COMPLETED
					</span>
				);
			case "refunded":
				return (
					<span className={`${baseClasses} bg-red-50 text-red-700`}>
						<ArrowUturnLeftIcon className="h-3 w-3 mr-1" />
						REFUNDED
					</span>
				);
			case "partially_refunded":
				return (
					<span className={`${baseClasses} bg-orange-50 text-orange-700`}>
						<ArrowUturnLeftIcon className="h-3 w-3 mr-1" />
						PARTIALLY REFUNDED
					</span>
				);
			case "failed":
				return (
					<span className={`${baseClasses} bg-amber-50 text-amber-700`}>
						<XCircleIcon className="h-3 w-3 mr-1" />
						FAILED
					</span>
				);
			case "pending":
				return (
					<span className={`${baseClasses} bg-slate-50 text-slate-700`}>
						<ClockIcon className="h-3 w-3 mr-1" />
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

	const getPaymentMethodIcon = (method) => {
		switch (method?.toLowerCase()) {
			case "cash":
				return <BanknotesIcon className="h-4 w-4 mr-1.5 text-green-600" />;
			case "credit":
				return <CreditCardIcon className="h-4 w-4 mr-1.5 text-blue-600" />;
			default:
				return <TicketIcon className="h-4 w-4 mr-1.5 text-gray-500" />; // Default icon
		}
	};

	// --- Refund Handling ---
	const openRefundModal = (transaction) => {
		if (transaction?.status !== "completed") {
			alert("Only completed transactions can be refunded.");
			return;
		}
		setTransactionToRefund(transaction);
		setIsRefundModalOpen(true);
	};

	const handleConfirmRefund = async (refundInputData) => {
		if (!payment || !transactionToRefund) return;

		setIsProcessingRefund(true);
		setError(null); // Clear previous errors
		try {
			// Prepare data for the service call
			const refundPayload = {
				transaction_id: transactionToRefund.id, // Pass the PaymentTransaction PK
				amount: refundInputData.amount,
				reason: refundInputData.reason,
			};

			console.log(
				`Processing refund for Payment ${payment.id}, Transaction ${transactionToRefund.id}`,
				refundPayload
			);
			const response = await paymentService.processRefund(
				payment.id,
				refundPayload
			);

			if (response.success) {
				console.log("Refund successful:", response);
				// --- Refresh payment data from server after successful refund ---
				const updatedPaymentData = await paymentService.getPaymentById(
					paymentId
				);
				setPayment(updatedPaymentData);
				// ---
				setIsRefundModalOpen(false);
				setRefundSuccessData(response); // Store the full success response
				setTransactionToRefund(null);
			} else {
				// Handle backend success=false case
				throw new Error(
					response.message || "Refund processing failed on backend."
				);
			}
		} catch (error) {
			console.error("Error processing refund:", error);
			const errorMsg =
				error.response?.data?.error ||
				error.message ||
				"Failed to process refund.";
			setError(errorMsg); // Set error state to display in UI
			alert(`Refund Failed: ${errorMsg}`); // Also show alert
		} finally {
			setIsProcessingRefund(false);
		}
	};

	// --- Render Logic ---

	if (isLoading) {
		return (
			<div className="w-screen h-screen flex items-center justify-center bg-slate-50">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (error && !payment) {
		// Only show full error page if payment failed to load initially
		return (
			<div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
				<ExclamationTriangleIcon className="h-16 w-16 text-red-400 mb-4" />
				<h1 className="text-2xl font-bold text-slate-800 mb-2">
					Error Loading Payment
				</h1>
				<p className="text-slate-600 mb-6">{error}</p>
				<button
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					onClick={() => navigate("/payments")}
				>
					Return to Payments
				</button>
			</div>
		);
	}

	if (!payment) {
		// Handle case where payment is null after loading attempt
		return (
			<div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
				<CreditCardIcon className="h-16 w-16 text-slate-400 mb-4" />
				<h1 className="text-2xl font-bold text-slate-800 mb-2">
					Payment Not Found
				</h1>
				<p className="text-slate-600 mb-6">
					The requested payment could not be found.
				</p>
				<button
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					onClick={() => navigate("/payments")}
				>
					Return to Payments
				</button>
			</div>
		);
	}

	// Ensure transactions is an array, default to empty if not present
	const transactions = Array.isArray(payment.transactions)
		? payment.transactions
		: [];

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6 overflow-hidden">
			{/* Header */}
			<div className="flex justify-between items-center mb-6 flex-shrink-0">
				<div className="flex items-center space-x-3">
					<h1 className="text-2xl font-bold text-slate-800">Payment Details</h1>
					<span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
						#{paymentId}
					</span>
					{getStatusPill(payment.status)}
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium ${
							payment.is_split_payment
								? "bg-purple-50 text-purple-700"
								: "bg-slate-50 text-slate-700"
						}`}
					>
						{payment.is_split_payment ? "SPLIT" : "SINGLE"}
					</span>
				</div>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 flex items-center gap-1.5"
					onClick={() => navigate("/payments")}
				>
					<ArrowLeftIcon className="h-5 w-5" /> Back
				</button>
			</div>

			{/* Display Refund Processing Error if occurs */}
			{error && (
				<div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center text-sm">
					<XCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
					{error}
				</div>
			)}

			{/* Main Content Area */}
			<div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
				{/* Left Panel: Summary & Order Info */}
				<div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-4 flex flex-col border border-slate-200 overflow-y-auto">
					{/* Payment Summary */}
					<div className="border-b border-slate-100 pb-4 mb-4">
						<h2 className="text-base font-semibold text-slate-800 mb-3">
							Payment Summary
						</h2>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-slate-500">Payment ID:</span>{" "}
								<span className="font-medium text-slate-700">{payment.id}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-slate-500">Total Amount:</span>{" "}
								<span className="font-semibold text-lg text-slate-800">
									{formatCurrency(payment.amount)}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-slate-500">Overall Status:</span>{" "}
								{getStatusPill(payment.status)}
							</div>
							<div className="flex justify-between">
								<span className="text-slate-500">Method:</span>{" "}
								<span className="font-medium text-slate-700">
									{payment.payment_method
										? payment.payment_method.toUpperCase()
										: "N/A"}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-slate-500">Date:</span>{" "}
								<span className="font-medium text-slate-700">
									{formatDate(payment.created_at)}
								</span>
							</div>
						</div>
					</div>

					{/* Order Info */}
					{payment.order ? (
						<div className="border-b border-slate-100 pb-4 mb-4">
							<h2 className="text-base font-semibold text-slate-800 mb-3">
								Associated Order
							</h2>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-slate-500">Order ID:</span>{" "}
									<button
										onClick={() => navigate(`/orders/${payment.order}`)}
										className="text-blue-600 hover:underline font-medium"
									>
										#{payment.order}
									</button>
								</div>
								{/* Add more order details if the Order object is expanded in the serializer */}
							</div>
						</div>
					) : (
						<div className="text-sm text-slate-500 italic">
							No associated order found.
						</div>
					)}

					{/* Refund All Button (Removed - refund per transaction is safer) */}
					{/* If you want a "Refund All", it needs careful backend logic */}
				</div>

				{/* Right Panel: Transaction List */}
				<div className="lg:col-span-2 bg-white rounded-xl shadow-sm flex flex-col border border-slate-200 overflow-hidden">
					<div className="p-4 border-b border-slate-200 flex-shrink-0">
						<h2 className="text-base font-semibold text-slate-800">
							Transactions
						</h2>
					</div>
					<div className="flex-1 overflow-y-auto">
						{transactions.length === 0 ? (
							<div className="p-6 text-center text-slate-500">
								No individual transactions recorded for this payment.
							</div>
						) : (
							<div className="divide-y divide-slate-100">
								{transactions.map((txn) => (
									<div
										key={txn.id}
										className="p-4 hover:bg-slate-50"
									>
										<div className="flex flex-wrap justify-between items-start gap-2">
											{/* Left Side: Method, Amount, Status */}
											<div className="flex-1 min-w-[150px]">
												<div className="flex items-center font-medium text-slate-800 mb-1">
													{getPaymentMethodIcon(txn.payment_method)}
													<span>
														{txn.payment_method
															? txn.payment_method.toUpperCase()
															: "N/A"}
													</span>
													<span className="ml-2 text-lg font-semibold">
														{formatCurrency(txn.amount)}
													</span>
												</div>
												{getStatusPill(txn.status)}
												<div className="text-xs text-slate-400 mt-1">
													ID: {txn.id}
												</div>
											</div>

											{/* Middle: Details (Card/Cash/ID) */}
											<div className="flex-1 min-w-[200px] text-xs text-slate-500 space-y-1">
												{txn.payment_method === "credit" &&
													txn.metadata?.card_last4 && (
														<div>
															<strong>Card:</strong>{" "}
															{txn.metadata.card_brand || "CARD"} ****
															{txn.metadata.card_last4}
														</div>
													)}
												{txn.payment_method === "cash" &&
													txn.metadata?.cashTendered !== undefined && ( // Check specifically for tendered
														<div>
															<strong>Tendered:</strong>{" "}
															{formatCurrency(txn.metadata.cashTendered)}
															{txn.metadata?.change !== undefined &&
																` | Change: ${formatCurrency(
																	txn.metadata.change
																)}`}
														</div>
													)}
												{txn.transaction_id && (
													<div>
														<strong>Ref ID:</strong>{" "}
														<span className="font-mono bg-slate-100 px-1 rounded break-all">
															{txn.transaction_id}
														</span>
													</div>
												)}
												{txn.metadata?.refund_id_webhook && (
													<div className="text-red-600">
														<strong>Refund Ref:</strong>{" "}
														<span className="font-mono bg-red-50 px-1 rounded break-all">
															{txn.metadata.refund_id_webhook}
														</span>
													</div>
												)}
												<div>
													<strong>Timestamp:</strong>{" "}
													{formatDate(txn.timestamp)}
												</div>
											</div>

											{/* Right Side: Refund Button */}
											<div className="flex-shrink-0 pt-1">
												{isAdmin && txn.status === "completed" && (
													<button
														onClick={() => openRefundModal(txn)}
														className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
														disabled={isProcessingRefund} // Disable while any refund is processing
													>
														<ArrowUturnLeftIcon className="h-3.5 w-3.5" />{" "}
														Refund
													</button>
												)}
												{txn.status === "refunded" &&
													txn.metadata?.refund_details?.refund_id && (
														<div className="text-xs text-red-500 mt-1 pt-1 border-t border-red-100">
															Refund ID:{" "}
															<span className="font-mono">
																{txn.metadata.refund_details.refund_id}
															</span>
														</div>
													)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Modals */}
			{isRefundModalOpen && transactionToRefund && payment && (
				<RefundConfirmation
					isOpen={isRefundModalOpen}
					onClose={() => {
						setIsRefundModalOpen(false);
						setTransactionToRefund(null);
					}}
					payment={payment} // Pass parent payment (might not be needed by modal anymore)
					transaction={transactionToRefund} // Pass specific transaction
					onConfirm={handleConfirmRefund}
					isProcessing={isProcessingRefund}
				/>
			)}
			{refundSuccessData && (
				<RefundSuccessModal
					isOpen={!!refundSuccessData}
					onClose={() => setRefundSuccessData(null)}
					// Pass specific refund details if available in the response
					refundData={
						refundSuccessData.refund_details || {
							amount: refundSuccessData.amount,
						}
					}
					paymentMethod={
						transactionToRefund?.payment_method || payment?.payment_method || ""
					}
				/>
			)}
		</div>
	);
}
