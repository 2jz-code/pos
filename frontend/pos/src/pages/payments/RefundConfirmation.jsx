// src/components/payments/RefundConfirmation.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../components/common/Modal";

export default function RefundConfirmation({
	isOpen,
	onClose,
	payment,
	onConfirm,
	isProcessing = false,
}) {
	// State for multi-step flow
	const [step, setStep] = useState(1);
	const [selectedTransactionIndices, setSelectedTransactionIndices] = useState(
		[]
	);
	const [refundReason, setRefundReason] = useState("requested_by_customer");
	const [confirmationText, setConfirmationText] = useState("");
	const [refundAmount, setRefundAmount] = useState("");
	const [isPartialRefund, setIsPartialRefund] = useState(false);

	// Reset state when modal opens
	const handleClose = () => {
		setStep(1);
		setSelectedTransactionIndices([]);
		setRefundReason("requested_by_customer");
		setConfirmationText("");
		setRefundAmount("");
		onClose();
	};

	// Format currency
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	// Toggle a transaction selection for split payments
	const toggleTransactionSelection = (index) => {
		if (selectedTransactionIndices.includes(index)) {
			setSelectedTransactionIndices(
				selectedTransactionIndices.filter((i) => i !== index)
			);
		} else {
			setSelectedTransactionIndices([...selectedTransactionIndices, index]);
		}
	};

	// Calculate total refund amount based on selection
	const calculateRefundAmount = () => {
		if (!payment) return 0;

		if (payment.is_split_payment && payment.transactions) {
			if (selectedTransactionIndices.length === 0) return 0;

			return selectedTransactionIndices.reduce((total, index) => {
				const transaction = payment.transactions[index];
				return total + (transaction?.amount || 0);
			}, 0);
		}

		// For partial refunds of non-split payments
		if (isPartialRefund && refundAmount) {
			return parseFloat(refundAmount);
		}

		return payment.amount || 0;
	};

	// Determine if we can proceed to the next step
	const canProceed = () => {
		if (step === 1) {
			// For split payments, require at least one transaction selected
			if (payment.is_split_payment && payment.transactions) {
				return selectedTransactionIndices.length > 0;
			}
			return true;
		}

		if (step === 2) {
			// Require a reason
			return refundReason.trim() !== "";
		}

		if (step === 3) {
			// Final confirmation requires typing "REFUND"
			return confirmationText === "REFUND";
		}

		return false;
	};

	// Handle the final confirmation
	const handleConfirm = () => {
		const amount = calculateRefundAmount();

		const refundData = {
			reason: refundReason,
			amount: amount,
		};

		// For split payments, include transaction details
		if (payment.is_split_payment && payment.transactions) {
			refundData.transactions = selectedTransactionIndices.map(
				(index) => payment.transactions[index]
			);
		}

		onConfirm(refundData);
	};

	// Render step 1: Payment method selection (for split payments)
	const renderStep1 = () => {
		if (!payment.is_split_payment || !payment.transactions) {
			// For non-split payments, show a simple confirmation with partial refund option
			return (
				<div className="space-y-4">
					<p className="text-sm text-gray-600">
						You are about to refund the following payment:
					</p>
					<div className="p-4 bg-gray-50 rounded-lg">
						<div className="flex justify-between mb-2">
							<span className="text-sm font-medium">Payment ID:</span>
							<span className="text-sm">{payment.id}</span>
						</div>
						<div className="flex justify-between mb-2">
							<span className="text-sm font-medium">Payment Method:</span>
							<span className="text-sm">
								{payment.payment_method
									? payment.payment_method.replace("_", " ").toUpperCase()
									: "N/A"}
							</span>
						</div>
						<div className="flex justify-between mb-2">
							<span className="text-sm font-medium">Amount:</span>
							<span className="text-sm font-bold">
								{formatCurrency(payment.amount)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm font-medium">Date:</span>
							<span className="text-sm">
								{new Date(payment.created_at).toLocaleString()}
							</span>
						</div>
					</div>

					{/* Add partial refund option */}
					<div className="mt-4">
						<div className="flex items-center mb-3">
							<input
								type="checkbox"
								id="partial-refund"
								checked={isPartialRefund}
								onChange={(e) => {
									setIsPartialRefund(e.target.checked);
									// Reset refund amount when toggling
									if (!e.target.checked) {
										setRefundAmount("");
									} else {
										// Set default to full amount
										setRefundAmount(payment.amount.toString());
									}
								}}
								className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label
								htmlFor="partial-refund"
								className="ml-3 block text-sm font-medium text-gray-700"
							>
								Partial Refund
							</label>
						</div>

						{isPartialRefund && (
							<div className="mt-2">
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
									onChange={(e) => {
										// Ensure amount is not higher than the payment amount
										const value = Math.min(
											parseFloat(e.target.value || 0),
											payment.amount
										);
										setRefundAmount(value.toString());
									}}
									min="0.01"
									max={payment.amount}
									step="0.01"
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									placeholder={`0.00 - ${payment.amount}`}
									required={isPartialRefund}
								/>
								<p className="mt-1 text-xs text-gray-500">
									Maximum amount: {formatCurrency(payment.amount)}
								</p>
							</div>
						)}
					</div>

					<div className="mt-4 flex justify-end space-x-3">
						<button
							type="button"
							onClick={handleClose}
							className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => setStep(2)}
							disabled={
								isPartialRefund &&
								(!refundAmount || parseFloat(refundAmount) <= 0)
							}
							className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
								!isPartialRefund ||
								(refundAmount && parseFloat(refundAmount) > 0)
									? "bg-blue-600 hover:bg-blue-700"
									: "bg-blue-300 cursor-not-allowed"
							}`}
						>
							Next
						</button>
					</div>
				</div>
			);
		}

		// For split payments, show transaction selection
		return (
			<div className="space-y-4">
				<p className="text-sm text-gray-600">
					This is a split payment. Please select which transaction(s) you want
					to refund:
				</p>
				<div className="max-h-60 overflow-y-auto">
					{payment.transactions.map((transaction, index) => (
						<div
							key={index}
							className={`p-3 mb-2 rounded-lg border ${
								selectedTransactionIndices.includes(index)
									? "border-blue-500 bg-blue-50"
									: "border-gray-200"
							}`}
						>
							<div className="flex items-center">
								<input
									type="checkbox"
									id={`transaction-${index}`}
									checked={selectedTransactionIndices.includes(index)}
									onChange={() => toggleTransactionSelection(index)}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									htmlFor={`transaction-${index}`}
									className="ml-3 block text-sm font-medium text-gray-700 flex-grow"
								>
									<div className="flex justify-between">
										<span>
											{transaction.method.replace("_", " ").toUpperCase()}
										</span>
										<span className="font-bold">
											{formatCurrency(transaction.amount)}
										</span>
									</div>
									{transaction.cashTendered && (
										<div className="text-xs text-gray-500 mt-1">
											Cash Tendered: {formatCurrency(transaction.cashTendered)},
											Change: {formatCurrency(transaction.change || 0)}
										</div>
									)}
								</label>
							</div>
						</div>
					))}
				</div>
				<div className="pt-3 border-t border-gray-200">
					<div className="flex justify-between text-sm font-medium">
						<span>Total Refund Amount:</span>
						<span>{formatCurrency(calculateRefundAmount())}</span>
					</div>
				</div>
				<div className="mt-4 flex justify-end space-x-3">
					<button
						type="button"
						onClick={handleClose}
						className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => setStep(2)}
						disabled={!canProceed()}
						className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
							canProceed()
								? "bg-blue-600 hover:bg-blue-700"
								: "bg-blue-300 cursor-not-allowed"
						}`}
					>
						Next
					</button>
				</div>
			</div>
		);
	};

	// Render step 2: Refund reason
	const renderStep2 = () => {
		return (
			<div className="space-y-4">
				<p className="text-sm text-gray-600">
					Please specify the reason for this refund:
				</p>
				<div className="space-y-3">
					<div className="flex items-center">
						<input
							type="radio"
							id="reason-customer"
							name="refund-reason"
							value="requested_by_customer"
							checked={refundReason === "requested_by_customer"}
							onChange={(e) => setRefundReason(e.target.value)}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
						/>
						<label
							htmlFor="reason-customer"
							className="ml-3 block text-sm font-medium text-gray-700"
						>
							Requested by customer
						</label>
					</div>
					<div className="flex items-center">
						<input
							type="radio"
							id="reason-duplicate"
							name="refund-reason"
							value="duplicate"
							checked={refundReason === "duplicate"}
							onChange={(e) => setRefundReason(e.target.value)}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
						/>
						<label
							htmlFor="reason-duplicate"
							className="ml-3 block text-sm font-medium text-gray-700"
						>
							Duplicate charge
						</label>
					</div>
					<div className="flex items-center">
						<input
							type="radio"
							id="reason-fraudulent"
							name="refund-reason"
							value="fraudulent"
							checked={refundReason === "fraudulent"}
							onChange={(e) => setRefundReason(e.target.value)}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
						/>
						<label
							htmlFor="reason-fraudulent"
							className="ml-3 block text-sm font-medium text-gray-700"
						>
							Fraudulent charge
						</label>
					</div>
					<div className="flex items-center">
						<input
							type="radio"
							id="reason-other"
							name="refund-reason"
							value="other"
							checked={refundReason === "other"}
							onChange={(e) => setRefundReason(e.target.value)}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
						/>
						<label
							htmlFor="reason-other"
							className="ml-3 block text-sm font-medium text-gray-700"
						>
							Other reason
						</label>
					</div>
				</div>
				<div className="mt-4 flex justify-end space-x-3">
					<button
						type="button"
						onClick={() => setStep(1)}
						className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
					>
						Back
					</button>
					<button
						type="button"
						onClick={() => setStep(3)}
						disabled={!canProceed()}
						className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
							canProceed()
								? "bg-blue-600 hover:bg-blue-700"
								: "bg-blue-300 cursor-not-allowed"
						}`}
					>
						Next
					</button>
				</div>
			</div>
		);
	};

	// Render step 3: Final confirmation
	const renderStep3 = () => {
		return (
			<div className="space-y-4">
				<div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
					<div className="flex">
						<div className="flex-shrink-0">
							<svg
								className="h-5 w-5 text-yellow-400"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<div className="ml-3">
							<h3 className="text-sm font-medium text-yellow-800">
								Warning: This action cannot be undone
							</h3>
							<div className="mt-2 text-sm text-yellow-700">
								<p>
									You are about to refund{" "}
									{formatCurrency(calculateRefundAmount())}. This will update
									both the payment record and the associated order.
								</p>
							</div>
						</div>
					</div>
				</div>
				<div>
					<label
						htmlFor="confirmation"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Type &quot;REFUND&quot; to confirm:
					</label>
					<input
						type="text"
						id="confirmation"
						value={confirmationText}
						onChange={(e) => setConfirmationText(e.target.value)}
						className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						placeholder="REFUND"
					/>
				</div>
				<div className="mt-4 flex justify-end space-x-3">
					<button
						type="button"
						onClick={() => setStep(2)}
						className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
						disabled={isProcessing}
					>
						Back
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={!canProceed() || isProcessing}
						className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
							canProceed() && !isProcessing
								? "bg-red-600 hover:bg-red-700"
								: "bg-red-300 cursor-not-allowed"
						} flex items-center`}
					>
						{isProcessing ? (
							<>
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
							"Process Refund"
						)}
					</button>
				</div>
			</div>
		);
	};

	// Render the current step
	const renderCurrentStep = () => {
		switch (step) {
			case 1:
				return renderStep1();
			case 2:
				return renderStep2();
			case 3:
				return renderStep3();
			default:
				return null;
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title={`Refund Payment #${payment?.id || ""}`}
			size="lg"
		>
			<div className="mb-4">
				<div className="relative">
					<div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
						<div
							style={{ width: `${(step / 3) * 100}%` }}
							className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
						></div>
					</div>
					<div className="flex text-xs justify-between -mt-2">
						<div
							className={`text-center ${
								step >= 1 ? "text-blue-600 font-medium" : "text-gray-500"
							}`}
						>
							Select Payment
						</div>
						<div
							className={`text-center ${
								step >= 2 ? "text-blue-600 font-medium" : "text-gray-500"
							}`}
						>
							Reason
						</div>
						<div
							className={`text-center ${
								step >= 3 ? "text-blue-600 font-medium" : "text-gray-500"
							}`}
						>
							Confirm
						</div>
					</div>
				</div>
			</div>
			{renderCurrentStep()}
		</Modal>
	);
}

RefundConfirmation.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	payment: PropTypes.object,
	onConfirm: PropTypes.func.isRequired,
	isProcessing: PropTypes.bool,
};
