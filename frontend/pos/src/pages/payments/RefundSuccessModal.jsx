// combined-project/frontend-pos/pages/payments/RefundSuccessModal.jsx

import { Fragment } from "react"; // Import React
import PropTypes from "prop-types";
import { Dialog, Transition } from "@headlessui/react";
import {
	CheckCircleIcon,
	BanknotesIcon,
	CreditCardIcon,
	TicketIcon,
	InformationCircleIcon,
} from "@heroicons/react/24/solid";

// Fallback formatCurrency (import from utils if available)
const formatCurrency = (amount, defaultValue = "$?.??") => {
	try {
		const numAmount = Number(amount);
		if (isNaN(numAmount)) return defaultValue;
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(numAmount);
	} catch {
		return defaultValue;
	}
};

// Helper to get Original Transaction ID from message (if needed as fallback)
const extractTxnIdFromMessage = (message) => {
	const match = message?.match(/transaction (\d+)/);
	return match ? match[1] : null;
};

export default function RefundSuccessModal({
	isOpen,
	onClose,
	// Expects the full API response object passed as this prop
	refundDetails,
	// *** REMOVED unused originalPaymentId prop from here - not needed ***
}) {
	// Optional Log: Verify the prop structure upon render
	// console.log("🔵 RefundSuccessModal Props:", JSON.stringify(refundDetails, null, 2));

	if (!isOpen || !refundDetails) return null;

	// --- Extract details safely from the refundDetails prop ---
	const details = refundDetails.refund_details || {}; // Access the nested details object
	const refundedAmount = details.amount || 0;
	const stripeRefundId = details.refund_id;
	const originalTxnPk = details.original_transaction_pk;
	const originalStripeId = details.original_stripe_id;
	// *** FIX: Get method directly from the nested details object ***
	const paymentMethod = details.method;
	const refundStatus = details.status || "succeeded";

	// Top-level fields
	const overallMessage =
		refundDetails.message || "Refund processed successfully.";
	const finalTransactionStatus = refundDetails.transaction_status;
	const finalPaymentStatus = refundDetails.payment_status;
	// Use originalTxnPk if available, otherwise fallback to message extraction
	const displayTxnId =
		originalTxnPk || extractTxnIdFromMessage(refundDetails.message);
	// --- End Data Extraction ---

	// --- Helper Functions ---
	const displayMethod =
		paymentMethod?.replace("_", " ").toUpperCase() || "UNKNOWN";
	const getPaymentMethodIcon = (method, sizeClass = "h-4 w-4") => {
		switch (method?.toLowerCase()) {
			case "cash":
				return <BanknotesIcon className={`${sizeClass} text-green-600`} />;
			case "credit":
				return <CreditCardIcon className={`${sizeClass} text-blue-600`} />;
			default:
				return <TicketIcon className={`${sizeClass} text-gray-500`} />;
		}
	};
	// --- End Helper Functions ---

	// --- UI ---
	const baseButtonClass =
		"inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors duration-150";
	const primaryButtonClass = `${baseButtonClass} bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500`;

	return (
		<Transition
			appear
			show={isOpen}
			as={Fragment}
		>
			<Dialog
				as="div"
				className="relative z-[70]"
				onClose={onClose}
			>
				{/* Backdrop */}
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-200"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
				</Transition.Child>
				{/* Modal Panel Container */}
				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-200"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-150"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all border border-slate-200">
								{/* Icon and Title */}
								<div className="text-center">
									<CheckCircleIcon className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
									<Dialog.Title
										as="h3"
										className="text-lg font-semibold leading-6 text-slate-800"
									>
										Refund Processed
									</Dialog.Title>
									<p className="text-sm text-slate-500 mt-1">
										{overallMessage}
									</p>
								</div>

								{/* Refund Details */}
								<div className="mt-4 bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2">
									{/* Amount Refunded */}
									<div className="flex justify-between text-sm">
										<span className="font-medium text-slate-600">
											Amount Refunded:
										</span>
										<span className="text-lg font-bold text-slate-900">
											{formatCurrency(refundedAmount)}
										</span>
									</div>
									{/* Refund Status */}
									<div className="flex justify-between text-xs">
										<span className="font-medium text-slate-500">
											Refund Status:
										</span>
										<span
											className={`px-1.5 py-0.5 rounded text-xs font-medium ${
												refundStatus === "succeeded" ||
												refundStatus === "completed"
													? "bg-emerald-100 text-emerald-700"
													: refundStatus === "pending"
													? "bg-yellow-100 text-yellow-800"
													: "bg-slate-100 text-slate-700"
											}`}
										>
											{refundStatus?.toUpperCase() || "N/A"}
										</span>
									</div>
									{/* Original Method - Uses paymentMethod from details.method */}
									<div className="flex justify-between text-xs">
										<span className="font-medium text-slate-500">
											Original Method:
										</span>
										{paymentMethod ? (
											<span className="font-medium text-slate-700 inline-flex items-center gap-1">
												{getPaymentMethodIcon(paymentMethod, "h-3.5 w-3.5")}
												{displayMethod}
											</span>
										) : (
											<span className="italic text-slate-400">N/A</span>
										)}
									</div>
									{/* Original Transaction PK */}
									{displayTxnId && (
										<div className="flex justify-between text-xs">
											<span className="font-medium text-slate-500">
												Original Txn #:
											</span>
											<span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">
												{displayTxnId}
											</span>
										</div>
									)}
									{/* Original Stripe ID (if credit) */}
									{originalStripeId && paymentMethod === "credit" && (
										<div className="flex justify-between text-xs">
											<span className="font-medium text-slate-500">
												Original Ref ID:
											</span>
											<span className="font-mono text-xs text-slate-600 bg-slate-100 px-1 rounded break-all">
												{originalStripeId}
											</span>
										</div>
									)}
									{/* Stripe Refund ID (if credit) */}
									{stripeRefundId && paymentMethod === "credit" && (
										<div className="flex justify-between text-xs">
											<span className="font-medium text-slate-500">
												Refund Ref ID:
											</span>
											<span className="font-mono text-xs text-slate-600 bg-slate-100 px-1 rounded break-all">
												{stripeRefundId}
											</span>
										</div>
									)}
									{/* Final Statuses */}
									<div className="flex justify-between text-xs pt-1 mt-1 border-t border-slate-200">
										<span className="font-medium text-slate-500">
											Updated Txn Status:
										</span>
										<span className="font-medium text-slate-700">
											{finalTransactionStatus?.toUpperCase() || "N/A"}
										</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="font-medium text-slate-500">
											Updated Payment Status:
										</span>
										<span className="font-medium text-slate-700">
											{finalPaymentStatus?.replace("_", " ").toUpperCase() ||
												"N/A"}
										</span>
									</div>
								</div>

								{/* Customer Note */}
								<div className="bg-blue-50 border border-blue-100 p-3 mt-4 rounded-md flex items-start gap-2">
									<InformationCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
									<p className="text-xs text-blue-700">
										{paymentMethod === "cash"
											? "Remember to provide the cash back to the customer."
											: "Refund issued via payment processor. It may take 5-10 business days to appear on statement."}
									</p>
								</div>

								{/* Close Button */}
								<div className="mt-5 sm:mt-6">
									<button
										type="button"
										onClick={onClose}
										className={`w-full ${primaryButtonClass}`}
									>
										Close
									</button>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
}

// --- PropType Definitions ---
RefundSuccessModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	// Expects the full response object from the backend refund endpoint
	refundDetails: PropTypes.shape({
		success: PropTypes.bool,
		message: PropTypes.string,
		// Expecting the structure confirmed in the network tab
		refund_details: PropTypes.shape({
			original_transaction_pk: PropTypes.oneOfType([
				PropTypes.string,
				PropTypes.number,
			]),
			original_stripe_id: PropTypes.string,
			method: PropTypes.string, // <<< Method is expected here
			amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			status: PropTypes.string,
			success: PropTypes.bool,
			refund_id: PropTypes.string,
		}),
		payment_status: PropTypes.string,
		transaction_status: PropTypes.string,
	}).isRequired,
	// Removed the separate originalPaymentMethod prop again
};
