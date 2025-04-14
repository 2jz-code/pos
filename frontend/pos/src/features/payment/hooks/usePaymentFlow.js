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
	const [isProcessing, setIsProcessing] = useState(false);
	const epsilon = 0.01;
	const isMountedRef = useRef(false);

	// Mount/Unmount effect & Reset on totalAmount change
	useEffect(() => {
		isMountedRef.current = true;
		console.log(
			`PaymentFlow Hook: Mounted/totalAmount changed. Resetting state for total: ${totalAmount}`
		);
		// Simplified reset logic
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
		return () => {
			isMountedRef.current = false;
		};
	}, [totalAmount]); // Dependency is totalAmount

	// --- Helper Functions ---
	// Calculates if BASE amount is fully paid
	const isPaymentComplete = useCallback(() => {
		const currentBasePaid = state.amountPaid;
		const baseTotalRequired = totalAmount;
		const isComplete = new Decimal(currentBasePaid).greaterThanOrEqualTo(
			new Decimal(baseTotalRequired).minus(epsilon)
		);
		console.log("isPaymentComplete Check:", {
			currentBasePaid,
			baseTotalRequired,
			isComplete,
		});
		return isComplete;
	}, [state.amountPaid, totalAmount, epsilon]);

	const isSplitPaymentComplete = useCallback(() => {
		if (!state.splitMode) return false;
		return isPaymentComplete(); // Use the main completion check
	}, [state.splitMode, isPaymentComplete]); // Dependency on the main check function

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
			// Navigation logic needs to check based on BASE amount paid
			const isFullyPaid = isPaymentComplete();

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

				// Update method/mode when moving forward
				if (direction > 0) {
					if (nextView === "Cash") newPaymentMethod = "cash";
					if (nextView === "Credit") newPaymentMethod = "credit";
					if (nextView === "Split") newSplitMode = true;

					let newSplitDetails = prev.splitDetails;
					if (newSplitMode && (nextView === "Cash" || nextView === "Credit")) {
						newSplitDetails = {
							...(prev.splitDetails || {}),
							currentSplitIndex: prev.splitDetails?.currentSplitIndex || 0,
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
					// Reset state if going back to specific views
					if (lastView === "InitialOptions" || lastView === "Split")
						newPaymentMethod = null;
					if (lastView === "InitialOptions") newSplitMode = false;
					if (nextView === "Split") resetSplitState(); // Reset next amount when going back TO split view

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
			resetSplitState,
			isPaymentComplete,
		] // Dependencies
	);

	const handleBack = useCallback(() => {
		if (state.currentView === "InitialOptions") return false;
		// If going back from Cash/Credit during a split, check completion first
		if (
			state.splitMode &&
			(state.currentView === "Cash" || state.currentView === "Credit")
		) {
			if (isPaymentComplete()) {
				// Use the helper
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
	}, [state.currentView, state.splitMode, handleNavigation, isPaymentComplete]);

	// --- PROCESS PAYMENT ---
	const processPayment = useCallback(
		async (amountCharged, paymentDetails = {}) => {
			console.log("PROCESS PAYMENT: Received amountCharged:", amountCharged);
			console.log(
				"PROCESS PAYMENT: Received paymentDetails:",
				JSON.stringify(paymentDetails, null, 2)
			);

			setIsProcessing(true);
			setError(null);

			try {
				const method =
					paymentDetails.method || state.paymentMethod || "unknown";
				// Determine base amount and tip for *this* transaction
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
					// Corrected variable name
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
								currentSplitIndex: state.splitDetails.currentSplitIndex || 0,
							},
						}),
				};
				console.log(
					"PROCESS PAYMENT: Created Transaction Object:",
					newTransaction
				);

				let calculatedNewAmountPaid;
				let calculatedNewTotalTip;

				setState((prev) => {
					calculatedNewAmountPaid = new Decimal(prev.amountPaid)
						.plus(new Decimal(validatedBaseAmount))
						.toNumber();
					calculatedNewTotalTip = new Decimal(prev.totalTipAmount)
						.plus(new Decimal(tipThisTransaction))
						.toNumber();
					const updatedTransactions = [...prev.transactions, newTransaction];
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

					return {
						...prev,
						amountPaid: calculatedNewAmountPaid,
						totalTipAmount: calculatedNewTotalTip,
						transactions: updatedTransactions,
						splitDetails: updatedOverallSplitDetails,
						nextSplitAmount: null,
						currentSplitMethod: null,
					};
				});

				setIsProcessing(false);
				// Return the cumulative BASE amount paid
				return {
					success: true,
					newAmountPaid:
						calculatedNewAmountPaid ?? state.amountPaid + validatedBaseAmount,
				};
			} catch (error) {
				console.error("PROCESS PAYMENT: Error processing payment:", error);
				setError(error.message || "Failed to record payment locally");
				setIsProcessing(false);
				return { success: false, error: error.message || "Processing failed" };
			}
		},
		// Depends on state variables used *inside* the function and totalAmount prop
		[state, totalAmount] // Use state directly as dependency
	);

	// --- Complete Payment Flow ---
	const completePaymentFlow = useCallback(async () => {
		// Capture state at the start of this specific execution
		const currentState = state;

		try {
			console.log("COMPLETE FLOW: Starting completePaymentFlow");

			// *** FIX: Recalculate base paid from transactions for accuracy ***
			const currentBasePaidFromTxns = currentState.transactions.reduce(
				(sum, tx) => sum + (tx.baseAmountPaid || 0),
				0 // Sum baseAmountPaid from each tx
			);
			const isFullyPaid = new Decimal(
				currentBasePaidFromTxns
			).greaterThanOrEqualTo(new Decimal(totalAmount).minus(epsilon));
			// *** END FIX ***

			console.log("COMPLETE FLOW: Completion Check", {
				totalAmount, // Base order total
				// Use the recalculated amount for the check log
				amountPaid: currentBasePaidFromTxns,
				remaining: totalAmount - currentBasePaidFromTxns,
				isFullyPaid,
				totalTip: currentState.totalTipAmount,
			});

			if (!isFullyPaid) {
				console.error(
					"COMPLETE FLOW: Attempted to complete flow but base amount is not fully paid (calculated from txns)."
				);
				setError("Base payment amount is not fully complete.");
				return false;
			}

			// Prepare the payload using the captured state
			const paymentPayload = {
				transactions: currentState.transactions,
				totalPaid: currentBasePaidFromTxns + currentState.totalTipAmount, // Use recalculated base + total tip
				baseAmountPaid: currentBasePaidFromTxns, // Send recalculated base
				totalTipAmount: currentState.totalTipAmount,
				paymentMethod: currentState.splitMode
					? "split"
					: currentState.paymentMethod,
				splitPayment: currentState.splitMode,
				splitDetails: currentState.splitMode ? currentState.splitDetails : null,
				orderId: currentState.orderId || useCartStore.getState().orderId,
				completed_at: new Date().toISOString(),
			};

			console.log(
				"COMPLETE FLOW: Calling onComplete with payload:",
				JSON.stringify(paymentPayload, null, 2)
			);

			const success = await onComplete?.(paymentPayload);

			if (success) {
				console.log(
					"COMPLETE FLOW: onComplete successful. Navigating to Completion view."
				);
				// Use functional setState to ensure update is based on latest state *before* navigation
				setState((prev) => ({
					...prev,
					currentView: "Completion",
					previousViews: [...prev.previousViews, prev.currentView],
				}));
				useCartStore.getState().setRewardsProfile(null);
				useCartStore.getState().removeOrderDiscount();
				return true;
			} else {
				console.error("COMPLETE FLOW: onComplete callback reported failure.");
				setError("Failed to finalize the order with the backend.");
				return false;
			}
		} catch (error) {
			console.error("COMPLETE FLOW: Error in completePaymentFlow:", error);
			setError(error.message || "An error occurred during payment completion.");
			return false;
		}
		// Dependencies should include things used *outside* the direct state reads if possible
		// But since we capture state, 'state' itself is the main dependency conceptually
	}, [state, totalAmount, epsilon, onComplete]);

	// --- Start New Order ---
	const handleStartNewOrder = useCallback(async () => {
		// ... (same logic as before) ...
		try {
			console.log("Starting new order from payment flow hook");
			await onNewOrder?.();
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
				currentSplitMethod: null,
				totalTipAmount: 0,
			});
			useCartStore.getState().setOrderDiscount(null);
			useCartStore.getState().setRewardsProfile(null);
		} catch (error) {
			console.error("Error starting new order in payment flow hook:", error);
		}
	}, [onNewOrder]);

	return {
		state,
		setState,
		error,
		isProcessing,
		handleNavigation,
		handleBack,
		processPayment,
		completePaymentFlow,
		// *** FIX: Expose the actual check function ***
		isPaymentComplete: isPaymentComplete,
		isSplitPaymentComplete, // Keep this one as well
		handleStartNewOrder,
		resetSplitState,
	};
};
