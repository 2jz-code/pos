// src/pages/payments/RefundConfirmation.jsx
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Modal from "../../components/common/Modal"; // Assuming Modal component exists and works

export default function RefundConfirmation({
	isOpen,
	onClose,
	transaction, // ** Specific transaction to refund **
	onConfirm,
	isProcessing = false,
}) {
	// State for the refund amount, defaulting to the transaction's full amount
	const [refundAmount, setRefundAmount] = useState("");
	const [refundReason, setRefundReason] = useState("requested_by_customer");
	const [confirmationText, setConfirmationText] = useState("");
	const [isValidAmount, setIsValidAmount] = useState(true);

	// Reset state when modal opens or transaction changes
	useEffect(() => {
		if (isOpen && transaction) {
			// Set refund amount to full transaction amount when modal opens
			setRefundAmount(transaction.amount?.toString() || "0");
			setRefundReason("requested_by_customer");
			setConfirmationText("");
			setIsValidAmount(true); // Assume valid initially
		}
	}, [isOpen, transaction]); // Rerun when transaction changes

	// Validate amount input whenever refundAmount or transaction changes
	useEffect(() => {
		if (!transaction) {
			setIsValidAmount(false);
			return;
		}
		const amountNum = parseFloat(refundAmount);
		const transactionAmountNum = parseFloat(transaction.amount || 0);

		const valid =
			!isNaN(amountNum) && amountNum > 0 && amountNum <= transactionAmountNum;
		setIsValidAmount(valid);
	}, [refundAmount, transaction]);

	// Format currency
	const formatCurrency = (amount) => {
		const numAmount = Number(amount);
		if (isNaN(numAmount)) return "$0.00";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(numAmount);
	};

	// Handle the final confirmation
	const handleConfirm = () => {
		// Double check transaction exists before proceeding
		if (!transaction || !isValidAmount || confirmationText !== "REFUND") {
			console.error("Refund confirmation check failed:", {
				transaction,
				isValidAmount,
				confirmationText,
			});
			return;
		}
		// const amountToRefund = parseFloat(refundAmount); // Keep this for validation logic if needed internally
		const formattedAmountString = Number(refundAmount).toFixed(2);

		const refundData = {
			transaction_id: transaction.id, // Pass the PaymentTransaction ID
			amount: formattedAmountString, // <<< Use the formatted string amount
			reason: refundReason,
		};
		onConfirm(refundData);
	};

	// --- Helper function REMOVED ---
	// const calculateRefundAmount = ... (Removed as it was causing errors)

	// Render logic
	if (!isOpen || !transaction) return null;

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={`Refund Transaction #${transaction.id}`}
			size="md"
		>
			<div className="space-y-4">
				{/* Display Transaction Details */}
				<div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
					<h4 className="text-sm font-medium text-slate-600 mb-2">
						Transaction Details:
					</h4>
					<div className="flex justify-between mb-1">
						<span className="text-sm">Method:</span>
						<span className="text-sm font-medium">
							{transaction.payment_method?.toUpperCase()}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-sm">Original Amount:</span>
						<span className="text-sm font-semibold">
							{formatCurrency(transaction.amount)}
						</span>
					</div>
					{transaction.transaction_id && (
						<div className="flex justify-between mt-1">
							<span className="text-sm">Reference ID:</span>
							<span className="text-xs font-mono bg-slate-100 px-1 rounded">
								{transaction.transaction_id}
							</span>
						</div>
					)}
				</div>

				{/* Refund Amount Input */}
				<div>
					<label
						htmlFor="refund-amount"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Refund Amount:
					</label>
					<input
						type="number"
						id="refund-amount"
						value={refundAmount}
						onChange={(e) => setRefundAmount(e.target.value)}
						max={transaction.amount}
						min="0.01"
						step="0.01"
						className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm ${
							isValidAmount
								? "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
								: "border-red-500 ring-red-500 focus:ring-red-500 focus:border-red-500"
						}`}
						placeholder={`Max ${formatCurrency(transaction.amount)}`}
						required
					/>
					{!isValidAmount && refundAmount && (
						<p className="mt-1 text-xs text-red-600">
							Amount must be between $0.01 and{" "}
							{formatCurrency(transaction.amount)}.
						</p>
					)}
				</div>

				{/* Refund Reason */}
				<div>
					<label
						htmlFor="refund-reason"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Reason for Refund:
					</label>
					<select
						id="refund-reason"
						value={refundReason}
						onChange={(e) => setRefundReason(e.target.value)}
						className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					>
						<option value="requested_by_customer">Requested by customer</option>
						<option value="duplicate">Duplicate</option>
						<option value="fraudulent">Fraudulent</option>
						<option value="order_cancelled">Order Cancelled</option>
						<option value="product_unsatisfactory">
							Product Unsatisfactory
						</option>
						<option value="other">Other</option>
					</select>
				</div>

				{/* Final Confirmation */}
				<div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
					<p className="text-sm text-yellow-700">
						Warning: This action cannot be undone. Type <strong>REFUND</strong>{" "}
						below to confirm.
					</p>
				</div>
				<div>
					<label
						htmlFor="confirmation-text"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Confirm by typing REFUND:
					</label>
					<input
						type="text"
						id="confirmation-text"
						value={confirmationText}
						onChange={(e) => setConfirmationText(e.target.value)}
						className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm font-mono ${
							confirmationText !== "REFUND" && confirmationText !== ""
								? "border-red-500"
								: "border-gray-300"
						}`}
						placeholder="REFUND"
						required
					/>
				</div>

				{/* Action Buttons */}
				<div className="mt-5 sm:mt-6 flex justify-end space-x-3">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
						disabled={isProcessing}
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={
							!isValidAmount || confirmationText !== "REFUND" || isProcessing
						}
						className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
							!isValidAmount || confirmationText !== "REFUND" || isProcessing
								? "bg-red-300 cursor-not-allowed"
								: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
						}`}
					>
						{isProcessing ? (
							<>
								{/* Loading spinner SVG */}
								<svg
									className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Processing...
							</>
						) : (
							// Use state for amount display
							`Refund ${formatCurrency(refundAmount)}`
						)}
					</button>
				</div>
			</div>
		</Modal>
	);
}

RefundConfirmation.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	payment: PropTypes.object, // Keep parent payment for context if needed
	transaction: PropTypes.object, // Specific transaction to refund
	onConfirm: PropTypes.func.isRequired,
	isProcessing: PropTypes.bool,
};
