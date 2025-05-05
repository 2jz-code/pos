// src/features/payment/hooks/usePaymentFlow.js
import { useState, useCallback, useEffect, useRef } from "react";
import { useCartStore } from "../../../store/cartStore";
import { Decimal } from "decimal.js";
import customerDisplayManager from "../../customerDisplay/utils/windowManager";
// *** No longer importing orderService or hardware service here ***
import { toast } from "react-toastify";

const calculatePaymentTotals = (totalAmount, amountPaid) => {
	const remaining = Math.max(
		0,
		new Decimal(totalAmount).minus(new Decimal(amountPaid)).toNumber()
	);
	const taxRate = 0.1; // Assuming fixed 10% tax
	const subtotal = new Decimal(totalAmount).dividedBy(1 + taxRate).toNumber();
	const tax = totalAmount - subtotal;

	return {
		subtotal: subtotal,
		taxAmount: tax,
		payableAmount: totalAmount,
		remainingAmount: remaining,
	};
};

// --- MODIFIED: Re-added onComplete prop ---
export const usePaymentFlow = ({ totalAmount, onComplete, onNewOrder }) => {
	const [state, setState] = useState({
		orderId: useCartStore.getState().orderId,
		currentView: "InitialOptions",
		previousViews: [],
		paymentMethod: null,
		splitMode: false,
		amountPaid: 0,
		transactions: [],
		customAmount: "",
		direction: 1,
		splitDetails: null,
		nextSplitAmount: null,
		currentStepAmount: null,
		currentSplitMethod: null,
		totalTipAmount: 0,
		// Get discount state from cart store
		discountId: useCartStore.getState().discountId,
		discountAmount: useCartStore.getState().discountAmount,
	});
	const [error, setError] = useState(null);
	const [isCompleting, setIsCompleting] = useState(false); // Keep loading state
	const epsilon = 0.01;
	const isMountedRef = useRef(false);

	// --- Mount/Unmount effect & Reset (Keep existing logic) ---
	useEffect(() => {
		isMountedRef.current = true;
		console.log(
			`PaymentFlow Hook: Mounted/totalAmount changed. Resetting state for total: ${totalAmount}`
		);
		// Reset state fully when totalAmount changes (new payment scenario)
		setState({
			orderId: useCartStore.getState().orderId, // Get current/potentially new order ID
			currentView: "InitialOptions",
			previousViews: [],
			paymentMethod: null,
			splitMode: false,
			amountPaid: 0,
			transactions: [],
			customAmount: "",
			direction: 1,
			splitDetails: null,
			nextSplitAmount: null,
			currentStepAmount: null, // Reset new state variable
			currentSplitMethod: null,
			totalTipAmount: 0,
			// Reset discount state as well
			discountId: useCartStore.getState().discountId,
			discountAmount: useCartStore.getState().discountAmount,
		});
		setError(null);
		setIsCompleting(false); // Reset loading state on mount/reset
		return () => {
			isMountedRef.current = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [totalAmount]); // Keep totalAmount as the primary dependency for reset

	// --- Helper Functions (Keep existing logic) ---
	const isPaymentCompleteInternal = useCallback(
		(paidAmount) => {
			const baseTotalRequired = totalAmount;
			// Ensure totalAmount is a valid number before comparison
			if (typeof baseTotalRequired !== "number" || isNaN(baseTotalRequired)) {
				console.error(
					"isPaymentCompleteInternal: Invalid totalAmount",
					totalAmount
				);
				return false; // Cannot determine completeness if total is invalid
			}
			return new Decimal(paidAmount).greaterThanOrEqualTo(
				new Decimal(baseTotalRequired).minus(epsilon)
			);
		},
		[totalAmount, epsilon]
	);
	const resetSplitState = useCallback(() => {
		setState((prev) => ({
			...prev,
			nextSplitAmount: null,
			currentSplitMethod: null,
		}));
	}, []);

	// --- Navigation (Keep existing logic from original file) ---
	// Assuming the original navigation logic was correct and doesn't need changes here
	const handleNavigation = useCallback(
		(nextView, direction = 1, options = {}) => {
			const isFullyPaid = isPaymentCompleteInternal(state.amountPaid);
			console.log("NAVIGATION: Navigating", {
				currentView: state.currentView,
				nextView,
				direction,
				options,
				isFullyPaid,
				splitMode: state.splitMode,
				currentAmountPaid: state.amountPaid,
				currentStepAmountState: state.currentStepAmount,
			});
			if (
				state.splitMode &&
				isFullyPaid &&
				direction < 0 &&
				(state.currentView === "Cash" || state.currentView === "Credit") &&
				nextView !== "Completion"
			) {
				console.log(
					"NAVIGATION: Split complete, navigating to Completion instead of back"
				);
				setState((prev) => ({
					...prev,
					currentView: "Completion",
					previousViews: [...prev.previousViews, prev.currentView],
					direction: 1,
					currentStepAmount: null,
					nextSplitAmount: null,
				}));
				return;
			}
			setState((prev) => {
				let newPaymentMethod = prev.paymentMethod;
				let newSplitMode = prev.splitMode;
				let newNextSplitAmount = prev.nextSplitAmount;
				let newCurrentStepAmount = null;
				if (direction > 0) {
					if (nextView === "Cash" || nextView === "Credit") {
						newPaymentMethod = nextView === "Cash" ? "cash" : "credit";
						if (options.nextSplitAmount !== undefined) {
							newCurrentStepAmount = options.nextSplitAmount;
							console.log(
								`NAVIGATION: Set currentStepAmount from options: ${newCurrentStepAmount}`
							);
							newNextSplitAmount = null;
						} else if (!prev.splitMode) {
							const { remainingAmount: currentRemaining } =
								calculatePaymentTotals(totalAmount, prev.amountPaid);
							newCurrentStepAmount = currentRemaining;
							console.log(
								`NAVIGATION: Set currentStepAmount for non-split: ${newCurrentStepAmount}`
							);
						} else {
							console.warn(
								"NAVIGATION: Forward nav in split mode without nextSplitAmount option."
							);
							newCurrentStepAmount = null;
						}
					} else {
						console.log(
							`NAVIGATION: Forward nav to non-payment view (${nextView}), clearing amounts.`
						);
						newCurrentStepAmount = null;
						newNextSplitAmount = null;
					}
					if (nextView === "Split") newSplitMode = true;
					let newSplitDetails = prev.splitDetails;
					if (newSplitMode && (nextView === "Cash" || nextView === "Credit")) {
						newSplitDetails = {
							...(prev.splitDetails || {}),
							currentSplitIndex: prev.splitDetails?.currentSplitIndex ?? 0,
						};
					} else if (nextView === "Split") {
						newSplitDetails = prev.splitDetails || {
							mode: "remaining",
							currentSplitIndex: 0,
						};
					}
					if (
						prev.currentView === "Split" &&
						isPaymentCompleteInternal(prev.amountPaid) &&
						nextView !== "Completion"
					) {
						console.log(
							"NAVIGATION: Split payment already complete, navigating straight to Completion"
						);
						return {
							...prev,
							currentView: "Completion",
							previousViews: [...prev.previousViews, prev.currentView],
							direction: 1,
							nextSplitAmount: null,
							currentStepAmount: null,
						};
					}
					console.log("NAVIGATION: Updating state for forward move:", {
						nextView,
						newPaymentMethod,
						newSplitMode,
						newCurrentStepAmount,
					});
					return {
						...prev,
						currentView: nextView,
						previousViews: [...prev.previousViews, prev.currentView],
						direction,
						paymentMethod: newPaymentMethod,
						splitMode: newSplitMode,
						splitDetails: newSplitDetails,
						nextSplitAmount: newNextSplitAmount,
						currentStepAmount: newCurrentStepAmount,
					};
				} else {
					const previousViews = [...prev.previousViews];
					const lastView = previousViews.pop() || "InitialOptions";
					console.log(`NAVIGATION: Moving back to: ${lastView}`);
					if (lastView === "InitialOptions" || lastView === "Split")
						newPaymentMethod = null;
					if (lastView === "InitialOptions") newSplitMode = false;
					newCurrentStepAmount = null;
					newNextSplitAmount = null;
					if (lastView === "Split") resetSplitState();
					return {
						...prev,
						currentView: lastView,
						previousViews,
						direction,
						paymentMethod: newPaymentMethod,
						splitMode: newSplitMode,
						nextSplitAmount: newNextSplitAmount,
						currentStepAmount: newCurrentStepAmount,
					};
				}
			});
		},
		[
			state.amountPaid,
			state.splitMode,
			state.currentView,
			state.previousViews,
			state.splitDetails,
			isPaymentCompleteInternal,
			resetSplitState,
			totalAmount,
		]
	);

	const handleBack = useCallback(() => {
		const fromView = state.currentView;
		if (fromView === "InitialOptions") {
			console.log(
				"NAV BACK: Already at InitialOptions, cannot go back further."
			);
			return false;
		}
		if (state.splitMode && (fromView === "Cash" || fromView === "Credit")) {
			if (isPaymentCompleteInternal(state.amountPaid)) {
				console.log(
					"NAV BACK: Split mode but order complete, navigating to Completion"
				);
				handleNavigation("Completion", 1);
			} else {
				console.log(
					"NAV BACK: In split mode (intermediate), navigating POS to Split, Customer Display to Cart."
				);
				try {
					customerDisplayManager.showCart();
				} catch (err) {
					console.error("NAV BACK: Error calling showCart:", err);
				}
				handleNavigation("Split", -1);
			}
			return true;
		}
		if (!state.splitMode && (fromView === "Cash" || fromView === "Credit")) {
			console.log(
				`NAV BACK: Non-split mode from ${fromView}, navigating POS back, Customer Display to Cart.`
			);
			try {
				customerDisplayManager.showCart();
			} catch (err) {
				console.error("NAV BACK: Error calling showCart for non-split:", err);
			}
			handleNavigation(null, -1);
			return true;
		}
		if (fromView === "Split") {
			console.log(
				`NAV BACK: Leaving Split view, navigating POS back, Customer Display to Cart.`
			);
			try {
				customerDisplayManager.showCart();
			} catch (err) {
				console.error(
					"NAV BACK: Error resetting display when leaving Split view:",
					err
				);
			}
			handleNavigation(null, -1);
			return true;
		}
		console.log(`NAV BACK: Generic back navigation from ${fromView}`);
		handleNavigation(null, -1);
		return true;
	}, [
		state.currentView,
		state.splitMode,
		state.amountPaid,
		handleNavigation,
		isPaymentCompleteInternal,
	]);

	// --- PROCESS PAYMENT (Keep existing logic from original file) ---
	// This function updates the internal state (amountPaid, transactions, etc.)
	const processPayment = useCallback(
		async (amountCharged, paymentDetails = {}) => {
			console.log("PROCESS PAYMENT: Start", { amountCharged, paymentDetails });
			let calculatedNewAmountPaid = state.amountPaid;
			let finalUpdatedTransactions = state.transactions;
			let isFullyPaidBeforeThisTx = isPaymentCompleteInternal(state.amountPaid);
			let isNowFullyPaid = isFullyPaidBeforeThisTx;
			try {
				const method =
					paymentDetails.method || state.paymentMethod || "unknown";
				const tipThisTransaction =
					paymentDetails?.flowData?.payment?.tipAmount ??
					paymentDetails?.tipAmount ??
					0;
				const baseAmountThisTransaction = new Decimal(amountCharged)
					.minus(new Decimal(tipThisTransaction))
					.toNumber();
				const validatedBaseAmount = Math.max(0, baseAmountThisTransaction);
				console.log("PROCESS PAYMENT: Calculated amounts", {
					amountCharged,
					baseAmountThisTransaction: validatedBaseAmount,
					tipThisTransaction,
					method,
					splitMode: state.splitMode,
					isFullyPaidBeforeThisTx,
				});
				const newTransaction = {
					method: method,
					amount: parseFloat(amountCharged.toFixed(2)),
					baseAmountPaid: parseFloat(validatedBaseAmount.toFixed(2)),
					tipAmount: parseFloat(tipThisTransaction.toFixed(2)),
					status: "completed",
					timestamp: new Date().toISOString(),
					...(method === "cash" && {
						cashTendered: paymentDetails.cashTendered,
						change: paymentDetails.change,
					}),
					...(method === "credit" && {
						cardInfo: paymentDetails.cardInfo || {},
						transactionId: paymentDetails.transactionId || null,
						flowData: paymentDetails.flowData,
					}),
					...(state.splitMode &&
						state.splitDetails && {
							splitDetailsContext: {
								mode: state.splitDetails.mode,
								numberOfSplits: state.splitDetails.numberOfSplits,
								currentSplitIndex: state.splitDetails.currentSplitIndex ?? 0,
								stepAmountTarget: state.currentStepAmount,
							},
						}),
				};
				console.log(
					"PROCESS PAYMENT: Created Transaction Object:",
					newTransaction
				);
				let intermediateState = null;
				setState((prev) => {
					const baseAmount = newTransaction.baseAmountPaid || 0;
					const tipAmount = newTransaction.tipAmount || 0;
					calculatedNewAmountPaid = new Decimal(prev.amountPaid)
						.plus(new Decimal(baseAmount))
						.toNumber();
					const calculatedNewTotalTip = new Decimal(prev.totalTipAmount)
						.plus(new Decimal(tipAmount))
						.toNumber();
					finalUpdatedTransactions = [...prev.transactions, newTransaction];
					isNowFullyPaid = isPaymentCompleteInternal(calculatedNewAmountPaid);
					let updatedOverallSplitDetails = prev.splitDetails;
					if (prev.splitMode) {
						const currentSplitIndex = prev.splitDetails?.currentSplitIndex ?? 0;
						updatedOverallSplitDetails = {
							...(prev.splitDetails || {}),
							currentSplitIndex: currentSplitIndex + 1,
							remainingAmount: Math.max(
								0,
								new Decimal(totalAmount)
									.minus(new Decimal(calculatedNewAmountPaid))
									.toNumber()
							),
							completedSplits: [
								...(prev.splitDetails?.completedSplits || []),
								{
									method: newTransaction.method,
									amount: newTransaction.baseAmountPaid,
									tip: newTransaction.tipAmount,
									index: currentSplitIndex,
									timestamp: newTransaction.timestamp,
								},
							],
						};
					}
					intermediateState = {
						...prev,
						amountPaid: calculatedNewAmountPaid,
						totalTipAmount: calculatedNewTotalTip,
						transactions: finalUpdatedTransactions,
						splitDetails: updatedOverallSplitDetails,
						currentSplitMethod: null,
					};
					console.log("PROCESS PAYMENT: State update calculation complete", {
						calculatedNewAmountPaid,
						isNowFullyPaid,
					});
					return intermediateState;
				});
				console.log(
					`PROCESS PAYMENT: After state update attempt - isNowFullyPaid=${isNowFullyPaid}, newAmountPaid=${calculatedNewAmountPaid}`
				);
				return {
					success: true,
					newAmountPaid: calculatedNewAmountPaid,
					updatedTransactions: finalUpdatedTransactions,
					isNowComplete: isNowFullyPaid,
				};
			} catch (error) {
				console.error("PROCESS PAYMENT: Error:", error);
				setError(error.message || "Processing failed");
				return { success: false, error: error.message || "Processing failed" };
			}
		},
		[state, totalAmount, isPaymentCompleteInternal] // Removed state.paymentMethod, state.splitDetails, state.currentStepAmount as they are accessed within setState
	);

	// --- MODIFIED: Complete Payment Flow (Calls onComplete prop) ---
	const completePaymentFlow = useCallback(
		async (finalTransactions) => {
			setIsCompleting(true);
			setError(null);

			if (!finalTransactions || !Array.isArray(finalTransactions)) {
				setError("Internal error: Transaction data missing for completion.");
				setIsCompleting(false);
				return null; // Return null on failure
			}

			const currentBasePaidFromTxns = finalTransactions.reduce(
				(sum, tx) => sum + (tx.baseAmountPaid || 0),
				0
			);
			const currentTotalTipFromTxns = finalTransactions.reduce(
				(sum, tx) => sum + (tx.tipAmount || 0),
				0
			);
			const isFullyPaid = isPaymentCompleteInternal(currentBasePaidFromTxns);

			if (!isFullyPaid) {
				setError("Base payment amount is not fully complete.");
				setIsCompleting(false);
				return null; // Return null on failure
			}

			const orderId = state.orderId || useCartStore.getState().orderId;
			if (!orderId) {
				setError("Internal error: Order ID missing.");
				setIsCompleting(false);
				return null; // Return null on failure
			}

			// Build payload for the onComplete callback
			const paymentPayload = {
				transactions: finalTransactions,
				totalPaid: currentBasePaidFromTxns + currentTotalTipFromTxns,
				baseAmountPaid: currentBasePaidFromTxns,
				totalTipAmount: currentTotalTipFromTxns,
				paymentMethod: state.splitMode ? "split" : state.paymentMethod,
				splitPayment: state.splitMode,
				splitDetails: state.splitMode ? state.splitDetails : null,
				orderId: orderId,
				completed_at: new Date().toISOString(),
				discount_id: state.discountId,
				discount_amount: state.discountAmount?.toFixed(2),
			};

			try {
				console.log(
					`COMPLETE FLOW (Hook): Calling onComplete prop for Order ID: ${orderId}`
				);
				console.log(
					"COMPLETE FLOW (Hook): Payload for onComplete:",
					JSON.stringify(paymentPayload, null, 2)
				);

				// --- Call the onComplete Prop ---
				if (typeof onComplete !== "function") {
					throw new Error(
						"onComplete prop is not a function or was not provided."
					);
				}
				const completedOrderData = await onComplete(orderId, paymentPayload); // Pass orderId and payload

				// Check the result from onComplete
				if (completedOrderData) {
					// Assuming onComplete returns order data on success
					console.log("COMPLETE FLOW (Hook): onComplete prop successful.");
					// Clear sensitive/temporary state AFTER successful completion
					useCartStore.getState().setRewardsProfile(null);
					useCartStore.getState().clearLocalOrderDiscountState();
					setIsCompleting(false);
					return completedOrderData; // <<<--- RETURN ORDER DATA ON SUCCESS
				} else {
					console.error(
						"COMPLETE FLOW (Hook): onComplete prop failed or returned null/false."
					);
					setError("Failed to finalize order."); // Set a generic error
					setIsCompleting(false);
					return null; // <<<--- RETURN NULL ON FAILURE
				}
			} catch (error) {
				console.error(
					"COMPLETE FLOW (Hook): Error calling onComplete prop:",
					error
				);
				const errorMsg =
					error?.message || "Error completing order via onComplete.";
				setError(errorMsg);
				toast.error(`Completion Failed: ${errorMsg}`);
				setIsCompleting(false);
				return null; // <<<--- RETURN NULL ON FAILURE
			}
		},
		[
			// Dependencies
			state.paymentMethod,
			state.splitMode,
			state.splitDetails,
			state.orderId,
			state.discountId,
			state.discountAmount,
			totalAmount,
			epsilon,
			isPaymentCompleteInternal,
			onComplete, // Add onComplete dependency
		]
	);

	// --- Start New Order (Keep existing logic) ---
	const handleStartNewOrder = useCallback(async () => {
		try {
			console.log("Starting new order from payment flow hook");
			await onNewOrder?.();
			// Reset state fully after new order is started by parent
			setState({
				orderId: useCartStore.getState().orderId,
				currentView: "InitialOptions",
				previousViews: [],
				paymentMethod: null,
				splitMode: false,
				amountPaid: 0,
				transactions: [],
				customAmount: "",
				direction: 1,
				splitDetails: null,
				nextSplitAmount: null,
				currentStepAmount: null,
				currentSplitMethod: null,
				totalTipAmount: 0,
				discountId: useCartStore.getState().discountId,
				discountAmount: useCartStore.getState().discountAmount,
			});
			setIsCompleting(false); // Reset loading state
			useCartStore.getState().clearLocalOrderDiscountState();
			useCartStore.getState().setRewardsProfile(null);
		} catch (error) {
			console.error("Error starting new order in payment flow hook:", error);
		}
	}, [onNewOrder]); // Dependency

	// Expose the public check using the current state
	const isPaymentCompletePublic = useCallback(() => {
		return isPaymentCompleteInternal(state.amountPaid);
	}, [state.amountPaid, isPaymentCompleteInternal]);

	return {
		state,
		setState,
		error,
		isCompleting, // Expose loading state
		handleNavigation,
		handleBack,
		processPayment,
		completePaymentFlow, // Now calls onComplete prop and returns its result
		isPaymentComplete: isPaymentCompletePublic,
		handleStartNewOrder,
		resetSplitState,
	};
};
