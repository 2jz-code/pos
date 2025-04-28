import { Fragment } from "react"; // Added React, Fragment imports
import PropTypes from "prop-types";
import { Dialog, Transition } from "@headlessui/react"; // Added Headless UI imports
// Icons
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import {
	BanknotesIcon,
	CreditCardIcon,
	TicketIcon,
} from "@heroicons/react/24/outline";

/**
 * RefundSuccessModal Component (Logic Preserved from User Provided Code)
 *
 * Displays confirmation after a successful refund.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
export default function RefundSuccessModal({
	isOpen,
	onClose,
	refundData, // Now potentially contains more details { success: bool, message: str, refund_details: obj, ... }
	paymentMethod, // Original payment method for context
}) {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	// Format currency (Original)
	const formatCurrency = (amount) => {
		const numAmount = Number(amount);
		if (isNaN(numAmount)) return "$0.00";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(numAmount);
	};

	// Extract details safely (Original)
	const refundedAmount = refundData?.amount || 0;
	const stripeRefundId = refundData?.refund_id || null; // Specific ID from Stripe if available
	const refundStatus = refundData?.status || "succeeded"; // Stripe status (succeeded, pending) or internal status
	const displayMethod =
		paymentMethod?.replace("_", " ").toUpperCase() || "Unknown Method";

	// Get Payment Method Icon (Similar to details page)
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
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	// Base button style
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
				{" "}
				{/* High z-index */}
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
										The transaction has been successfully refunded.
									</p>
								</div>

								{/* Refund Details */}
								<div className="mt-4 bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2">
									<div className="flex justify-between text-sm">
										<span className="font-medium text-slate-600">
											Amount Refunded:
										</span>
										<span className="text-lg font-bold text-slate-900">
											{formatCurrency(refundedAmount)}
										</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="font-medium text-slate-500">
											Original Method:
										</span>
										<span className="font-medium text-slate-700 inline-flex items-center gap-1">
											{getPaymentMethodIcon(paymentMethod, "h-3.5 w-3.5")}
											{displayMethod}
										</span>
									</div>
									{stripeRefundId && (
										<div className="flex justify-between text-xs">
											<span className="font-medium text-slate-500">
												Refund ID:
											</span>
											<span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">
												{stripeRefundId}
											</span>
										</div>
									)}
									<div className="flex justify-between text-xs">
										<span className="font-medium text-slate-500">
											Refund Status:
										</span>
										<span
											className={`px-1.5 py-0.5 rounded font-medium ${
												refundStatus === "succeeded"
													? "bg-emerald-100 text-emerald-700"
													: "bg-yellow-100 text-yellow-800"
											}`}
										>
											{refundStatus?.toUpperCase()}
										</span>
									</div>
								</div>

								{/* Customer Note */}
								<div className="bg-blue-50 border border-blue-100 p-3 mt-4 rounded-md">
									<p className="text-xs text-blue-700">
										{paymentMethod === "cash"
											? "Remember to provide the cash back to the customer."
											: "The refund has been issued to the customer's card. It may take 5-10 business days to appear on their statement."}
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
	// --- END OF UPDATED UI ---
}

// --- ORIGINAL PROPTYPES (UNCHANGED) ---
RefundSuccessModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	refundData: PropTypes.shape({
		amount: PropTypes.number,
		refund_id: PropTypes.string, // Stripe refund ID
		status: PropTypes.string, // Stripe refund status
		success: PropTypes.bool,
		// May include other fields from backend response
	}).isRequired,
	paymentMethod: PropTypes.string.isRequired,
};
