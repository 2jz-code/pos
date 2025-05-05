import { useState, useEffect } from "react";
import PropTypes from "prop-types"; // Import PropTypes
import { useParams, useNavigate } from "react-router-dom";
import { paymentService } from "../../api/services/paymentService";
import { authService } from "../../api/services/authService";
import RefundConfirmation from "./RefundConfirmation"; // Assuming this is styled consistently
import RefundSuccessModal from "./RefundSuccessModal"; // Assuming this is styled consistently
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Common loading spinner
import { formatPrice } from "../../utils/numberUtils"; // Utility for formatting currency

// Import icons from Heroicons
import {
	ArrowLeftIcon,
	BanknotesIcon,
	CreditCardIcon,
	ArrowUturnLeftIcon,
	TicketIcon,
	InformationCircleIcon,
	DocumentTextIcon,
	HashtagIcon, // Added for IDs
	ClockIcon as ClockOutlineIcon, // Use outline for general info
	CalendarDaysIcon, // For dates
} from "@heroicons/react/24/outline"; // Using outline for consistency and general info
import {
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon as ClockSolidIcon, // Use solid for status indicators
	ExclamationTriangleIcon, // Use solid for status indicators
} from "@heroicons/react/24/solid"; // Use solid for status/alerts
import { openDrawerWithAgent } from "../../api/services/localHardwareService";

// --- Helper Functions ---

/**
 * Formats a timestamp into a locale-specific date and time string.
 * @param {string | null} timestamp - The ISO date string or null.
 * @returns {string} Formatted date string or 'N/A'.
 */
const formatDate = (timestamp) =>
	timestamp ? new Date(timestamp).toLocaleString() : "N/A";

/**
 * Determines the Tailwind CSS classes for a status pill based on the status string.
 * @param {string | null} status - The payment or transaction status (e.g., 'completed', 'refunded').
 * @returns {string} Tailwind CSS classes for the status pill.
 */
const getStatusPillClasses = (status) => {
	const lowerStatus = status?.toLowerCase();
	// Base classes for all pills: padding, rounded corners, font size/weight, inline display, border, subtle shadow
	const baseClasses =
		"px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center border shadow-sm whitespace-nowrap";

	switch (lowerStatus) {
		case "completed":
			return `${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`;
		case "refunded":
			return `${baseClasses} bg-rose-50 text-rose-700 border-rose-200`; // Use rose for refund
		case "partially_refunded":
			return `${baseClasses} bg-amber-50 text-amber-700 border-amber-200`; // Use amber for partial
		case "failed":
			return `${baseClasses} bg-red-50 text-red-700 border-red-200`; // Use red for failed
		case "pending":
		case "processing": // Added processing case
			return `${baseClasses} bg-sky-50 text-sky-700 border-sky-200`; // Use sky for pending/processing
		default:
			return `${baseClasses} bg-slate-100 text-slate-600 border-slate-200`; // Default fallback
	}
};

/**
 * Gets the appropriate icon and label JSX for a payment method.
 * @param {string | null} method - The payment method string (e.g., 'cash', 'credit').
 * @param {boolean} isSplit - Whether the payment is a split payment.
 * @returns {JSX.Element} A span containing the icon and label.
 */
const getPaymentMethodDisplay = (method, isSplit) => {
	// Base classes for consistent alignment and spacing
	const baseClasses = "inline-flex items-center gap-1.5 text-sm";

	if (isSplit) {
		return (
			<span className={`${baseClasses} font-medium text-purple-700`}>
				<TicketIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
				Split Payment
			</span>
		);
	}

	switch (method?.toLowerCase()) {
		case "cash":
			return (
				<span className={`${baseClasses} font-medium text-green-700`}>
					<BanknotesIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
					Cash
				</span>
			);
		case "credit":
		case "card": // Added 'card' as a possible value
			return (
				<span className={`${baseClasses} font-medium text-blue-700`}>
					<CreditCardIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
					Credit Card
				</span>
			);
		default:
			// Fallback for unknown or null methods
			return (
				<span className={`${baseClasses} font-medium text-slate-600`}>
					<TicketIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
					{method ? method.toUpperCase() : "N/A"}
				</span>
			);
	}
};

