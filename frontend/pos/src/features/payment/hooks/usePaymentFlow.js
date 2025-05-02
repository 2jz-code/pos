// src/features/payment/hooks/usePaymentFlow.js
import { useState, useCallback, useEffect, useRef } from "react";
import { useCartStore } from "../../../store/cartStore";
import { Decimal } from "decimal.js";
import customerDisplayManager from "../../customerDisplay/utils/windowManager";

const calculatePaymentTotals = (totalAmount, amountPaid) => {
	const remaining = Math.max(
		0,
		new Decimal(totalAmount).minus(new Decimal(amountPaid)).toNumber()
	);
	// Note: Tax/Subtotal calculation here might be overly simple if discounts apply.
	// Consider importing calculateCartTotals if a more accurate breakdown is needed.
	const taxRate = 0.1; // Assuming fixed 10% tax
	const subtotal = new Decimal(totalAmount).dividedBy(1 + taxRate).toNumber();
	const tax = totalAmount - subtotal;

	return {
		subtotal: subtotal,
		taxAmount: tax,
		payableAmount: totalAmount, // The original full amount required
		remainingAmount: remaining, // The amount still needed overall
	};
};

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
		nextSplitAmount: null, // Amount for the *next* navigation (set before nav)
		currentStepAmount: null, // *** NEW: Amount specifically for the current Cash/Credit view ***
		currentSplitMethod: null, // Keep this if used
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
		// Reset state completely when totalAmount changes (new payment scenario)
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
		});
		setError(null);
		return () => {
			isMountedRef.current = false;
		};
	}, [totalAmount]);

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
		(nextView, direction = 1, options = {}) => {
			// Calculate current remaining amount based on *current* state before update
			const isFullyPaid = isPaymentCompleteInternal(state.amountPaid);

			console.log("NAVIGATION: Navigating", {
				currentView: state.currentView,
				nextView,
				direction,
				options,
				isFullyPaid,
				splitMode: state.splitMode,
				currentAmountPaid: state.amountPaid,
				currentStepAmountState: state.currentStepAmount, // Log state value
			});

			// --- Logic for preventing back navigation if split is fully paid ---
			if (
				state.splitMode &&
				isFullyPaid &&
				direction < 0 &&
				(state.currentView === "Cash" || state.currentView === "Credit") &&
				nextView !== "Completion" // Allow explicit nav to Completion
			) {
				console.log(
					"NAVIGATION: Split complete, navigating to Completion instead of back"
				);
				setState((prev) => ({
					...prev,
					currentView: "Completion",
					previousViews: [...prev.previousViews, prev.currentView],
					direction: 1,
					currentStepAmount: null, // Clear step amount on completion
					nextSplitAmount: null,
				}));
				return;
			}

			// --- Standard Navigation Logic ---
			setState((prev) => {
				let newPaymentMethod = prev.paymentMethod;
				let newSplitMode = prev.splitMode;
				// Preserve previous nextSplitAmount unless explicitly cleared/changed by options
				let newNextSplitAmount = prev.nextSplitAmount;
				// *** NEW: Determine currentStepAmount ***
				let newCurrentStepAmount = null; // Default to null

				if (direction > 0) {
					// --- Moving Forward ---
					if (nextView === "Cash" || nextView === "Credit") {
						newPaymentMethod = nextView === "Cash" ? "cash" : "credit";
						// If an amount is provided via options (from Split view), set it as current step amount
						if (options.nextSplitAmount !== undefined) {
							newCurrentStepAmount = options.nextSplitAmount;
							console.log(
								`NAVIGATION: Set currentStepAmount from options: ${newCurrentStepAmount}`
							);
							newNextSplitAmount = null; // Clear the 'next' amount as it's now 'current'
						} else if (!prev.splitMode) {
							// If not split mode, the current step amount is the total remaining
							const { remainingAmount: currentRemaining } =
								calculatePaymentTotals(totalAmount, prev.amountPaid);
							newCurrentStepAmount = currentRemaining;
							console.log(
								`NAVIGATION: Set currentStepAmount for non-split: ${newCurrentStepAmount}`
							);
						} else {
							// Forward navigation in split mode *without* nextSplitAmount option specified.
							// This shouldn't happen when coming from Split view choosing Cash/Credit.
							// If navigating elsewhere (e.g., directly to Completion?), clear step amount.
							console.warn(
								"NAVIGATION: Forward nav in split mode without nextSplitAmount option."
							);
							newCurrentStepAmount = null; // Ensure it's cleared
						}
					} else {
						// Navigating forward to non-payment view (e.g., Split, Completion, Initial)
						console.log(
							`NAVIGATION: Forward nav to non-payment view (${nextView}), clearing amounts.`
						);
						newCurrentStepAmount = null; // Clear current step amount
						newNextSplitAmount = null; // Clear next amount too
					}

					if (nextView === "Split") newSplitMode = true;

					// Update splitDetails (only relevant fields needed here)
					let newSplitDetails = prev.splitDetails;
					if (newSplitMode && (nextView === "Cash" || nextView === "Credit")) {
						newSplitDetails = {
							...(prev.splitDetails || {}), // Preserve existing details like mode, numberOfSplits
							// Update index ONLY when processing payment, not just navigating to it
							currentSplitIndex: prev.splitDetails?.currentSplitIndex ?? 0,
						};
					} else if (nextView === "Split") {
						// Entering split view, ensure details are initialized if needed
						newSplitDetails = prev.splitDetails || {
							mode: "remaining",
							currentSplitIndex: 0,
						}; // Sensible default?
					}

					// Check for completion again before moving from Split view forward
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

					// Normal forward move state update
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
						nextSplitAmount: newNextSplitAmount, // Set potentially cleared next amount
						currentStepAmount: newCurrentStepAmount, // Set new current step amount
					};
				} else {
					// --- Moving Back ---
					const previousViews = [...prev.previousViews];
					const lastView = previousViews.pop() || "InitialOptions";
					console.log(`NAVIGATION: Moving back to: ${lastView}`);

					// Reset payment method/split mode based on where we are going back to
					if (lastView === "InitialOptions" || lastView === "Split")
						newPaymentMethod = null;
					if (lastView === "InitialOptions") newSplitMode = false;

					// Clear amounts when navigating back
					newCurrentStepAmount = null;
					newNextSplitAmount = null;
					if (lastView === "Split") resetSplitState(); // Call reset if going TO Split view

					return {
						...prev,
						currentView: lastView,
						previousViews,
						direction,
						paymentMethod: newPaymentMethod,
						splitMode: newSplitMode,
						nextSplitAmount: newNextSplitAmount, // Clear
						currentStepAmount: newCurrentStepAmount, // Clear
					};
				}
			});
			// --- End Standard Navigation ---
		},
		[
			// Use state values directly in dependencies for consistency
			state.amountPaid,
			state.splitMode,
			state.currentView,
			state.previousViews,
			state.splitDetails, // Added splitDetails
			isPaymentCompleteInternal,
			resetSplitState,
			totalAmount,
		]
	);

	const handleBack = useCallback(() => {
		const fromView = state.currentView; // Capture the view we are navigating FROM
		if (fromView === "InitialOptions") {
			console.log(
				"NAV BACK: Already at InitialOptions, cannot go back further."
			);
			return false; // Cannot go back from start
		}

		// --- Handle Back from Split Payment Step ---
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
				handleNavigation("Split", -1); // Navigate POS
			}
			return true; // Handled
		}

		// --- Handle Back from Non-Split Payment Step ---
		// This block runs if state.splitMode is false OR if fromView is not Cash/Credit
		// We only want to reset display if coming specifically FROM Cash/Credit in non-split mode
		if (!state.splitMode && (fromView === "Cash" || fromView === "Credit")) {
			console.log(
				`NAV BACK: Non-split mode from ${fromView}, navigating POS back, Customer Display to Cart.`
			);
			try {
				// Reset to Cart view when leaving a non-split payment view
				customerDisplayManager.showCart();
			} catch (err) {
				console.error("NAV BACK: Error calling showCart for non-split:", err);
			}
			// Let handleNavigation determine the previous view (should be InitialOptions)
			handleNavigation(null, -1); // Navigate POS back
			return true; // Handled
		}

		// --- Handle Back from Split View itself (to InitialOptions) ---
		if (fromView === "Split") {
			console.log(
				`NAV BACK: Leaving Split view, navigating POS back, Customer Display to Cart.`
			);
			try {
				customerDisplayManager.showCart(); // Reset display when leaving Split view
			} catch (err) {
				console.error(
					"NAV BACK: Error resetting display when leaving Split view:",
					err
				);
			}
			handleNavigation(null, -1); // Navigate POS back (to InitialOptions)
			return true; // Handled
		}

		// --- Generic Back (e.g., from Completion?) ---
		// Decide if display needs resetting here too
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

	// --- PROCESS PAYMENT ---
	const processPayment = useCallback(
		async (amountCharged, paymentDetails = {}) => {
			console.log("PROCESS PAYMENT: Start", { amountCharged, paymentDetails });

			let calculatedNewAmountPaid = state.amountPaid;
			let finalUpdatedTransactions = state.transactions;
			// Check completion based on amount *before* this transaction
			let isFullyPaidBeforeThisTx = isPaymentCompleteInternal(state.amountPaid);
			let isNowFullyPaid = isFullyPaidBeforeThisTx; // Initialize

			try {
				const method =
					paymentDetails.method || state.paymentMethod || "unknown";
				const tipThisTransaction =
					paymentDetails?.flowData?.payment?.tipAmount ??
					paymentDetails?.tipAmount ??
					0; // Allow tip from cash details too
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
						flowData: paymentDetails.flowData, // Store full flow data for potential refund needs
					}),
					...(state.splitMode &&
						state.splitDetails && {
							// Capture split details *at the time of this transaction*
							splitDetailsContext: {
								mode: state.splitDetails.mode,
								numberOfSplits: state.splitDetails.numberOfSplits,
								currentSplitIndex: state.splitDetails.currentSplitIndex ?? 0, // Index being paid
								// Store the specific amount targeted for this step if available
								stepAmountTarget: state.currentStepAmount,
							},
						}),
				};
				console.log(
					"PROCESS PAYMENT: Created Transaction Object:",
					newTransaction
				);

				// Use functional update for safety
				let intermediateState = null; // To store state for logging
				setState((prev) => {
					// Ensure we use previous state values for calculation
					const baseAmount = newTransaction.baseAmountPaid || 0;
					const tipAmount = newTransaction.tipAmount || 0;

					calculatedNewAmountPaid = new Decimal(prev.amountPaid)
						.plus(new Decimal(baseAmount))
						.toNumber();
					const calculatedNewTotalTip = new Decimal(prev.totalTipAmount)
						.plus(new Decimal(tipAmount))
						.toNumber();

					finalUpdatedTransactions = [...prev.transactions, newTransaction]; // Use local var for return

					// Check completion using the newly calculated total paid amount
					isNowFullyPaid = isPaymentCompleteInternal(calculatedNewAmountPaid);

					// Update split details: increment index, update overall remaining
					let updatedOverallSplitDetails = prev.splitDetails;
					if (prev.splitMode) {
						const currentSplitIndex = prev.splitDetails?.currentSplitIndex ?? 0;
						updatedOverallSplitDetails = {
							...(prev.splitDetails || {}),
							currentSplitIndex: currentSplitIndex + 1, // Increment index *after* payment
							// Calculate remaining based on total required minus new total paid
							remainingAmount: Math.max(
								0,
								new Decimal(totalAmount)
									.minus(new Decimal(calculatedNewAmountPaid))
									.toNumber()
							),
							// Track completed splits might be useful for display/refunds
							completedSplits: [
								...(prev.splitDetails?.completedSplits || []),
								{
									method: newTransaction.method,
									amount: newTransaction.baseAmountPaid,
									tip: newTransaction.tipAmount,
									index: currentSplitIndex, // The index that was just paid
									timestamp: newTransaction.timestamp,
								},
							],
						};
					}

					intermediateState = {
						// For logging purposes
						...prev,
						amountPaid: calculatedNewAmountPaid,
						totalTipAmount: calculatedNewTotalTip,
						transactions: finalUpdatedTransactions,
						splitDetails: updatedOverallSplitDetails,
						// currentStepAmount: null, // *** Clear the amount for the step just completed ***
						currentSplitMethod: null, // Also clear method selection
						// nextSplitAmount: null, // Keep nextSplitAmount as is, nav handles it
					};
					console.log("PROCESS PAYMENT: State update calculation complete", {
						calculatedNewAmountPaid,
						isNowFullyPaid,
					});
					return intermediateState; // Return the calculated new state
				});

				// Logging after setState attempt
				console.log(
					`PROCESS PAYMENT: After state update attempt - isNowFullyPaid=${isNowFullyPaid}, newAmountPaid=${calculatedNewAmountPaid}`
				);

				return {
					success: true,
					newAmountPaid: calculatedNewAmountPaid,
					updatedTransactions: finalUpdatedTransactions, // Pass back the correct final list
					isNowComplete: isNowFullyPaid, // Pass back the correct completion status
				};
			} catch (error) {
				console.error("PROCESS PAYMENT: Error:", error);
				setError(error.message || "Processing failed"); // Set error state
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
