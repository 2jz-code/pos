// src/features/payment/hooks/usePaymentFlow.js
import { useState, useCallback, useEffect, useRef } from "react";
import { useCartStore } from "../../../store/cartStore";
import { Decimal } from "decimal.js";

export const usePaymentFlow = ({ totalAmount, onComplete, onNewOrder }) => {
	const [state, setState] = useState({
		orderId: useCartStore.getState().orderId,
		currentView: "InitialOptions",
		previousViews: [],
		paymentMethod: null,
		splitMode: false,
		amountPaid: 0, // Tracks cumulative base amount paid towards totalAmount
		transactions: [],
		customAmount: "",
		direction: 1,
		splitDetails: null,
		nextSplitAmount: null,
		currentSplitMethod: null,
		totalTipAmount: 0, // Tracks cumulative tip
	});
	const [error, setError] = useState(null);
	// Removed isProcessing state as it wasn't reliably used across async operations
	const epsilon = 0.01;
	const isMountedRef = useRef(false);

	// Mount/Unmount effect & Reset on totalAmount change
	useEffect(() => {
		isMountedRef.current = true;
		console.log(
			`PaymentFlow Hook: Mounted/totalAmount changed. Resetting state for total: ${totalAmount}`
		);
		setState({
			orderId: useCartStore.getState().orderId, // Keep current orderId
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
			currentSplitMethod: null,
			totalTipAmount: 0,
		});
		setError(null); // Clear error on reset
		return () => {
			isMountedRef.current = false;
		};
	}, [totalAmount]); // Dependency is totalAmount

	// --- Helper Functions ---
	// Internal helper to check completion based on a given amount
	const isPaymentCompleteInternal = useCallback(
		(paidAmount) => {
			const baseTotalRequired = totalAmount;
			const isComplete = new Decimal(paidAmount).greaterThanOrEqualTo(
				new Decimal(baseTotalRequired).minus(epsilon)
			);
			return isComplete;
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

	// --- Navigation ---
	const handleNavigation = useCallback(
		(nextView, direction = 1) => {
			// Check completion using the current state's amountPaid
			const isFullyPaid = isPaymentCompleteInternal(state.amountPaid);

			console.log("NAVIGATION: Navigating", {
				nextView,
				direction,
				isFullyPaid,
				splitMode: state.splitMode,
			});

			// --- Logic for preventing back navigation if split is fully paid ---
			if (
				state.splitMode &&
				isFullyPaid &&
				direction < 0 &&
				(state.currentView === "Cash" || state.currentView === "Credit") &&
				nextView !== "Completion"
			) {
				console.log(
					"NAVIGATION: All split payments complete, going to completion view instead of back"
				);
				setState((prev) => ({
					...prev,
					currentView: "Completion",
					previousViews: [...prev.previousViews, prev.currentView],
					direction: 1,
				}));
				return;
			}
			// --- End back navigation prevention ---

			// --- Standard Navigation Logic ---
			setState((prev) => {
				let newPaymentMethod = prev.paymentMethod;
				let newSplitMode = prev.splitMode;

				if (direction > 0) {
					// Moving forward
					if (nextView === "Cash") newPaymentMethod = "cash";
					if (nextView === "Credit") newPaymentMethod = "credit";
					if (nextView === "Split") newSplitMode = true;

					let newSplitDetails = prev.splitDetails;
					if (newSplitMode && (nextView === "Cash" || nextView === "Credit")) {
						newSplitDetails = {
							...(prev.splitDetails || {}),
							currentSplitIndex: prev.splitDetails?.currentSplitIndex ?? 0, // Ensure index starts at 0
						};
					}

					// Check for completion *before* moving from Split view forward
					if (prev.currentView === "Split" && isFullyPaid) {
						console.log(
							"NAVIGATION: Split payment complete, navigating to Completion"
						);
						return {
							...prev,
							currentView: "Completion",
							previousViews: [...prev.previousViews, prev.currentView],
							direction: 1,
						};
					}
					// Normal forward move
					return {
						...prev,
						currentView: nextView,
						previousViews: [...prev.previousViews, prev.currentView],
						direction,
						paymentMethod: newPaymentMethod,
						splitMode: newSplitMode,
						splitDetails: newSplitDetails,
					};
				} else {
					// Moving back
					const previousViews = [...prev.previousViews];
					const lastView = previousViews.pop() || "InitialOptions";
					if (lastView === "InitialOptions" || lastView === "Split")
						newPaymentMethod = null;
					if (lastView === "InitialOptions") newSplitMode = false;
					if (nextView === "Split" || lastView === "Split") resetSplitState(); // Reset next amount when going back TO or FROM split view

					return {
						...prev,
						currentView: lastView,
						previousViews,
						direction,
						paymentMethod: newPaymentMethod,
						splitMode: newSplitMode,
					};
				}
			});
			// --- End Standard Navigation ---
		},
		[
			state.splitMode,
			state.currentView,
			state.previousViews,
			state.amountPaid,
			resetSplitState,
			isPaymentCompleteInternal,
		]
	);

	const handleBack = useCallback(() => {
		if (state.currentView === "InitialOptions") return false;
		// Use internal helper for checks during navigation logic
		if (
			state.splitMode &&
			(state.currentView === "Cash" || state.currentView === "Credit")
		) {
			if (isPaymentCompleteInternal(state.amountPaid)) {
				console.log(
					"NAV BACK: Split complete, navigating to Completion instead of Split"
				);
				handleNavigation("Completion", 1);
			} else {
				console.log("NAV BACK: In split mode, navigating back to Split view");
				handleNavigation("Split", -1);
			}
			return true;
		}
		handleNavigation(null, -1); // Normal back
		return true;
	}, [
		state.currentView,
		state.splitMode,
		state.amountPaid,
		handleNavigation,
		isPaymentCompleteInternal,
	]);

	// --- PROCESS PAYMENT ---
	const processPayment = useCallback(
		async (amountCharged, paymentDetails = {}) => {
			console.log("PROCESS PAYMENT: Received amountCharged:", amountCharged);
			console.log(
				"PROCESS PAYMENT: Received paymentDetails:",
				JSON.stringify(paymentDetails, null, 2)
			);

			let calculatedNewAmountPaid = state.amountPaid; // Initialize with current value
			let finalUpdatedTransactions = state.transactions; // Initialize with current value
			let isNowFullyPaid = isPaymentCompleteInternal(calculatedNewAmountPaid); // Check initial state

			try {
				const method =
					paymentDetails.method || state.paymentMethod || "unknown";
				const tipThisTransaction =
					paymentDetails?.flowData?.payment?.tipAmount ?? 0;
				const baseAmountThisTransaction = new Decimal(amountCharged)
					.minus(new Decimal(tipThisTransaction))
					.toNumber();
				const validatedBaseAmount = Math.max(0, baseAmountThisTransaction);

				console.log("PROCESS PAYMENT: Processing payment:", {
					amountCharged,
					baseAmountThisTransaction: validatedBaseAmount,
					tipThisTransaction,
					method,
					splitMode: state.splitMode,
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
							splitDetails: {
								mode: state.splitDetails.mode,
								numberOfSplits: state.splitDetails.numberOfSplits,
								customAmount: state.splitDetails.customAmount,
								currentSplitIndex: state.splitDetails.currentSplitIndex ?? 0,
							},
						}),
				};
				console.log(
					"PROCESS PAYMENT: Created Transaction Object:",
					newTransaction
				);

				// Use a functional update to ensure calculations are based on the latest state
				// before this specific update is applied.
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
					finalUpdatedTransactions = [...prev.transactions, newTransaction]; // Correct list for return

					// *** Check completion using the newly calculated amount ***
					isNowFullyPaid = isPaymentCompleteInternal(calculatedNewAmountPaid);

					let updatedOverallSplitDetails = prev.splitDetails;
					if (prev.splitMode) {
						const currentSplitIndex = prev.splitDetails?.currentSplitIndex ?? 0;
						updatedOverallSplitDetails = {
							...(prev.splitDetails || {}),
							currentSplitIndex: currentSplitIndex + 1,
							remainingAmount: new Decimal(totalAmount)
								.minus(new Decimal(calculatedNewAmountPaid))
								.toNumber(),
							completedSplits: [
								...(prev.splitDetails?.completedSplits || []),
								{
									method: newTransaction.method,
									amount: newTransaction.baseAmountPaid,
									tip: newTransaction.tipAmount,
									index: currentSplitIndex,
								},
							],
						};
					}

					intermediateState = {
						// Store the calculated state
						...prev,
						amountPaid: calculatedNewAmountPaid,
						totalTipAmount: calculatedNewTotalTip,
						transactions: finalUpdatedTransactions,
						splitDetails: updatedOverallSplitDetails,
						nextSplitAmount: null,
						currentSplitMethod: null,
					};
					return intermediateState;
				});

				// Now that setState has likely completed (though still technically async),
				// log the final derived state for this operation.
				console.log(
					`PROCESS PAYMENT: After state update attempt - isNowFullyPaid=${isNowFullyPaid}, newAmountPaid=${calculatedNewAmountPaid}`
				);

				return {
					success: true,
					newAmountPaid: calculatedNewAmountPaid, // Return final calculated value
					updatedTransactions: finalUpdatedTransactions, // Return updated array
					isNowComplete: isNowFullyPaid, // Return completion status
				};
			} catch (error) {
				console.error(
					"PROCESS PAYMENT: Error processing payment/updating state:",
					error
				);
				return { success: false, error: error.message || "Processing failed" };
			}
		},
		[state, totalAmount, isPaymentCompleteInternal] // Dependencies
	);

	// --- Complete Payment Flow ---
	// Accepts finalTransactions array directly from the calling component
	const completePaymentFlow = useCallback(
		async (finalTransactions) => {
			if (!finalTransactions || !Array.isArray(finalTransactions)) {
				console.error(
					"COMPLETE FLOW: Invalid or missing finalTransactions array provided."
				);
				setError("Internal error: Transaction data missing for completion.");
				return false;
			}

			const currentBasePaidFromTxns = finalTransactions.reduce(
				(sum, tx) => sum + (tx.baseAmountPaid || 0),
				0
			);
			const currentTotalTipFromTxns = finalTransactions.reduce(
				(sum, tx) => sum + (tx.tipAmount || 0),
				0
			);
			// Use internal helper for consistency
			const isFullyPaid = isPaymentCompleteInternal(currentBasePaidFromTxns);

			try {
				console.log(
					"COMPLETE FLOW: Starting completePaymentFlow (with explicit transactions)"
				);
				console.log("COMPLETE FLOW: Completion Check", {
					totalAmount,
					amountPaid: currentBasePaidFromTxns,
					remaining: totalAmount - currentBasePaidFromTxns,
					isFullyPaid,
					totalTip: currentTotalTipFromTxns,
					numTransactions: finalTransactions.length,
				});

				if (!isFullyPaid) {
					console.error(
						"COMPLETE FLOW: Base amount check failed inside completePaymentFlow."
					);
					setError("Base payment amount is not fully complete.");
					return false;
				}

				// Build payload using finalTransactions and current state for mode/details
				const paymentPayload = {
					transactions: finalTransactions,
					totalPaid: currentBasePaidFromTxns + currentTotalTipFromTxns,
					baseAmountPaid: currentBasePaidFromTxns,
					totalTipAmount: currentTotalTipFromTxns,
					paymentMethod: state.splitMode ? "split" : state.paymentMethod,
					splitPayment: state.splitMode,
					splitDetails: state.splitMode ? state.splitDetails : null,
					orderId: state.orderId || useCartStore.getState().orderId,
					completed_at: new Date().toISOString(),
				};
				console.log(
					"COMPLETE FLOW: Calling onComplete with payload:",
					JSON.stringify(paymentPayload, null, 2)
				);

				const success = await onComplete?.(paymentPayload); // Call the callback (useCartActions.completeOrder)

				if (success) {
					console.log(
						"COMPLETE FLOW: onComplete successful. POS view should navigate."
					);
					useCartStore.getState().setRewardsProfile(null);
					useCartStore.getState().clearLocalOrderDiscountState();
					return true;
				} else {
					console.error("COMPLETE FLOW: onComplete callback reported failure.");
					setError("Failed backend finalization.");
					return false;
				}
			} catch (error) {
				console.error("COMPLETE FLOW: Error:", error);
				setError(error.message || "Error completing.");
				return false;
			}
		},
		[
			state.paymentMethod,
			state.splitMode,
			state.splitDetails,
			state.orderId,
			totalAmount,
			epsilon,
			onComplete,
			isPaymentCompleteInternal,
		] // Dependencies
	);

	// --- Start New Order ---
	const handleStartNewOrder = useCallback(async () => {
		try {
			console.log("Starting new order from payment flow hook");
			await onNewOrder?.(); // Call prop function
			// Reset state fully after new order is started by parent
			setState({
				orderId: useCartStore.getState().orderId, // Get potentially new ID
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
				currentSplitMethod: null,
				totalTipAmount: 0,
			});
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
		setState, // Expose setState if needed externally (use with caution)
		error,
		// Removed isProcessing state
		handleNavigation,
		handleBack,
		processPayment,
		completePaymentFlow,
		isPaymentComplete: isPaymentCompletePublic, // Expose the public check
		// Removed isSplitPaymentComplete as it was identical to isPaymentComplete
		handleStartNewOrder,
		resetSplitState,
	};
};
