// src/pages/payments/RefundSuccessModal.jsx
import PropTypes from "prop-types";
import Modal from "../../components/common/Modal";
import { CheckCircleIcon } from "@heroicons/react/24/solid"; // Import icon

export default function RefundSuccessModal({
	isOpen,
	onClose,
	refundData, // Now potentially contains more details { success: bool, message: str, refund_details: obj, ... }
	paymentMethod, // Original payment method for context
}) {
	// Format currency
	const formatCurrency = (amount) => {
		const numAmount = Number(amount);
		if (isNaN(numAmount)) return "$0.00";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(numAmount);
	};

	// Extract details safely
	const refundedAmount = refundData?.amount || 0;
	const stripeRefundId = refundData?.refund_id || null; // Specific ID from Stripe if available
	const refundStatus = refundData?.status || "succeeded"; // Stripe status (succeeded, pending) or internal status

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Refund Processed" // Changed title slightly
			size="md"
		>
			<div className="space-y-4">
				<div className="flex flex-col items-center justify-center p-4 text-center">
					<CheckCircleIcon className="h-12 w-12 text-green-500 mb-3" />
					<p className="text-lg font-medium text-gray-900">
						Refund Processed Successfully
					</p>
					<p className="text-sm text-gray-600 mt-1">
						The transaction has been refunded and statuses updated.
					</p>
				</div>

				<div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
					<div className="flex justify-between">
						<span className="text-sm font-medium text-gray-500">
							Amount Refunded:
						</span>
						<span className="text-lg font-semibold text-gray-900">
							{formatCurrency(refundedAmount)}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-sm font-medium text-gray-500">
							Original Method:
						</span>
						<span className="text-sm font-medium text-gray-900">
							{paymentMethod?.replace("_", " ").toUpperCase()}
						</span>
					</div>
					{stripeRefundId && (
						<div className="flex justify-between">
							<span className="text-sm font-medium text-gray-500">
								Refund ID:
							</span>
							<span className="text-xs font-mono text-gray-700 bg-gray-100 px-1 rounded">
								{stripeRefundId}
							</span>
						</div>
					)}
					<div className="flex justify-between">
						<span className="text-sm font-medium text-gray-500">
							Refund Status:
						</span>
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium ${
								refundStatus === "succeeded"
									? "bg-green-100 text-green-800"
									: "bg-yellow-100 text-yellow-800"
							}`}
						>
							{refundStatus?.toUpperCase()}
						</span>
					</div>
				</div>

				<div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-3">
					<p className="text-sm text-blue-700">
						{paymentMethod === "cash"
							? "Remember to provide the cash back to the customer."
							: "The refund has been issued to the customer's card. It may take 5-10 business days to appear on their statement."}
					</p>
				</div>

				<div className="mt-5 sm:mt-6">
					<button
						type="button"
						onClick={onClose}
						className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:text-sm"
					>
						Close
					</button>
				</div>
			</div>
		</Modal>
	);
}

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