/**
 * Gets the appropriate icon for a status string.
 * @param {string | null} status - The status string.
 * @returns {JSX.Element | null} A Heroicon component or null.
 */
const getStatusIcon = (status) => {
	const lowerStatus = status?.toLowerCase();
	const iconClasses = "h-4 w-4 mr-1"; // Consistent icon size and margin

	switch (lowerStatus) {
		case "completed":
			return <CheckCircleIcon className={`${iconClasses} text-emerald-500`} />;
		case "refunded":
			return <XCircleIcon className={`${iconClasses} text-rose-500`} />;
		case "partially_refunded":
			return (
				<ExclamationTriangleIcon className={`${iconClasses} text-amber-500`} />
			);
		case "failed":
			return <XCircleIcon className={`${iconClasses} text-red-500`} />;
		case "pending":
		case "processing":
			return <ClockSolidIcon className={`${iconClasses} text-sky-500`} />;
		default:
			return <ClockSolidIcon className={`${iconClasses} text-slate-400`} />;
	}
};

// --- Helper Component for Detail Items ---

/**
 * Renders a definition list item (label and value) with an optional icon.
 * @param {object} props - Component props.
 * @param {string} props.label - The label text.
 * @param {React.ReactNode} props.value - The value to display (can be string, number, or JSX).
 * @param {React.ElementType | null} [props.icon] - Optional Heroicon component.
 * @returns {JSX.Element} A div containing the dt and dd elements.
 */
const DetailItem = ({ label, value, icon: IconComponent }) => (
	<div>
		{/* Definition Term (Label) */}
		<dt className="text-xs font-medium text-slate-500 mb-0.5 flex items-center gap-1">
			{/* Render icon if provided */}
			{IconComponent && (
				<IconComponent className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
			)}
			{label}
		</dt>
		{/* Definition Description (Value) */}
		<dd className="text-sm text-slate-800 break-words">
			{/* Display value or a placeholder if value is falsy */}
			{value || <span className="italic text-slate-400">N/A</span>}
		</dd>
	</div>
);

// Define PropTypes for the DetailItem component
DetailItem.propTypes = {
	label: PropTypes.string.isRequired,
	value: PropTypes.node, // Can be string, number, or JSX element
	icon: PropTypes.elementType, // Expecting a React component type (like a Heroicon)
};

// --- Main PaymentDetails Component ---

