// src/components/payment/views/CashPaymentView.jsx
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
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
	handlePayment,
	setState,
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
	const [error, setError] = useState(null);
	const [paymentInProgress, setPaymentInProgress] = useState(false);
	const { goToStep, updateFlowData, flowActive, startFlow } = useCustomerFlow();
	const displayError = drawerError || error;
	const [hasBeenMounted, setHasBeenMounted] = useState(false);
	const epsilon = 0.01; // Small threshold for floating point comparison
	const isFullyPaid = remainingAmount <= epsilon;

	useEffect(() => {
		setHasBeenMounted(true);
		return () => {
			if (hasBeenMounted) {
				console.log("CashPaymentView unmounting, resetting to cart display");
				const cart = useCartStore.getState().cart;
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
		console.log("Window manager object:", customerDisplayManager);
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

	useEffect(() => {
		console.log("Drawer state updated:", drawerState);
	}, [drawerState]);

	const getLatestTransaction = () => {
		if (state.transactions.length === 0) return null;
		return state.transactions[state.transactions.length - 1];
	};

	const getTransactionTotals = () => {
		const cashTransactions = state.transactions.filter(
			(t) => t.method === "cash"
		);

		if (cashTransactions.length === 0) return null;

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

	const currentPaymentAmount =
		state.splitMode && state.nextSplitAmount
			? state.nextSplitAmount
			: remainingAmount;

	const handleReturnToSplitView = useCallback(() => {
		handleNavigation("Split", -1);
	}, [handleNavigation]);

	useEffect(() => {
		if (state.splitMode && !flowActive) {
			console.log("Initializing cash flow for split payment");
			console.log(`Split details from cash payment:`, state.splitDetails);

			const splitOrderData = {
				subtotal: currentPaymentAmount * 0.9,
				tax: currentPaymentAmount * 0.1,
				total: currentPaymentAmount,
				isSplitPayment: true,
				originalTotal: remainingAmount + state.amountPaid,
			};

			startFlow(
				state.orderId,
				"cash",
				currentPaymentAmount,
				true,
				state.splitDetails,
				splitOrderData
			);

			updateFlowData({
				paymentMethod: "cash",
				isSplitPayment: true,
				splitDetails: state.splitDetails,
				splitOrderData: splitOrderData,
				cashData: {
					cashTendered: 0,
					change: 0,
					amountPaid: state.amountPaid,
					remainingAmount: currentPaymentAmount,
					isFullyPaid: currentPaymentAmount <= 0,
				},
			});
		}
	}, [
		state.splitMode,
		flowActive,
		state.orderId,
		currentPaymentAmount,
		state.amountPaid,
		state.splitDetails,
		remainingAmount,
	]);

	const handlePresetAmount = async (amount) => {
		setError(null);
		setPaymentInProgress(true);

		try {
			const drawerResult = await openDrawer();

			if (!drawerResult) {
				throw new Error("Failed to open cash drawer");
			}

			const validAmount = Math.min(amount, currentPaymentAmount);
			const change = amount - validAmount;

			const success = await handlePayment(validAmount, {
				method: "cash",
				cashTendered: amount,
				change: change,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
			});

			if (!success) {
				throw new Error("Payment processing failed");
			}

			const originalTotal = state.splitMode
				? currentPaymentAmount
				: remainingAmount + state.amountPaid;
			const currentAmountPaid = state.amountPaid + validAmount;
			const newRemainingAmount = originalTotal - validAmount;

			const currentTotals = getTransactionTotals() || {
				totalTendered: 0,
				totalChange: 0,
			};
			const totalTendered = currentTotals.totalTendered + amount;
			const totalChange = currentTotals.totalChange + change;

			const cashData = {
				cashTendered: totalTendered,
				change: totalChange,
				amountPaid: currentAmountPaid,
				remainingAmount: newRemainingAmount,
				isFullyPaid: newRemainingAmount <= 0,
				isSplitPayment: state.splitMode,
			};

			updateFlowData({
				paymentMethod: "cash",
				cashData: cashData,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
			});

			try {
				if (
					!customerDisplayManager.displayWindow ||
					customerDisplayManager.displayWindow.closed
				) {
					customerDisplayManager.openWindow();
				}

				setTimeout(() => {
					customerDisplayManager.displayWindow.postMessage(
						{
							type: "DIRECT_CASH_UPDATE",
							content: {
								currentStep: "payment",
								paymentMethod: "cash",
								cashData: cashData,
								displayMode: "flow",
								isSplitPayment: state.splitMode,
								splitDetails: state.splitDetails,
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

		// Validate payment amount - must be a positive number AND at least the total due
		if (!amount || isNaN(amount) || amount <= 0) {
			setError("Please enter a valid amount");
			return;
		}

		// New validation - amount must be at least the current payment amount
		if (amount < currentPaymentAmount) {
			setError(`Amount must be at least $${currentPaymentAmount.toFixed(2)}`);
			return;
		}

		setError(null);
		setPaymentInProgress(true);

		try {
			const drawerResult = await openDrawer();
			if (!drawerResult) {
				throw new Error("Failed to open cash drawer");
			}

			const validAmount = Math.min(amount, currentPaymentAmount);
			const change = amount - validAmount;

			const success = await handlePayment(validAmount, {
				method: "cash",
				cashTendered: amount,
				change: change,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
			});

			if (!success) {
				throw new Error("Payment processing failed");
			}

			const originalTotal = state.splitMode
				? currentPaymentAmount
				: remainingAmount + state.amountPaid;
			const currentAmountPaid = state.amountPaid + validAmount;
			const newRemainingAmount = originalTotal - validAmount;

			const currentTotals = getTransactionTotals() || {
				totalTendered: 0,
				totalChange: 0,
			};
			const totalTendered = currentTotals.totalTendered + amount;
			const totalChange = currentTotals.totalChange + change;

			const cashData = {
				cashTendered: totalTendered,
				change: totalChange,
				amountPaid: currentAmountPaid,
				remainingAmount: newRemainingAmount,
				isFullyPaid: newRemainingAmount <= 0,
				isSplitPayment: state.splitMode,
			};

			updateFlowData({
				paymentMethod: "cash",
				cashData: cashData,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
			});

			try {
				if (
					!customerDisplayManager.displayWindow ||
					customerDisplayManager.displayWindow.closed
				) {
					customerDisplayManager.openWindow();
				}

				setTimeout(() => {
					customerDisplayManager.displayWindow.postMessage(
						{
							type: "DIRECT_CASH_UPDATE",
							content: {
								currentStep: "payment",
								paymentMethod: "cash",
								cashData: cashData,
								displayMode: "flow",
								isSplitPayment: state.splitMode,
								splitDetails: state.splitDetails,
							},
						},
						"*"
					);
					console.log("Direct message sent to customer display");
				}, 300);
			} catch (err) {
				console.error("Error sending direct message:", err);
			}

			setState((prev) => ({ ...prev, customAmount: "" }));
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

				const transactionTotals = getTransactionTotals();

				updateFlowData({
					cashPaymentComplete: true,
					cashData: {
						cashTendered: transactionTotals?.totalTendered || 0,
						change: transactionTotals?.totalChange || 0,
						amountPaid: state.amountPaid,
						remainingAmount: state.splitMode
							? currentPaymentAmount - (transactionTotals?.totalAmount || 0)
							: remainingAmount,
						isFullyPaid:
							(state.splitMode ? currentPaymentAmount : remainingAmount) <= 0 ||
							transactionTotals?.isFullyPaid,
						isSplitPayment: state.splitMode,
					},
					isSplitPayment: state.splitMode,
					splitDetails: state.splitDetails,
				});

				setTimeout(() => {
					goToStep("receipt", {
						paymentMethod: "cash",
						cashData: {
							cashTendered: transactionTotals?.totalTendered || 0,
							change: transactionTotals?.totalChange || 0,
							amountPaid: state.amountPaid,
							remainingAmount: state.splitMode
								? currentPaymentAmount - (transactionTotals?.totalAmount || 0)
								: remainingAmount,
							isFullyPaid:
								(state.splitMode ? currentPaymentAmount : remainingAmount) <=
									0 || transactionTotals?.isFullyPaid,
						},
						cashPaymentComplete: true,
						isSplitPayment: state.splitMode,
						splitDetails: state.splitDetails,
					});
				}, 1000);

				const receiptData = {
					items: state.transactions,
					total: state.amountPaid,
					payment_method: "cash",
					amount_tendered: getTransactionTotals()?.totalTendered || 0,
					change: getTransactionTotals()?.totalChange || 0,
					is_split_payment: state.splitMode,
				};

				try {
					await printReceipt(receiptData);
					console.log("Receipt printed successfully");

					const isAllPaymentsComplete = remainingAmount <= 0;
					console.log(
						"Is all payments complete:",
						isAllPaymentsComplete,
						"Remaining amount:",
						remainingAmount
					);

					if (state.splitMode && !isAllPaymentsComplete) {
						console.log(
							"Split payment portion complete, returning to split view"
						);
						setTimeout(() => {
							handleReturnToSplitView();
						}, 2000);
					} else {
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
			shouldShowChangeCalculation() &&
			drawerState === "open" &&
			!isProcessing &&
			isFullyPaid
		);
	};

	// Validate if the custom amount is valid
	const isCustomAmountValid = () => {
		const amount = parseFloat(state.customAmount);
		return amount && !isNaN(amount) && amount >= currentPaymentAmount;
	};

	return (
		<motion.div
			key="cash-payment"
			className="absolute inset-0 p-4 space-y-4"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper>
				{/* Split payment indicator */}
				{state.splitMode && (
					<motion.div
						className="p-4 bg-amber-50 text-amber-700 rounded-lg mb-4 flex items-center justify-between"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<div>
							<div className="font-medium">Split Payment</div>
							<div className="text-sm">
								{state.splitDetails?.mode === "equal"
									? `Payment ${
											(state.splitDetails?.currentSplitIndex || 0) + 1
									  } of ${state.splitDetails?.numberOfSplits}`
									: "Custom split amount"}
							</div>
						</div>
						<button
							onClick={handleReturnToSplitView}
							className="px-2 py-1 bg-white text-amber-700 border border-amber-200 rounded-lg text-sm hover:bg-amber-50"
						>
							Change
						</button>
					</motion.div>
				)}

				{/* Error display */}
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

				{/* Amount due display */}
				<div className="p-4 bg-blue-50 text-blue-700 rounded-lg mb-6">
					<div className="font-medium mb-1">Amount Due</div>
					<div className="text-2xl font-bold">
						${currentPaymentAmount.toFixed(2)}
					</div>
					{state.splitMode && remainingAmount !== currentPaymentAmount && (
						<div className="text-sm mt-1">
							Total remaining: ${remainingAmount.toFixed(2)}
						</div>
					)}
				</div>

				{/* Quick amount buttons - improved layout */}
				<div className="space-y-3 mb-6">
					<h4 className="text-sm font-medium text-slate-600 mb-2">
						Quick Amounts
					</h4>

					<div className="grid grid-cols-3 gap-3 mb-2">
						{/* New Exact Amount button */}
						<PaymentButton
							label={`$${currentPaymentAmount.toFixed(2)}`}
							onClick={() => handlePresetAmount(currentPaymentAmount)}
							disabled={
								isProcessing || paymentInProgress || remainingAmount === 0
							}
							className={`bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ${
								isProcessing || paymentInProgress
									? "opacity-50 cursor-not-allowed"
									: ""
							}`}
						/>
						{[5, 10, 20, 50, 100].map((amount) => (
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
				</div>

				{/* Custom amount section - improved layout with balanced row */}
				<div className="space-y-3 mb-6">
					<h4 className="text-sm font-medium text-slate-600 mb-2">
						Custom Amount
					</h4>
					<div className="grid grid-cols-2 gap-3">
						<div className="relative">
							<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
								$
							</span>
							<input
								type="number"
								className="w-full pl-8 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								placeholder="Enter amount"
								min={currentPaymentAmount}
								step="0.01"
								value={state.customAmount}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										customAmount: e.target.value,
									}))
								}
								disabled={
									isProcessing || paymentInProgress || remainingAmount === 0
								}
								onKeyPress={(e) => {
									if (
										e.key === "Enter" &&
										!isProcessing &&
										!paymentInProgress &&
										isCustomAmountValid()
									) {
										handleCustomAmount();
									}
								}}
							/>
						</div>
						<PaymentButton
							label={
								isProcessing || paymentInProgress ? "Processing..." : "Pay"
							}
							variant="primary"
							onClick={handleCustomAmount}
							disabled={
								isProcessing ||
								paymentInProgress ||
								!state.customAmount ||
								!isCustomAmountValid() ||
								remainingAmount === 0
							}
						/>
					</div>
					{state.customAmount &&
						!isCustomAmountValid() &&
						parseFloat(state.customAmount) > 0 && (
							<div className="text-sm text-red-500">
								Amount must be at least ${currentPaymentAmount.toFixed(2)}
							</div>
						)}
				</div>
				{/* Change calculation display */}
				{shouldShowChangeCalculation() && (
					<motion.div
						className="p-4 bg-emerald-50 text-emerald-700 rounded-lg space-y-2 mb-6"
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

				{/* Close drawer button */}
				<PaymentButton
					label={
						isFullyPaid
							? "Close Drawer"
							: `Pay $${remainingAmount.toFixed(2)} More`
					}
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
				splitPayment: PropTypes.bool,
			})
		).isRequired,
		customAmount: PropTypes.string.isRequired,
		pendingPayment: PropTypes.shape({
			amount: PropTypes.number,
			cashTendered: PropTypes.number,
			change: PropTypes.number,
		}),
		splitDetails: PropTypes.shape({
			mode: PropTypes.oneOf(["equal", "custom", "remaining"]),
			numberOfSplits: PropTypes.number,
			customAmount: PropTypes.number,
			currentSplitIndex: PropTypes.number,
			completedSplits: PropTypes.array,
		}),
		nextSplitAmount: PropTypes.number,
		currentSplitMethod: PropTypes.string,
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired,
	handlePayment: PropTypes.func.isRequired,
	setState: PropTypes.func.isRequired,
	isPaymentComplete: PropTypes.func.isRequired,
	completePaymentFlow: PropTypes.func.isRequired,
	handleNavigation: PropTypes.func.isRequired,
};

export default CashPaymentView;
