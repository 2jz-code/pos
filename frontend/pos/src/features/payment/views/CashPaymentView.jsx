// src/components/payment/views/CashPaymentView.jsx
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
// import { hardwareService } from "../../../api/services/hardwareService";
const { pageVariants, pageTransition } = paymentAnimations;
import { useCashDrawer } from "../../../hooks/useCashDrawer";

const commonMotionProps = {
	variants: pageVariants,
	initial: "enter",
	animate: "center",
	exit: "exit",
	transition: pageTransition,
};

export const CashPaymentView = ({
	state,
	remainingAmount,
	handlePayment, // This will be the processPayment function from PaymentFlow
	setState,
	isPaymentComplete,
	completePaymentFlow,
	handleNavigation,
}) => {
	const {
		drawerState,
		isProcessing,
		error: drawerError,
		openDrawer,
		closeDrawer,
		printReceipt,
	} = useCashDrawer();
	const [error, setError] = useState(null); // Add local error state
	const [paymentInProgress, setPaymentInProgress] = useState(false);

	// Combine errors from drawer and local state for display
	const displayError = drawerError || error;

	useEffect(() => {
		console.log("CashPaymentView rendered with state:", {
			drawerState,
			isProcessing,
			paymentInProgress,
		});
	}, [drawerState, isProcessing, paymentInProgress]);

	// Use useEffect to monitor state changes
	useEffect(() => {
		console.log("Drawer state updated:", drawerState);
	}, [drawerState]);

	const getLatestTransaction = () => {
		if (state.transactions.length === 0) return null;
		return state.transactions[state.transactions.length - 1];
	};

	const getTransactionTotals = () => {
		// Filter only cash transactions
		const cashTransactions = state.transactions.filter(
			(t) => t.method === "cash"
		);

		if (cashTransactions.length === 0) return null;

		// Calculate totals
		const totalTendered = cashTransactions.reduce(
			(sum, t) => sum + t.cashTendered,
			0
		);
		const totalChange = cashTransactions.reduce(
			(sum, t) => sum + (t.change || 0),
			0
		);

		return {
			totalTendered,
			totalChange,
		};
	};

	const shouldShowChangeCalculation = () => {
		const latestTransaction = getLatestTransaction();
		return (
			latestTransaction &&
			latestTransaction.method === "cash" &&
			typeof latestTransaction.cashTendered === "number"
		);
	};

	const handlePresetAmount = async (amount) => {
		setError(null);
		setPaymentInProgress(true);

		try {
			// First open the drawer and wait for it to complete
			const drawerResult = await openDrawer();

			if (!drawerResult) {
				throw new Error("Failed to open cash drawer");
			}

			const validAmount = Math.min(amount, remainingAmount);
			const change = amount - validAmount;

			// Then process the payment
			const success = await handlePayment(validAmount, {
				method: "cash",
				cashTendered: amount,
				change: change,
			});

			if (!success) {
				throw new Error("Payment processing failed");
			}
		} catch (err) {
			setError(err.message || "Failed to process payment");
			console.error("Cash drawer error:", err);
		} finally {
			setPaymentInProgress(false);
		}
	};

	const handleCustomAmount = async () => {
		const amount = parseFloat(state.customAmount);

		// Only validate that it's a positive number
		if (!amount || isNaN(amount) || amount <= 0) {
			setError("Please enter a valid amount");
			return;
		}

		setError(null);
		setPaymentInProgress(true);

		try {
			const drawerResult = await openDrawer();
			if (!drawerResult) {
				throw new Error("Failed to open cash drawer");
			}

			// Calculate how much of this payment will go towards the remaining amount
			const validAmount = Math.min(amount, remainingAmount);
			const change = amount - validAmount;

			const success = await handlePayment(validAmount, {
				method: "cash",
				cashTendered: amount,
				change: change,
			});

			if (success) {
				setState((prev) => ({ ...prev, customAmount: "" }));
			} else {
				throw new Error("Payment processing failed");
			}
		} catch (err) {
			setError(err.message || "Failed to process payment");
			console.error("Custom amount payment error:", err);
		} finally {
			setPaymentInProgress(false);
		}
	};

	const handleDrawerClose = async () => {
		setError(null);
		try {
			console.log("Attempting to close drawer...");
			const result = await closeDrawer();
			console.log("Close drawer result:", result);

			if (result) {
				console.log("Drawer closed successfully");

				// Prepare receipt data
				const receiptData = {
					items: state.transactions,
					total: state.amountPaid,
					payment_method: "cash",
					amount_tendered: getLatestTransaction()?.cashTendered || 0,
					change: getLatestTransaction()?.change || 0,
				};

				try {
					// Print receipt
					await printReceipt(receiptData);
					console.log("Receipt printed successfully");

					// Complete payment flow and navigate
					if (isPaymentComplete()) {
						console.log("Payment is complete, proceeding to completion");
						const success = await completePaymentFlow();
						if (success) {
							handleNavigation("Completion");
						}
					}
				} catch (printError) {
					console.error("Receipt printing failed:", printError);
					setError("Receipt printing failed - " + printError.message);
				}
			}
		} catch (err) {
			console.error("Drawer close error:", err);
			setError(err.message || "Failed to close drawer");
		}
	};

	const canCloseDrawer = () => {
		return (
			shouldShowChangeCalculation() && drawerState === "open" && !isProcessing
		);
	};

	return (
		<motion.div
			key="cash-payment"
			className="absolute inset-0 p-4 space-y-4"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper>
				{displayError && (
					<motion.div
						className="p-3 bg-red-50 text-red-600 rounded-lg"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						{displayError}
					</motion.div>
				)}

				{/* Rest of the JSX remains the same, but update the disabled states */}
				<div className="grid grid-cols-2 gap-3">
					{[5, 10, 20, 50].map((amount) => (
						<PaymentButton
							key={amount}
							label={`$${amount}`}
							onClick={() => handlePresetAmount(amount)}
							disabled={
								isProcessing || paymentInProgress || remainingAmount === 0
							}
							className={
								isProcessing || paymentInProgress
									? "opacity-50 cursor-not-allowed"
									: ""
							}
						>
							{isProcessing || paymentInProgress
								? "Processing..."
								: `$${amount}`}
						</PaymentButton>
					))}
				</div>

				<div className="flex gap-2">
					<input
						type="number"
						className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="Enter custom amount"
						min={remainingAmount} // Changed from 0.01 to remainingAmount
						step="0.01" // Add step for precise decimal input
						value={state.customAmount}
						onChange={(e) =>
							setState((prev) => ({ ...prev, customAmount: e.target.value }))
						}
						disabled={
							isProcessing || paymentInProgress || remainingAmount === 0
						}
						onKeyPress={(e) => {
							if (e.key === "Enter" && !isProcessing && !paymentInProgress) {
								handleCustomAmount();
							}
						}}
					/>
					<PaymentButton
						label={isProcessing || paymentInProgress ? "Processing..." : "Pay"}
						variant="primary"
						onClick={handleCustomAmount}
						disabled={
							isProcessing ||
							paymentInProgress ||
							!state.customAmount ||
							remainingAmount === 0
						}
					/>
				</div>

				{shouldShowChangeCalculation() && (
					<motion.div
						className="p-3 bg-green-50 text-green-700 rounded-lg space-y-2"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<div className="flex justify-between items-center">
							<span className="font-medium">Total Cash Tendered:</span>
							<span className="text-lg">
								${getTransactionTotals()?.totalTendered.toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between items-center font-bold">
							<span>Change Due:</span>
							<span className="text-lg">
								${getTransactionTotals()?.totalChange.toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between items-center text-sm text-green-600">
							<span>Remaining Balance:</span>
							<span>${remainingAmount.toFixed(2)}</span>
						</div>
					</motion.div>
				)}
				<PaymentButton
					label="Close Drawer"
					variant="primary"
					onClick={handleDrawerClose}
					disabled={!canCloseDrawer()}
					className={`w-full mt-4 ${
						!canCloseDrawer() ? "opacity-50 cursor-not-allowed" : ""
					}`}
				>
					{isProcessing ? "Processing..." : "Close Drawer"}
				</PaymentButton>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CashPaymentView.propTypes = {
	state: PropTypes.shape({
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		transactions: PropTypes.arrayOf(
			PropTypes.shape({
				method: PropTypes.string.isRequired,
				amount: PropTypes.number.isRequired,
				cashTendered: PropTypes.number,
				change: PropTypes.number,
			})
		).isRequired,
		customAmount: PropTypes.string.isRequired,
		pendingPayment: PropTypes.shape({
			amount: PropTypes.number,
			cashTendered: PropTypes.number,
			change: PropTypes.number,
		}),
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired,
	handlePayment: PropTypes.func.isRequired,
	setState: PropTypes.func.isRequired,
	isPaymentComplete: PropTypes.func.isRequired,
	completePaymentFlow: PropTypes.func.isRequired,
	handleNavigation: PropTypes.func.isRequired, // Add this line
};

export default CashPaymentView;
