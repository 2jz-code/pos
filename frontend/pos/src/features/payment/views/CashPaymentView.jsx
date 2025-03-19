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
import { useCustomerFlow } from "../../../features/customerDisplay/hooks/useCustomerFlow";
import customerDisplayManager from "../../../features/customerDisplay/utils/windowManager";
import { useCartStore } from "../../../store/cartStore";

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
	const { startFlow, goToStep, updateFlowData, flowActive } = useCustomerFlow();
	// Combine errors from drawer and local state for display
	const displayError = drawerError || error;
	const [hasBeenMounted, setHasBeenMounted] = useState(false);

	useEffect(() => {
		// Mark that the component has been mounted
		setHasBeenMounted(true);

		// This cleanup function runs when component unmounts
		return () => {
			// Only reset the display if we're not navigating away from POS
			if (hasBeenMounted) {
				console.log("CashPaymentView unmounting, resetting to cart display");

				// Get the current cart
				const cart = useCartStore.getState().cart;

				// Reset display to cart view instead of welcome
				try {
					if (cart && cart.length > 0) {
						customerDisplayManager.showCart(cart);
					} else {
						customerDisplayManager.showWelcome();
					}
				} catch (err) {
					console.error("Error resetting customer display:", err);
				}
			}
		};
	}, [hasBeenMounted]);

	useEffect(() => {
		// Make sure window manager is accessible
		console.log("Window manager object:", customerDisplayManager);

		// Try direct access
		try {
			const displayWindow = customerDisplayManager.openWindow();
			console.log("Display window opened:", displayWindow);
		} catch (err) {
			console.error("Error accessing window manager:", err);
		}
	}, []);

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
			(sum, t) => sum + (t.cashTendered || 0),
			0
		);

		const totalAmount = cashTransactions.reduce(
			(sum, t) => sum + (t.amount || 0),
			0
		);

		const totalChange = cashTransactions.reduce(
			(sum, t) => sum + (t.change || 0),
			0
		);

		return {
			totalTendered,
			totalChange,
			totalAmount,
			isFullyPaid: totalAmount >= remainingAmount || remainingAmount <= 0,
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

			// Process the payment
			const success = await handlePayment(validAmount, {
				method: "cash",
				cashTendered: amount,
				change: change,
			});

			if (!success) {
				throw new Error("Payment processing failed");
			}

			// Calculate values
			const originalTotal = remainingAmount + state.amountPaid;
			const currentAmountPaid = state.amountPaid + validAmount;
			const newRemainingAmount = originalTotal - currentAmountPaid;

			const currentTotals = getTransactionTotals() || {
				totalTendered: 0,
				totalChange: 0,
			};
			const totalTendered = currentTotals.totalTendered + amount;
			const totalChange = currentTotals.totalChange + change;

			// Prepare cash data
			const cashData = {
				cashTendered: totalTendered,
				change: totalChange,
				amountPaid: currentAmountPaid,
				remainingAmount: newRemainingAmount,
				isFullyPaid: newRemainingAmount <= 0,
			};

			// 1. Try updating via the hook (existing method)
			updateFlowData({
				paymentMethod: "cash",
				cashData: cashData,
			});

			// 2. IMPORTANT: Direct communication with the display window
			try {
				// Ensure the window is open
				if (
					!customerDisplayManager.displayWindow ||
					customerDisplayManager.displayWindow.closed
				) {
					customerDisplayManager.openWindow();
				}

				// Wait a moment for the window to be ready
				setTimeout(() => {
					// Send a direct message to update the customer display
					customerDisplayManager.displayWindow.postMessage(
						{
							type: "DIRECT_CASH_UPDATE",
							content: {
								currentStep: "payment",
								paymentMethod: "cash",
								cashData: cashData,
								displayMode: "flow",
							},
						},
						"*"
					);

					console.log("Direct message sent to customer display");
				}, 300);
			} catch (err) {
				console.error("Error sending direct message:", err);
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

				// Get the latest transaction details
				const transactionTotals = getTransactionTotals();

				// Mark the cash payment as complete in the flow with accurate data
				updateFlowData({
					cashPaymentComplete: true,
					cashData: {
						cashTendered: transactionTotals?.totalTendered || 0,
						change: transactionTotals?.totalChange || 0,
						amountPaid: state.amountPaid,
						remainingAmount: remainingAmount,
						isFullyPaid: remainingAmount <= 0 || transactionTotals?.isFullyPaid,
					},
				});

				// After a short delay, move to receipt step
				setTimeout(() => {
					goToStep("receipt", {
						paymentMethod: "cash",
						cashData: {
							cashTendered: transactionTotals?.totalTendered || 0,
							change: transactionTotals?.totalChange || 0,
							amountPaid: state.amountPaid,
							remainingAmount: remainingAmount,
							isFullyPaid:
								remainingAmount <= 0 || transactionTotals?.isFullyPaid,
						},
						cashPaymentComplete: true,
					});
				}, 1000);

				// Prepare receipt data
				const receiptData = {
					items: state.transactions,
					total: state.amountPaid,
					payment_method: "cash",
					amount_tendered: getTransactionTotals()?.totalTendered || 0,
					change: getTransactionTotals()?.totalChange || 0,
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
						className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 mr-2"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
								clipRule="evenodd"
							/>
						</svg>
						{displayError}
					</motion.div>
				)}

				<div className="p-4 bg-blue-50 text-blue-700 rounded-lg mb-4">
					<div className="font-medium mb-1">Amount Due</div>
					<div className="text-2xl font-bold">
						${remainingAmount.toFixed(2)}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3 mb-4">
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
						/>
					))}
				</div>

				<div className="flex gap-2 mb-4">
					<div className="relative flex-1">
						<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
							$
						</span>
						<input
							type="number"
							className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							placeholder="Custom amount"
							min={remainingAmount}
							step="0.01"
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
					</div>
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
						className="p-4 bg-emerald-50 text-emerald-700 rounded-lg space-y-2"
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
						<div className="flex justify-between items-center text-sm text-emerald-600">
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
				/>
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
		orderId: PropTypes.number,
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
