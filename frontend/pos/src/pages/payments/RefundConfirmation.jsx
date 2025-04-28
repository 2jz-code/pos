import { useState, useEffect, Fragment } from "react"; // Added React, Fragment import
import PropTypes from "prop-types";
// Icons
import {
	ExclamationTriangleIcon,
	ArrowPathIcon,
	ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { Transition, Dialog } from "@headlessui/react";
/**
 * RefundConfirmation Component (Logic Preserved from User Provided Code)
 *
 * Modal to confirm refund details before processing.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
export default function RefundConfirmation({
	isOpen,
	onClose,
	transaction, // Specific transaction to refund
	onConfirm,
	isProcessing = false,
	// Removed unused 'payment' prop based on provided logic
}) {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const [refundAmount, setRefundAmount] = useState("");
	const [refundReason, setRefundReason] = useState("requested_by_customer");
	const [confirmationText, setConfirmationText] = useState("");
	const [isValidAmount, setIsValidAmount] = useState(true);

	// Reset state when modal opens or transaction changes (Original)
	useEffect(() => {
		if (isOpen && transaction) {
			setRefundAmount(transaction.amount?.toString() || "0");
			setRefundReason("requested_by_customer");
			setConfirmationText("");
			setIsValidAmount(true);
		}
	}, [isOpen, transaction]);

	// Validate amount input (Original)
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

	// Format currency (Original)
	const formatCurrency = (amount) => {
		const numAmount = Number(amount);
		if (isNaN(numAmount)) return "$0.00";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(numAmount);
	};

	// Handle the final confirmation (Original)
	const handleConfirm = () => {
		if (!transaction || !isValidAmount || confirmationText !== "REFUND") {
			console.error("Refund confirmation check failed:", {
				transaction,
				isValidAmount,
				confirmationText,
			});
			// Optionally show a toast error here
			return;
		}
		const formattedAmountString = Number(refundAmount).toFixed(2); // Ensure 2 decimal places string
		const refundData = {
			transaction_id: transaction.id, // Pass the PaymentTransaction ID
			amount: formattedAmountString,
			reason: refundReason,
		};
		onConfirm(refundData); // Call original prop function
	};
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	// Input field base class
	const inputBaseClass =
		"block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm disabled:bg-slate-100";
	const inputNormalClass = `${inputBaseClass} border-slate-300 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400`;
	const inputErrorClass = `${inputBaseClass} border-red-400 text-red-800 focus:ring-red-500 focus:border-red-500 placeholder-red-300`;
	const selectClass = `${inputNormalClass} appearance-none bg-white bg-no-repeat bg-right-3`;
	const labelClass = "block text-xs font-medium text-slate-600 mb-1";
	const baseButtonClass =
		"inline-flex justify-center items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
	const dangerButtonClass = `${baseButtonClass} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
	const secondaryButtonClass = `${baseButtonClass} bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 focus:ring-slate-500`;

	if (!isOpen || !transaction) return null; // Keep original condition

	return (
		// Use Headless UI Transition/Dialog for accessibility and animations
		<Transition
			appear
			show={isOpen}
			as={Fragment}
		>
			<Dialog
				as="div"
				className="relative z-[60]"
				onClose={onClose}
			>
				{" "}
				{/* High z-index */}
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-200"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
				</Transition.Child>
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
							<Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all border border-slate-200">
								{/* Modal Header */}
								<div className="flex justify-between items-center p-4 border-b border-slate-200">
									<Dialog.Title
										as="h3"
										className="text-lg font-semibold leading-6 text-slate-800"
									>
										Refund Transaction #{transaction.id}
									</Dialog.Title>
									<button
										onClick={onClose}
										className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
										aria-label="Close modal"
									>
										<XMarkIcon className="h-5 w-5" />
									</button>
								</div>

								{/* Modal Body */}
								<div className="p-5 space-y-4">
									{/* Transaction Details */}
									<div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
										<h4 className="text-xs font-semibold text-slate-600 mb-1">
											Transaction to Refund:
										</h4>
										<div className="flex justify-between text-xs">
											<span>Method:</span>{" "}
											<span className="font-medium">
												{transaction.payment_method?.toUpperCase()}
											</span>
										</div>
										<div className="flex justify-between text-xs">
											<span>Amount:</span>{" "}
											<span className="font-semibold">
												{formatCurrency(transaction.amount)}
											</span>
										</div>
										{transaction.transaction_id && (
											<div className="flex justify-between text-xs">
												<span>Ref ID:</span>{" "}
												<span className="font-mono bg-slate-100 px-1 rounded">
													{transaction.transaction_id}
												</span>
											</div>
										)}
									</div>

									{/* Refund Amount Input */}
									<div>
										<label
											htmlFor="refund-amount"
											className={labelClass}
										>
											Refund Amount:
										</label>
										<div className="relative">
											<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
												$
											</span>
											<input
												type="number"
												id="refund-amount"
												value={refundAmount}
												onChange={(e) => setRefundAmount(e.target.value)}
												max={transaction.amount}
												min="0.01"
												step="0.01"
												className={`pl-7 pr-3 ${
													isValidAmount ? inputNormalClass : inputErrorClass
												}`}
												placeholder={`Max ${formatCurrency(
													transaction.amount
												)}`}
												required
											/>
										</div>
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
											className={labelClass}
										>
											Reason for Refund:
										</label>
										<select
											id="refund-reason"
											value={refundReason}
											onChange={(e) => setRefundReason(e.target.value)}
											className={selectClass}
										>
											<option value="requested_by_customer">
												Requested by customer
											</option>
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
									<div className="bg-amber-50 border-l-4 border-amber-400 p-3 my-3 rounded-r-md">
										<p className="text-xs text-amber-800 flex items-start gap-1.5">
											<ExclamationTriangleIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
											<span>
												Warning: This action cannot be undone. Type{" "}
												<strong>REFUND</strong> below to confirm.
											</span>
										</p>
									</div>
									<div>
										<label
											htmlFor="confirmation-text"
											className={labelClass}
										>
											Confirm by typing REFUND:
										</label>
										<input
											type="text"
											id="confirmation-text"
											value={confirmationText}
											onChange={(e) => setConfirmationText(e.target.value)}
											className={`font-mono tracking-widest ${
												confirmationText !== "REFUND" && confirmationText !== ""
													? inputErrorClass
													: inputNormalClass
											}`}
											placeholder="REFUND"
											required
										/>
									</div>
								</div>

								{/* Modal Footer */}
								<div className="mt-5 sm:mt-6 px-5 pb-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 space-y-reverse sm:space-y-0">
									<button
										type="button"
										onClick={onClose}
										className={secondaryButtonClass}
										disabled={isProcessing}
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={handleConfirm}
										disabled={
											!isValidAmount ||
											confirmationText !== "REFUND" ||
											isProcessing
										}
										className={`${dangerButtonClass} flex items-center gap-1.5`}
									>
										{isProcessing ? (
											<ArrowPathIcon className="h-4 w-4 animate-spin" />
										) : (
											<ArrowUturnLeftIcon className="h-4 w-4" />
										)}
										{isProcessing
											? "Processing..."
											: `Refund ${formatCurrency(refundAmount)}`}
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
RefundConfirmation.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	// payment: PropTypes.object, // Removed unused prop
	transaction: PropTypes.object, // Specific transaction to refund
	onConfirm: PropTypes.func.isRequired,
	isProcessing: PropTypes.bool,
};

// Renamed export to match original file if needed, otherwise keep as is.
// export default RefundConfirmation;
