import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
const { pageVariants, pageTransition } = paymentAnimations;
import { useReceiptPrinter } from "../../../hooks/useReceiptPrinter";
import { useCustomerFlow } from "../../../features/customerDisplay/hooks/useCustomerFlow";
import customerDisplayManager from "../../../features/customerDisplay/utils/windowManager";
import { useCartStore } from "../../../store/cartStore";
// import { calculateCartTotals } from "../../cart/utils/cartCalculations";
import { formatReceiptData } from "../../../utils/receiptUtils";
import { formatPrice } from "../../../utils/numberUtils";
import { XCircleIcon } from "@heroicons/react/24/solid";

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
		isProcessing: isPrinterProcessing,
		error: printerError,
		isConnected: isPrinterConnected,
		printReceipt,
	} = useReceiptPrinter();

	const [error, setError] = useState(null);
	const [paymentInProgress, setPaymentInProgress] = useState(false);
	const { updateFlowData, flowActive, startFlow, completeFlow } =
		useCustomerFlow();
	const displayError = printerError || error;
	const [hasBeenMounted, setHasBeenMounted] = useState(false);
	const epsilon = 0.01;
	const isFullyPaid = remainingAmount <= epsilon;

	useEffect(() => {
		setHasBeenMounted(true);
		return () => {
			if (hasBeenMounted) {
				console.log(
					"CashPaymentView unmounting, attempting reset to cart display"
				);
				try {
					// Ensure the manager method exists before calling
					if (typeof customerDisplayManager.showWelcome === "function") {
						const cart = useCartStore.getState().cart;
						if (cart && cart.length > 0) {
							// Consider if showCart is more appropriate here if needed
							customerDisplayManager.showCart();
						} else {
							customerDisplayManager.showWelcome();
						}
					} else {
						console.warn(
							"customerDisplayManager.showWelcome or showCart not found on unmount."
						);
					}
				} catch (err) {
					console.error("Error resetting customer display on unmount:", err);
				}
			}
		};
	}, [hasBeenMounted]); // Keep hasBeenMounted dependency here

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
			isPrinterProcessing,
			paymentInProgress,
			isPrinterConnected,
		});
	}, [isPrinterProcessing, paymentInProgress, isPrinterConnected]);

	useEffect(() => {
		console.log(
			"CashPaymentView Mounted: Sending initial state to customer display."
		);

		// Prepare initial cash data based on the state when mounting
		const initialCashData = {
			cashTendered: 0, // No cash tendered at mount
			change: 0, // No change at mount
			// Amount paid *before* entering this cash view
			amountPaid: state.amountPaid || 0,
			// The amount currently due for this cash step
			remainingAmount: currentPaymentAmount,
			// Determine if already paid before entering (e.g., rounding adjustment)
			isFullyPaid: currentPaymentAmount < 0.01,
			isSplitPayment: state.splitMode,
		};

		// Prepare order data needed by CashFlowView
		const initialOrderData = {
			subtotal: null, // Add if available and needed
			tax: null, // Add if available and needed
			total: currentPaymentAmount, // Amount due now
			discountAmount: null, // Add if available and needed
			isSplitPayment: state.splitMode,
			// Calculate originalTotal if in split mode and data is available
			originalTotal: state.splitMode
				? remainingAmount + state.amountPaid
				: currentPaymentAmount,
		};

		// Construct the CONTENT object for the direct message
		const initialMessageContent = {
			currentStep: "payment", // Set the correct step
			paymentMethod: "cash", // Set the correct method
			cashData: initialCashData, // Include initial cash state
			orderData: initialOrderData, // Include initial order context for display
			displayMode: "flow", // Set the correct display mode
			isSplitPayment: state.splitMode,
			splitDetails: state.splitDetails,
			orderId: state.orderId,
		};

		try {
			// Call the window manager method added previously
			customerDisplayManager.sendDirectCashUpdateMessage(initialMessageContent);
			console.log(
				"Initial cash view state sent to customer display via windowManager."
			);
		} catch (err) {
			console.error(
				"Error sending initial cash view state via windowManager:",
				err
			);
		}

		// Empty dependency array ensures this runs only once after the component mounts
	}, []);

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
		const relevantAmount = state.splitMode
			? currentPaymentAmount
			: remainingAmount;
		const isCurrentSplitPaid = totalAmount >= relevantAmount;
		const isTotalFullyPaid = isFullyPaid;

		return {
			totalTendered,
			totalChange,
			totalAmount,
			isCurrentSplitPaid,
			isFullyPaid: isTotalFullyPaid,
			relevantAmount,
			totalRemainingAmount: remainingAmount,
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

	// const handleReturnToSplitView = useCallback(() => {
	// 	handleNavigation("Split", -1);
	// }, [handleNavigation]);

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
				// Construct the CONTENT object for the message
				const messageContent = {
					currentStep: "payment",
					paymentMethod: "cash",
					cashData: cashData, // The calculated cashData object
					displayMode: "flow",
					isSplitPayment: state.splitMode,
					splitDetails: state.splitDetails,
					orderId: state.orderId, // Ensure orderId is included if needed
				};

				// Call the new window manager method with the content
				customerDisplayManager.sendDirectCashUpdateMessage(messageContent);
				console.log("Direct cash update message sent via windowManager");
			} catch (err) {
				console.error(
					"Error sending direct cash update message via windowManager:",
					err
				);
			}
		} catch (err) {
			setError(err.message || "Failed to process payment");
			console.error("Preset amount payment error:", err);
		} finally {
			setPaymentInProgress(false);
		}
	};

	const handleCustomAmount = async () => {
		const amount = parseFloat(state.customAmount);
		if (!amount || isNaN(amount) || amount <= 0) {
			setError("Please enter a valid amount");
			return;
		}
		if (amount < currentPaymentAmount) {
			setError(`Amount must be at least $${currentPaymentAmount.toFixed(2)}`);
			return;
		}
		setError(null);
		setPaymentInProgress(true);
		try {
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
				// Construct the CONTENT object for the message
				const messageContent = {
					currentStep: "payment",
					paymentMethod: "cash",
					cashData: cashData, // The calculated cashData object
					displayMode: "flow",
					isSplitPayment: state.splitMode,
					splitDetails: state.splitDetails,
					orderId: state.orderId, // Ensure orderId is included if needed
				};

				// Call the new window manager method with the content
				customerDisplayManager.sendDirectCashUpdateMessage(messageContent);
				console.log("Direct cash update message sent via windowManager");
			} catch (err) {
				console.error(
					"Error sending direct cash update message via windowManager:",
					err
				);
			}
			setState((prev) => ({ ...prev, customAmount: "" }));
		} catch (err) {
			setError(err.message || "Failed to process payment");
			console.error("Custom amount payment error:", err);
		} finally {
			setPaymentInProgress(false);
		}
	};

	const navigateToSplitView = () => {
		console.log("DIRECT NAVIGATION: Force navigating back to split view");
		if (flowActive) {
			completeFlow();
		}
		setPaymentInProgress(false);
		setError(null);
		setTimeout(() => {
			console.log("DIRECT NAVIGATION: Executing navigation to split view now");
			handleNavigation("Split", -1);
		}, 1000);
	};
	const getLatestCashDetails = () => {
		const latestTransaction = getLatestTransaction();
		return {
			cashTendered: latestTransaction?.cashTendered || 0,
			change: latestTransaction?.change || 0,
		};
	};

	const handlePaymentCompletionAndPrint = async () => {
		setError(null);
		console.log("=== PAYMENT COMPLETION START (Using receiptUtils) ===");
		try {
			const isAllPaymentsComplete = remainingAmount <= epsilon;
			console.log("Completion check:", {
				isAllPaymentsComplete,
				isSplitMode: state.splitMode,
			});

			if (state.splitMode && !isAllPaymentsComplete) {
				console.log("SPLIT: Partial payment complete. Navigating back.");
				setTimeout(navigateToSplitView, 500);
			} else {
				console.log("COMPLETE: Preparing final receipt.");
				try {
					console.log("Preparing receipt data using formatReceiptData...");
					const latestCash = getLatestCashDetails();
					const paymentDetailsForReceipt = {
						orderId: state.orderId,
						paymentMethod: "cash",
						isSplitPayment: state.splitMode,
						cashData: {
							cashTendered: latestCash.cashTendered,
							change: latestCash.change,
						},
						transactions: state.transactions, // Pass transactions to formatter
					};
					const formattedReceiptData = formatReceiptData(
						paymentDetailsForReceipt
					);
					console.log("Formatted Receipt Data:", formattedReceiptData);
					if (!formattedReceiptData)
						throw new Error("Failed to format receipt data.");

					console.log("Calling printReceipt with open_drawer: true...");
					await printReceipt({
						receipt_data: formattedReceiptData,
						open_drawer: true,
					});
					console.log("printReceipt call successful.");

					console.log("Completing payment flow...");
					// *** FIX: Pass state.transactions to completePaymentFlow ***
					const success = await completePaymentFlow(state.transactions);
					if (success) {
						console.log("Payment completed, navigating.");
						handleNavigation("Completion");
					} else {
						console.error("Failed to complete payment flow.");
						setError("Order finalization failed.");
					}
				} catch (printOrCompleteError) {
					console.error("Error during print/complete:", printOrCompleteError);
					// Check if the error message is the one we identified, otherwise show generic
					if (
						printOrCompleteError.message ===
						"Receipt data is missing in payload"
					) {
						setError(
							"Internal error: Failed to prepare receipt data for printing."
						);
					} else {
						setError(`Operation failed: ${printOrCompleteError.message}.`);
					}
					// Attempt completion even if printing fails (might be backend issue)
					try {
						// Only try final completion if all payments are actually done
						if (isAllPaymentsComplete) {
							console.warn(
								"Print failed, attempting order completion anyway..."
							);
							// *** FIX: Pass state.transactions here too ***
							const success = await completePaymentFlow(state.transactions);
							if (success) handleNavigation("Completion");
						} else if (state.splitMode) {
							// If print failed in split mode but the current split is paid, still navigate back
							console.warn(
								"Print failed during split, navigating back to split view."
							);
							setTimeout(navigateToSplitView, 500);
						}
					} catch (compErr) {
						console.error("Completion also failed after print error:", compErr);
						// Ensure the most relevant error (print or completion) is shown
						if (!error) {
							setError(
								compErr.message ||
									"Order finalization failed after print error."
							);
						}
					}
				}
			}
		} catch (err) {
			console.error("Error during payment completion prep:", err);
			setError(err.message || "Failed completion prep");
		}
		console.log("=== PAYMENT COMPLETION END ===");
	};

	const canCompleteAndPrint = () => {
		const hasValidTransaction = shouldShowChangeCalculation();
		const transactionTotals = getTransactionTotals();
		const isCurrentSplitPaid =
			state.splitMode && transactionTotals?.isCurrentSplitPaid;
		const isFullPayment = !state.splitMode && isFullyPaid;
		const canProceed =
			(isCurrentSplitPaid || isFullPayment) &&
			hasValidTransaction &&
			!isPrinterProcessing;
		console.log("canCompleteAndPrint check:", {
			isCurrentSplitPaid,
			isFullPayment,
			hasValidTransaction,
			isPrinterProcessing,
		});
		return canProceed;
	};

	const isCustomAmountValid = () => {
		const amount = parseFloat(state.customAmount);
		return amount && !isNaN(amount) && amount >= currentPaymentAmount;
	};

	const latestCashDisplay = getTransactionTotals() || {
		totalTendered: 0,
		totalChange: 0,
	};

	return (
		<motion.div
			key="cash-payment-ui" // Unique key
			className="absolute inset-0 p-4 flex flex-col bg-slate-50" // Match background
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper className="space-y-4">
				{" "}
				{/* Add spacing */}
				{/* Printer Status */}
				<div className="text-xs text-slate-500 mb-2">
					Printer Status:{" "}
					<span
						className={`font-medium ${
							isPrinterConnected ? "text-green-600" : "text-red-600"
						}`}
					>
						{isPrinterConnected
							? isPrinterProcessing
								? "Busy..."
								: "Connected"
							: "Disconnected"}
					</span>
				</div>
				{/* Error Display */}
				{displayError && (
					<motion.div
						className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-start gap-2 text-sm shadow-sm"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<XCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
						<span>{displayError}</span>
					</motion.div>
				)}
				{/* Amount Due Box */}
				<div className="p-4 bg-blue-50 text-blue-700 rounded-lg shadow">
					<div className="font-medium mb-1 text-blue-800">Amount Due</div>
					<div className="text-3xl font-bold text-blue-900">
						{formatPrice(currentPaymentAmount)}
					</div>
					{/* Show total remaining only if in split mode and it differs */}
					{state.splitMode &&
						Math.abs(remainingAmount - currentPaymentAmount) > epsilon && (
							<div className="text-xs mt-1 text-blue-600">
								Total Order Remaining: {formatPrice(remainingAmount)}
							</div>
						)}
				</div>
				{/* Quick Amounts Section */}
				<div className="space-y-2">
					<h4 className="text-sm font-medium text-slate-600">Quick Amounts</h4>
					<div className="grid grid-cols-3 gap-3">
						{/* Exact Amount Button */}
						<PaymentButton
							label={formatPrice(currentPaymentAmount)}
							onClick={() => handlePresetAmount(currentPaymentAmount)}
							disabled={
								isPrinterProcessing ||
								paymentInProgress ||
								currentPaymentAmount <= 0
							}
							// Style like other quick amounts but maybe slightly highlighted
							className={`bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 ${
								isPrinterProcessing || paymentInProgress
									? "opacity-50 cursor-not-allowed"
									: ""
							}`}
						/>
						{/* Preset Dollar Amounts */}
						{[5, 10, 20, 50, 100].map((amount) => (
							<PaymentButton
								key={amount}
								label={`$${amount}`}
								onClick={() => handlePresetAmount(amount)}
								disabled={
									isPrinterProcessing ||
									paymentInProgress ||
									currentPaymentAmount <= 0
								}
								// Standard default button style
								variant="default"
								className={
									isPrinterProcessing || paymentInProgress
										? "opacity-50 cursor-not-allowed"
										: ""
								}
							/>
						))}
					</div>
				</div>
				{/* Custom Amount Section */}
				<div className="space-y-2">
					<h4 className="text-sm font-medium text-slate-600">Custom Amount</h4>
					<div className="grid grid-cols-2 gap-3">
						<div className="relative">
							<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
								$
							</span>
							{/* Input field styled like the image */}
							<input
								type="number"
								className="w-full pl-7 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-right disabled:opacity-50 disabled:bg-slate-100" // Added text-right
								placeholder="Enter amount"
								min={state.splitMode ? 0.01 : currentPaymentAmount} // Min amount logic
								step="0.01"
								value={state.customAmount}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										customAmount: e.target.value,
									}))
								}
								disabled={
									isPrinterProcessing ||
									paymentInProgress ||
									currentPaymentAmount <= 0
								}
								onKeyPress={(e) => {
									if (
										e.key === "Enter" &&
										!isPrinterProcessing &&
										!paymentInProgress &&
										isCustomAmountValid()
									) {
										handleCustomAmount();
									}
								}}
							/>
						</div>
						{/* Pay Button styled like the image */}
						<PaymentButton
							label={paymentInProgress ? "Processing..." : "Pay"}
							variant="primary" // Blue button
							onClick={handleCustomAmount}
							disabled={
								isPrinterProcessing ||
								paymentInProgress ||
								!state.customAmount ||
								!isCustomAmountValid() || // Use validation function
								currentPaymentAmount <= 0
							}
							className="py-3" // Match height of input
						/>
					</div>
					{/* Validation message */}
					{state.customAmount &&
						!isCustomAmountValid() &&
						parseFloat(state.customAmount) > 0 && (
							<div className="text-xs text-red-500 pl-1">
								Amount must be at least{" "}
								{state.splitMode ? "$0.01" : formatPrice(currentPaymentAmount)}
							</div>
						)}
				</div>
				{/* Change Due Display */}
				{shouldShowChangeCalculation() && (
					<motion.div
						className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg space-y-2 shadow-sm"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<div className="flex justify-between items-center text-sm">
							<span className="font-medium">Total Cash Tendered:</span>
							<span className="font-semibold">
								{formatPrice(latestCashDisplay.totalTendered)}
							</span>
						</div>
						<div className="flex justify-between items-center font-bold text-lg">
							<span>Change Due:</span>
							<span>{formatPrice(latestCashDisplay.totalChange)}</span>
						</div>
						{/* Optionally show remaining balance if relevant */}
						{remainingAmount > epsilon && (
							<div className="flex justify-between items-center text-xs text-emerald-700 pt-1 border-t border-emerald-100 mt-2">
								<span>Remaining Order Balance:</span>
								<span>{formatPrice(remainingAmount)}</span>
							</div>
						)}
					</motion.div>
				)}
				{/* Buttons at the bottom */}
				<div className="mt-auto pt-4 border-t border-slate-200 space-y-3 flex-shrink-0">
					{/* Complete Payment Button */}
					<PaymentButton
						label={
							state.splitMode && !isFullyPaid
								? "Continue Split" // Label changes if it's an intermediate split step
								: "Complete Payment"
						}
						variant="primary" // Blue button
						onClick={handlePaymentCompletionAndPrint}
						disabled={!canCompleteAndPrint()} // Use validation function
						className={`w-full py-3 text-base ${
							!canCompleteAndPrint() ? "opacity-50 cursor-not-allowed" : ""
						}`}
					/>

					{/* Manual Print Button */}
					<PaymentButton
						label="Print Receipt (Manual Test)"
						variant="default" // White button
						onClick={() => {
							// (Existing manual print logic - unchanged)
							const testItem = {
								product_name: "Test Item",
								quantity: 1,
								unit_price: 1.0,
							};
							const testSubtotal = 1.0;
							const testTax = testSubtotal * 0.1;
							const testTotal = testSubtotal + testTax;
							const manualReceiptData = {
								id: state.orderId || Math.floor(Date.now() / 1000),
								timestamp: new Date().toISOString(),
								items: [testItem],
								subtotal: testSubtotal,
								tax: testTax,
								total_price: testTotal,
								payment: {
									method: "cash",
									amount_tendered: testTotal,
									change: 0,
								},
								open_drawer: false,
								store_name: "Test Store",
								store_address: "Test Address",
								store_phone: "Test Phone",
							};
							printReceipt({
								receipt_data: manualReceiptData,
								open_drawer: false,
							})
								.then(() => console.log("Manual receipt print successful"))
								.catch((err) =>
									console.error("Manual receipt print failed:", err)
								);
						}}
						className="w-full py-3 text-base" // Match styling
						disabled={isPrinterProcessing || !isPrinterConnected}
					/>
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
	// --- END OF UI UPDATES ---
};

CashPaymentView.propTypes = {
	state: PropTypes.shape({
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		transactions: PropTypes.array.isRequired,
		customAmount: PropTypes.string.isRequired,
		splitDetails: PropTypes.object,
		nextSplitAmount: PropTypes.number,
		currentSplitMethod: PropTypes.string,
		totalTipAmount: PropTypes.number,
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired,
	handlePayment: PropTypes.func.isRequired,
	setState: PropTypes.func.isRequired,
	completePaymentFlow: PropTypes.func.isRequired,
	handleNavigation: PropTypes.func.isRequired,
};

export default CashPaymentView;