export default function PaymentDetails() {
	const { paymentId } = useParams(); // Get payment ID from URL parameters
	const navigate = useNavigate(); // Hook for programmatic navigation

	// --- State Variables ---
	const [payment, setPayment] = useState(null); // Holds the fetched payment details
	const [isAdmin, setIsAdmin] = useState(false); // Tracks if the current user is an admin
	const [isLoading, setIsLoading] = useState(true); // Loading state for data fetching
	const [error, setError] = useState(null); // Stores any errors during fetch or refund
	const [isRefundModalOpen, setIsRefundModalOpen] = useState(false); // Controls visibility of the refund confirmation modal
	const [isProcessingRefund, setIsProcessingRefund] = useState(false); // Indicates if a refund is currently being processed
	const [refundSuccessData, setRefundSuccessData] = useState(null); // Stores data from a successful refund for the success modal
	const [transactionToRefund, setTransactionToRefund] = useState(null); // Stores the specific transaction selected for refund

	// --- Effects ---

	// Effect to fetch payment details and user status on component mount or when paymentId changes
	useEffect(() => {
		const fetchPaymentDetails = async () => {
			setIsLoading(true); // Start loading
			setError(null); // Clear previous errors
			try {
				// Fetch payment data and user auth status concurrently
				const [paymentResponse, authResponse] = await Promise.all([
					paymentService.getPaymentById(paymentId),
					authService.checkStatus(), // Check if user is admin
				]);
				console.log("Fetched Payment Data:", paymentResponse); // Log fetched data for debugging
				setPayment(paymentResponse); // Store payment data
				setIsAdmin(authResponse.is_admin); // Store admin status
			} catch (err) {
				console.error("Error fetching payment details:", err);
				// Set a user-friendly error message
				setError(
					err.response?.data?.detail || // Use backend error message if available
						"Failed to load payment details. Please try again."
				);
			} finally {
				setIsLoading(false); // Stop loading regardless of success or failure
			}
		};
		fetchPaymentDetails();
	}, [paymentId]); // Dependency array: re-run effect if paymentId changes

	// --- Event Handlers ---

	/**
	 * Opens the refund confirmation modal for a specific transaction.
	 * Checks if the transaction is eligible for refund ('completed' status).
	 * @param {object} transaction - The transaction object to be refunded.
	 */
	const openRefundModal = (transaction) => {
		// Prevent refunding non-completed transactions
		if (transaction?.status !== "completed") {
			alert("Only completed transactions can be refunded."); // Simple alert for now
			return;
		}
		setTransactionToRefund(transaction); // Set the transaction to be refunded
		setIsRefundModalOpen(true); // Open the modal
	};

	/**
	 * Handles the confirmation of the refund action from the modal.
	 * Sends the refund request to the backend.
	 * @param {object} refundInputData - Data from the refund form (amount, reason).
	 */
	const handleConfirmRefund = async (refundInputData) => {
		// Ensure payment and transaction data are available
		if (!payment || !transactionToRefund) return;

		setIsProcessingRefund(true); // Indicate refund processing started
		setError(null); // Clear previous errors

		try {
			// Prepare payload for the refund API endpoint
			const refundPayload = {
				transaction_id: transactionToRefund.id,
				amount: refundInputData.amount, // Amount from the modal form
				reason: refundInputData.reason, // Reason from the modal form
			};

			// Call the refund service
			const response = await paymentService.processRefund(
				payment.id,
				refundPayload
			);

			// Check if the backend indicated success
			if (response.success) {
				// Refetch payment data (keep existing logic)
				const updatedPaymentData = await paymentService.getPaymentById(
					paymentId
				);

				// --- MODIFIED: Conditional Drawer Open ---
				// Check if the original transaction being refunded was cash
				const originalMethod =
					transactionToRefund.payment_method?.toLowerCase(); // Safely access and lowercase
				console.log(
					`Refund successful. Original transaction method: ${originalMethod}`
				);
				if (originalMethod === "cash") {
					console.log("Original transaction was cash, opening drawer...");
					await openDrawerWithAgent(); // Open drawer only for cash refund
				} else {
					console.log(
						"Original transaction was not cash, skipping drawer open."
					);
				}
				// -----------------------------------------

				setPayment(updatedPaymentData);
				setIsRefundModalOpen(false);
				setRefundSuccessData(response);
				setTransactionToRefund(null);
			} else {
				throw new Error(
					response.message || "Refund processing failed on the backend."
				);
			}
		} catch (err) {
			console.error("Error processing refund:", err);
			// Extract a user-friendly error message from the error object
			const errorMsg =
				err.response?.data?.error || // Check for specific error field from backend response
				err.message || // Use general error message if available
				"An unexpected error occurred during the refund process."; // Fallback message
			setError(errorMsg); // Set the error state to display to the user
			// Optionally, show an alert immediately as well
			// alert(`Refund Failed: ${errorMsg}`);
		} finally {
			setIsProcessingRefund(false); // Indicate refund processing finished
		}
	};

	// --- Render Logic ---

	// Display loading spinner while fetching data
	if (isLoading) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-slate-50">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	// Display error message if fetching failed and no payment data is available
	if (error && !payment) {
		return (
			<div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-100 p-6 text-center">
				<ExclamationTriangleIcon className="mb-4 h-16 w-16 text-red-400" />
				<h1 className="mb-2 text-2xl font-bold text-slate-800">
					Error Loading Payment
				</h1>
				<p className="mb-6 text-slate-600">{error}</p>
				<button
					className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					onClick={() => navigate("/payments")} // Navigate back to the payments list
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Return to Payments
				</button>
			</div>
		);
	}

	// Display message if payment data is not found (but no fetch error occurred)
	if (!payment) {
		return (
			<div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-100 p-6 text-center">
				<CreditCardIcon className="mb-4 h-16 w-16 text-slate-400" />
				<h1 className="mb-2 text-2xl font-bold text-slate-800">
					Payment Not Found
				</h1>
				<p className="mb-6 text-slate-600">
					The requested payment could not be found.
				</p>
				<button
					className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					onClick={() => navigate("/payments")} // Navigate back to the payments list
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Return to Payments
				</button>
			</div>
		);
	}

	// Ensure transactions is always an array, even if null/undefined from API
	const transactions = Array.isArray(payment.transactions)
		? payment.transactions
		: [];
	// Check if any transaction is potentially refundable (completed status and user is admin)
	const canRefundAny =
		isAdmin && transactions.some((txn) => txn.status === "completed");

	// --- Main Component JSX ---
	return (
		// Full screen container with padding and background color
		<div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 p-4 text-slate-900 sm:p-6">
			{/* Header Section */}
			<header className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
					{/* Page Title */}
					<h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
						Payment Details
					</h1>
					{/* Payment ID Badge */}
					<span className="flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
						<HashtagIcon className="mr-1 h-3 w-3" />
						{paymentId}
					</span>
					{/* Payment Status Pill */}
					<span className={getStatusPillClasses(payment.status)}>
						{getStatusIcon(payment.status)}
						{payment.status?.replace("_", " ").toUpperCase()}
					</span>
				</div>
				{/* Back Button */}
				<button
					className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					onClick={() => navigate("/payments")} // Go back to the payments list page
				>
					<ArrowLeftIcon className="h-4 w-4" /> Back
				</button>
			</header>

			{/* Display Refund Processing Error if it occurs */}
			{error && (
				<div className="mb-4 flex items-center rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm">
					<XCircleIcon className="mr-2 h-5 w-5 flex-shrink-0" />
					<span className="flex-1">{error}</span>
					<button
						onClick={() => setError(null)} // Allow dismissing the error
						className="ml-2 rounded p-0.5 text-red-600 hover:bg-red-100"
						aria-label="Dismiss error"
					>
						<XCircleIcon className="h-4 w-4" />
					</button>
				</div>
			)}

			{/* Main Content Area - Grid layout for responsiveness */}
			<div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-3 sm:gap-6">
				{/* Left Panel: Summary & Order Info */}
				<div className="custom-scrollbar flex flex-col overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1 sm:p-5">
					{/* Payment Summary Section */}
					<div className="mb-4 border-b border-slate-100 pb-4">
						<h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-700">
							<InformationCircleIcon className="h-5 w-5 text-slate-400" />
							Payment Summary
						</h2>
						{/* Definition List for Payment Details */}
						<dl className="space-y-3">
							<DetailItem
								label="Payment ID"
								value={`#${payment.id}`}
								icon={HashtagIcon}
							/>
							<DetailItem
								label="Total Amount"
								value={
									<span className="text-lg font-semibold text-slate-900">
										{formatPrice(payment.amount)}
									</span>
								}
								// No specific icon needed here, amount is primary info
							/>
							{/* Status displayed inline */}
							<div className="flex items-center justify-between">
								<dt className="flex items-center gap-1 text-xs font-medium text-slate-500">
									<ClockOutlineIcon className="h-3.5 w-3.5 text-slate-400" />
									Status
								</dt>
								<dd>
									<span className={getStatusPillClasses(payment.status)}>
										{getStatusIcon(payment.status)}
										{payment.status?.replace("_", " ").toUpperCase()}
									</span>
								</dd>
							</div>
							<DetailItem
								label="Method"
								value={getPaymentMethodDisplay(
									payment.payment_method,
									payment.is_split_payment
								)}
								icon={
									payment.is_split_payment
										? TicketIcon
										: payment.payment_method === "cash"
										? BanknotesIcon
										: CreditCardIcon
								}
							/>
							<DetailItem
								label="Date Created"
								value={formatDate(payment.created_at)}
								icon={CalendarDaysIcon}
							/>
							<DetailItem
								label="Last Updated"
								value={formatDate(payment.updated_at)}
								icon={ClockOutlineIcon}
							/>
						</dl>
					</div>

					{/* Associated Order Info Section */}
					{payment.order ? (
						<div>
							<h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-700">
								<DocumentTextIcon className="h-5 w-5 text-slate-400" />
								Associated Order
							</h2>
							<dl className="space-y-3">
								<DetailItem
									label="Order ID"
									value={
										// Make the Order ID clickable to navigate to the order details page
										<button
											onClick={() => navigate(`/orders/${payment.order}`)}
											className="text-sm font-medium text-blue-600 hover:underline focus:outline-none"
										>
											#{payment.order}
										</button>
									}
									icon={HashtagIcon}
								/>
								{/* Potential future expansion: Add more order details here if needed */}
								{/* e.g., fetch order status or customer name */}
							</dl>
						</div>
					) : (
						// Display if no order is associated
						<div className="flex items-center gap-2 text-sm text-slate-500 italic">
							<InformationCircleIcon className="h-4 w-4 flex-shrink-0" />
							No associated order found.
						</div>
					)}
				</div>

				{/* Right Panel: Transaction List */}
				<div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2">
					{/* Panel Header */}
					<div className="flex-shrink-0 border-b border-slate-200 p-4">
						<h2 className="text-base font-semibold text-slate-700">
							Transactions ({transactions.length})
						</h2>
					</div>
					{/* Transaction Table Area */}
					<div className="custom-scrollbar flex-1 overflow-auto">
						{transactions.length === 0 ? (
							// Message when no transactions exist
							<div className="p-6 text-center text-sm text-slate-500">
								No individual transactions found for this payment.
							</div>
						) : (
							// Table for displaying transactions
							<table className="min-w-full divide-y divide-slate-100">
								{/* Table Header */}
								<thead className="sticky top-0 z-10 bg-slate-50">
									<tr>
										<th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
											ID / Method
										</th>
										<th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
											Amount
										</th>
										<th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
											Status
										</th>

										{/* Only show Actions header if refunds are possible */}
										{canRefundAny && (
											<th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
												Actions
											</th>
										)}
									</tr>
								</thead>
								{/* Table Body */}
								<tbody className="divide-y divide-slate-100 bg-white">
									{transactions.map((txn) => (
										<tr
											key={txn.id}
											className="hover:bg-slate-50/50"
										>
											{/* Transaction ID and Method */}
											<td className="whitespace-nowrap px-4 py-3 align-top">
												<div className="text-xs font-medium text-slate-800">
													#{txn.id}
												</div>
												<div className="mt-0.5 text-[11px] text-slate-500">
													{getPaymentMethodDisplay(txn.payment_method, false)}
												</div>
											</td>
											{/* Transaction Amount */}
											<td className="whitespace-nowrap px-4 py-3 text-right align-top text-sm font-medium text-slate-800">
												{formatPrice(txn.amount)}
												{/* Indicate if it was a refund */}
												{txn.status === "refunded" && (
													<span className="ml-1 text-xs font-normal text-rose-600">
														(Refund)
													</span>
												)}
											</td>
											{/* Transaction Status */}
											<td className="whitespace-nowrap px-4 py-3 align-top">
												<span className={getStatusPillClasses(txn.status)}>
													{getStatusIcon(txn.status)}
													{txn.status?.replace("_", " ").toUpperCase()}
												</span>
											</td>
											{/* Action Buttons (Refund) */}
											{canRefundAny && ( // Only render cell if refunds are possible
												<td className="whitespace-nowrap px-4 py-3 text-right align-top">
													{/* Show refund button only for completed transactions and if user is admin */}
													{isAdmin && txn.status === "completed" && (
														<button
															onClick={() => openRefundModal(txn)}
															disabled={isProcessingRefund} // Disable while another refund is processing
															className="flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
														>
															<ArrowUturnLeftIcon className="h-3.5 w-3.5" />
															Refund
														</button>
													)}
												</td>
											)}
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</div>

			{/* Refund Confirmation Modal */}
			{isRefundModalOpen && transactionToRefund && (
				<RefundConfirmation
					isOpen={isRefundModalOpen}
					onClose={() => {
						setIsRefundModalOpen(false);
						setTransactionToRefund(null); // Clear selection on close
					}}
					onConfirm={handleConfirmRefund}
					transaction={transactionToRefund}
					isProcessing={isProcessingRefund}
					paymentId={payment.id} // Pass paymentId if needed by modal
				/>
			)}

			{/* Refund Success Modal */}
			{refundSuccessData && (
				<RefundSuccessModal
					isOpen={!!refundSuccessData}
					onClose={() => setRefundSuccessData(null)} // Clear success data on close
					refundDetails={refundSuccessData} // Pass refund details to display
					originalPaymentId={payment.id}
				/>
			)}
		</div>
	);
}
