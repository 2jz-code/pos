// src/features/payment/hooks/usePaymentFlow.js
import { useState, useCallback, useEffect, useRef } from "react";
import { useCartStore } from "../../../store/cartStore";
import { Decimal } from "decimal.js";
import customerDisplayManager from "../../customerDisplay/utils/windowManager";
import { toast } from "react-toastify";

// Helper function to calculate totals (assuming it exists and is correct)
const calculatePaymentTotals = (totalAmount, amountPaid) => {
	const remaining = Math.max(
		0,
		new Decimal(totalAmount).minus(new Decimal(amountPaid)).toNumber()
	);
	// Example tax calculation - adjust as needed
	const taxRate = 0.1;
	const subtotal = new Decimal(totalAmount).dividedBy(1 + taxRate).toNumber();
	const tax = totalAmount - subtotal;

	return {
		subtotal: subtotal,
		taxAmount: tax,
		payableAmount: totalAmount,
		remainingAmount: remaining,
	};
};

/**
 * Custom hook to manage the state and logic of the multi-step payment flow.
 * @param {object} props - Hook properties.
 * @param {number} props.totalAmount - The total amount for the order.
 * @param {function} props.onComplete - Callback function executed when the order is successfully finalized with the backend. It receives (orderId, paymentPayload) and should return the completed order data (including receipt_payload) or null/falsy on failure.
 * @param {function} props.onNewOrder - Callback function to initiate a new order.
 */
export const usePaymentFlow = ({ totalAmount, onComplete, onNewOrder }) => {
	// --- State Initialization ---
	const [state, setState] = useState({
		orderId: useCartStore.getState().orderId,
		currentView: "InitialOptions", // The currently displayed view component name
		previousViews: [], // Stack to keep track of navigation history
		paymentMethod: null, // 'cash', 'credit', or null
		splitMode: false, // Is the payment being split?
		amountPaid: 0, // Total base amount paid across all transactions so far
		transactions: [], // Array of transaction objects
		customAmount: "", // Input value for custom cash amount
		direction: 1, // Animation direction (1 for forward, -1 for backward)
		splitDetails: null, // Object holding details about the split payment process
		nextSplitAmount: null, // Amount pre-calculated for the next split step (if any)
		currentStepAmount: null, // The specific base amount due for the current payment step
		currentSplitMethod: null, // Payment method selected for the current split step
		totalTipAmount: 0, // Total tip amount accumulated across all transactions
		discountId: useCartStore.getState().discountId, // Applied discount ID
		discountAmount: useCartStore.getState().discountAmount, // Applied discount amount
		// *** NEW STATE: Store receipt payload for the CompletionView ***
		completionResultData: null, // <-- Stores the result from onComplete
	});
	const [error, setError] = useState(null); // Stores error messages for display
	const [isCompleting, setIsCompleting] = useState(false); // Tracks if the final backend completion call is in progress
	const epsilon = 0.01; // Tolerance for float comparisons
	const isMountedRef = useRef(false); // Tracks component mount status

	// --- Mount/Unmount Effect & Reset ---
	// Resets the entire payment flow state when the component mounts or totalAmount changes.
	useEffect(() => {
		isMountedRef.current = true;
		console.log(
			`PaymentFlow Hook: Mounted/totalAmount changed. Resetting state for total: ${totalAmount}`
		);
		// Reset state fully
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
			// *** Reset receipt payload on full reset ***
			completionResultData: null, // <-- Stores the result from onComplete
		});
		setError(null);
		setIsCompleting(false);
		return () => {
			isMountedRef.current = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [totalAmount]); // Dependency: Reset when totalAmount changes

	// --- Helper Functions ---

	// Checks if the total base amount paid meets or exceeds the required order total.
	const isPaymentCompleteInternal = useCallback(
		(paidAmount) => {
			const baseTotalRequired = totalAmount;
			if (typeof baseTotalRequired !== "number" || isNaN(baseTotalRequired)) {
				console.error(
					"isPaymentCompleteInternal: Invalid totalAmount",
					totalAmount
				);
				return false;
			}
			// Use Decimal.js for precision
			return new Decimal(paidAmount).greaterThanOrEqualTo(
				new Decimal(baseTotalRequired).minus(epsilon)
			);
		},
		[totalAmount, epsilon]
	);

	// Resets state specific to an intermediate split payment step.
	const resetSplitState = useCallback(() => {
		setState((prev) => ({
			...prev,
			nextSplitAmount: null,
			currentSplitMethod: null,
		}));
	}, []);

	// --- Navigation Logic ---

	/**
	 * Handles navigation between different payment views.
	 * @param {string | null} nextView - The name of the view to navigate to, or null to go back.
	 * @param {number} [direction=1] - Animation direction (1 for forward, -1 for back).
	 * @param {object} [options={}] - Additional options, including `nextSplitAmount` or `receiptPayload`.
	 */
	const handleNavigation = useCallback(
		(nextView, direction = 1, options = {}) => {
			const isFullyPaid = isPaymentCompleteInternal(state.amountPaid);
			const currentView = state.currentView; // Get current view before potential state update

			console.log("NAVIGATION: Navigating", {
				currentView: currentView,
				nextView,
				direction,
				options,
				isFullyPaid,
				splitMode: state.splitMode,
				currentAmountPaid: state.amountPaid,
				currentStepAmountState: state.currentStepAmount,
			});

			// --- Special Case: Redirect to Completion if order is paid ---
			// If trying to navigate BACK from Cash/Credit in split mode AFTER full payment, go to Completion instead.
			if (
				state.splitMode &&
				isFullyPaid &&
				direction < 0 &&
				(currentView === "Cash" || currentView === "Credit") &&
				nextView !== "Completion" // Avoid infinite loop if already going to Completion
			) {
				console.log(
					"NAVIGATION: Split complete, navigating to Completion instead of back"
				);
				setState((prev) => ({
					...prev,
					currentView: "Completion",
					previousViews: [...prev.previousViews, prev.currentView],
					direction: 1, // Forward animation to completion
					currentStepAmount: null,
					nextSplitAmount: null,
					// *** Store receipt payload if provided in options ***
					receiptPayloadForCompletion:
						options.receiptPayload ?? prev.receiptPayloadForCompletion,
				}));
				return;
			}

			// --- Standard Navigation Logic ---
			setState((prev) => {
				let newPaymentMethod = prev.paymentMethod;
				let newSplitMode = prev.splitMode;
				let newNextSplitAmount = prev.nextSplitAmount;
				let newCurrentStepAmount = null; // Reset by default
				let newSplitDetails = prev.splitDetails;
				// *** NEW: Handle receipt payload ***
				let newReceiptPayload = prev.receiptPayloadForCompletion;

				// --- Forward Navigation ---
				if (direction > 0) {
					// --- Handle specific target views ---
					if (nextView === "Cash" || nextView === "Credit") {
						newPaymentMethod = nextView === "Cash" ? "cash" : "credit";
						// Determine amount for this step
						if (options.nextSplitAmount !== undefined) {
							// Amount explicitly provided (split payment)
							newCurrentStepAmount = options.nextSplitAmount;
							console.log(
								`NAVIGATION: Set currentStepAmount from options: ${newCurrentStepAmount}`
							);
							newNextSplitAmount = null; // Clear pre-calculated next amount
						} else if (!prev.splitMode) {
							// Non-split: amount is the total remaining
							const { remainingAmount: currentRemaining } =
								calculatePaymentTotals(totalAmount, prev.amountPaid);
							newCurrentStepAmount = currentRemaining;
							console.log(
								`NAVIGATION: Set currentStepAmount for non-split: ${newCurrentStepAmount}`
							);
						} else {
							// Split mode but no amount provided (should not happen ideally)
							console.warn(
								"NAVIGATION: Forward nav in split mode without nextSplitAmount option."
							);
							newCurrentStepAmount = null; // Or calculate remaining? Be cautious.
						}
					} else {
						// Navigating to non-payment view (InitialOptions, Split, Completion)
						console.log(
							`NAVIGATION: Forward nav to non-payment view (${nextView}), clearing step amounts.`
						);
						newCurrentStepAmount = null;
						newNextSplitAmount = null;
					}

					// --- Handle Split Mode ---
					if (nextView === "Split") newSplitMode = true;

					// --- Update Split Details Context ---
					if (newSplitMode && (nextView === "Cash" || nextView === "Credit")) {
						// Entering a payment step within split mode
						newSplitDetails = {
							...(prev.splitDetails || {}), // Preserve existing details
							currentSplitIndex: prev.splitDetails?.currentSplitIndex ?? 0, // Ensure index exists
						};
					} else if (nextView === "Split") {
						// Entering the main Split view
						newSplitDetails = prev.splitDetails || {
							mode: "remaining", // Default mode if starting split
							currentSplitIndex: 0,
						};
					}

					// --- Handle Completion Navigation ---
					if (nextView === "Completion") {
						// *** Store receipt payload if provided ***
						newReceiptPayload = options.receiptPayload ?? null;
						console.log(
							`NAVIGATION: Storing receipt payload for Completion: ${
								newReceiptPayload ? "Exists" : "None"
							}`
						);
					} else {
						// *** Clear receipt payload when navigating elsewhere ***
						newReceiptPayload = null;
					}

					// --- Final Check: Prevent navigating away from Split if already complete ---
					// This prevents going back into Cash/Credit from Split view if payment is done
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
							receiptPayloadForCompletion:
								options.receiptPayload ?? prev.receiptPayloadForCompletion, // Preserve payload if passed
						};
					}

					// --- Apply Forward State Update ---
					console.log("NAVIGATION: Updating state for forward move:", {
						nextView,
						newPaymentMethod,
						newSplitMode,
						newCurrentStepAmount,
						receiptPayloadExists: !!newReceiptPayload,
					});
					return {
						...prev,
						currentView: nextView,
						previousViews: [...prev.previousViews, prev.currentView], // Add current view to history
						direction,
						paymentMethod: newPaymentMethod,
						splitMode: newSplitMode,
						splitDetails: newSplitDetails,
						nextSplitAmount: newNextSplitAmount,
						currentStepAmount: newCurrentStepAmount,
						receiptPayloadForCompletion: newReceiptPayload, // Update payload state
					};
				}
				// --- Backward Navigation ---
				else {
					const previousViews = [...prev.previousViews];
					const lastView = previousViews.pop() || "InitialOptions"; // Get the last view from history
					console.log(`NAVIGATION: Moving back to: ${lastView}`);

					// Reset payment method if going back to non-payment screens
					if (lastView === "InitialOptions" || lastView === "Split") {
						newPaymentMethod = null;
					}
					// Exit split mode if going back to initial options
					if (lastView === "InitialOptions") {
						newSplitMode = false;
						newSplitDetails = null; // Clear split details
					}
					// Reset split-specific state if returning to Split view
					if (lastView === "Split") {
						resetSplitState(); // Calls internal reset function
					}

					// Always clear step/next amounts and receipt payload when going back
					newCurrentStepAmount = null;
					newNextSplitAmount = null;
					newReceiptPayload = null;

					// --- Apply Backward State Update ---
					return {
						...prev,
						currentView: lastView,
						previousViews, // Updated history (last view removed)
						direction,
						paymentMethod: newPaymentMethod,
						splitMode: newSplitMode,
						splitDetails: newSplitDetails,
						nextSplitAmount: newNextSplitAmount,
						currentStepAmount: newCurrentStepAmount,
						receiptPayloadForCompletion: newReceiptPayload, // Clear payload
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
			totalAmount, // Include totalAmount as it's used in calculations within setState
		]
	);

	// Convenience function for handling the back button press
	const handleBack = useCallback(() => {
		const fromView = state.currentView;
		// Cannot go back from the initial options view
		if (fromView === "InitialOptions") {
			console.log(
				"NAV BACK: Already at InitialOptions, cannot go back further."
			);
			return false; // Indicate back navigation failed/not possible
		}

		// --- Handle Back from Payment Views (Cash/Credit) ---
		if (fromView === "Cash" || fromView === "Credit") {
			// Reset customer display to show cart
			try {
				customerDisplayManager.showCart();
			} catch (err) {
				console.error("NAV BACK: Error calling showCart:", err);
			}

			if (state.splitMode) {
				// In split mode: navigate back to the Split view
				console.log(
					`NAV BACK: From ${fromView} (Split Mode), navigating POS to Split, Customer Display to Cart.`
				);
				handleNavigation("Split", -1); // Navigate back to Split view
			} else {
				// Not in split mode: navigate back to Initial Options
				console.log(
					`NAV BACK: From ${fromView} (Non-Split), navigating POS back, Customer Display to Cart.`
				);
				handleNavigation("InitialOptions", -1); // Navigate back to Initial Options
			}
			return true; // Indicate back navigation succeeded
		}

		// --- Handle Back from Split View ---
		if (fromView === "Split") {
			console.log(
				`NAV BACK: Leaving Split view, navigating POS back, Customer Display to Cart.`
			);
			// Reset customer display
			try {
				customerDisplayManager.showCart();
			} catch (err) {
				console.error(
					"NAV BACK: Error resetting display when leaving Split view:",
					err
				);
			}
			handleNavigation("InitialOptions", -1); // Navigate back to Initial Options
			return true; // Indicate back navigation succeeded
		}

		// --- Generic Back Navigation (from other views like Completion - though usually disabled) ---
		console.log(`NAV BACK: Generic back navigation from ${fromView}`);
		handleNavigation(null, -1); // Use null to pop from history stack
		return true; // Indicate back navigation succeeded
	}, [state.currentView, state.splitMode, handleNavigation]);

	// --- PROCESS PAYMENT ---
	// Updates the internal state (amountPaid, transactions) after a payment step.
	// Does NOT interact with the backend directly.
	const processPayment = useCallback(
		async (amountCharged, paymentDetails = {}) => {
			console.log("PROCESS PAYMENT: Start", { amountCharged, paymentDetails });
			let calculatedNewAmountPaid = state.amountPaid; // Track calculated values
			let finalUpdatedTransactions = state.transactions;
			let isNowFullyPaid = false;

			try {
				// Determine payment method and amounts
				const method =
					paymentDetails.method || state.paymentMethod || "unknown";
				const tipThisTransaction =
					paymentDetails?.flowData?.payment?.tipAmount ?? // From credit flow data
					paymentDetails?.tipAmount ?? // Explicitly passed tip
					0;
				// Calculate base amount paid (excluding tip) for this transaction
				const baseAmountThisTransaction = new Decimal(amountCharged)
					.minus(new Decimal(tipThisTransaction))
					.toNumber();
				// Ensure base amount is not negative
				const validatedBaseAmount = Math.max(0, baseAmountThisTransaction);

				console.log("PROCESS PAYMENT: Calculated amounts", {
					amountCharged,
					baseAmountThisTransaction: validatedBaseAmount,
					tipThisTransaction,
					method,
					splitMode: state.splitMode,
				});

				// Create the new transaction object
				const newTransaction = {
					method: method,
					amount: parseFloat(amountCharged.toFixed(2)), // Total charged this step
					baseAmountPaid: parseFloat(validatedBaseAmount.toFixed(2)), // Base amount applied to order total
					tipAmount: parseFloat(tipThisTransaction.toFixed(2)),
					status: "completed",
					timestamp: new Date().toISOString(),
					// Add method-specific details
					...(method === "cash" && {
						cashTendered: paymentDetails.cashTendered,
						change: paymentDetails.change,
					}),
					...(method === "credit" && {
						cardInfo: paymentDetails.cardInfo || {},
						transactionId: paymentDetails.transactionId || null,
						flowData: paymentDetails.flowData, // Store context from terminal flow
					}),
					// Add split context if applicable
					...(state.splitMode &&
						state.splitDetails && {
							splitDetailsContext: {
								mode: state.splitDetails.mode,
								numberOfSplits: state.splitDetails.numberOfSplits,
								currentSplitIndex: state.splitDetails.currentSplitIndex ?? 0,
								stepAmountTarget: state.currentStepAmount, // Target amount for this split step
							},
						}),
				};
				console.log(
					"PROCESS PAYMENT: Created Transaction Object:",
					newTransaction
				);

				// Update state immutably
				setState((prev) => {
					// Calculate new totals based on previous state and new transaction
					const baseAmount = newTransaction.baseAmountPaid || 0;
					const tipAmount = newTransaction.tipAmount || 0;
					calculatedNewAmountPaid = new Decimal(prev.amountPaid)
						.plus(new Decimal(baseAmount))
						.toNumber();
					const calculatedNewTotalTip = new Decimal(prev.totalTipAmount)
						.plus(new Decimal(tipAmount))
						.toNumber();
					finalUpdatedTransactions = [...prev.transactions, newTransaction];

					// Check if the *entire order* is now paid based on the new total base amount
					isNowFullyPaid = isPaymentCompleteInternal(calculatedNewAmountPaid);

					// Update split details if in split mode
					let updatedOverallSplitDetails = prev.splitDetails;
					if (prev.splitMode) {
						const currentSplitIndex = prev.splitDetails?.currentSplitIndex ?? 0;
						updatedOverallSplitDetails = {
							...(prev.splitDetails || {}),
							currentSplitIndex: currentSplitIndex + 1, // Increment index for next potential split
							// Calculate remaining amount for the *entire order*
							remainingAmount: Math.max(
								0,
								new Decimal(totalAmount)
									.minus(new Decimal(calculatedNewAmountPaid))
									.toNumber()
							),
							// Add details of the completed split part
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

					// Return the updated state object
					const newState = {
						...prev,
						amountPaid: calculatedNewAmountPaid,
						totalTipAmount: calculatedNewTotalTip,
						transactions: finalUpdatedTransactions,
						splitDetails: updatedOverallSplitDetails,
						currentSplitMethod: null, // Reset current split method choice
					};
					console.log("PROCESS PAYMENT: State update calculation complete", {
						calculatedNewAmountPaid,
						isNowFullyPaid,
					});
					return newState;
				});

				// Wait for state update to settle (optional, usually not needed with async setState)
				// await new Promise(resolve => setTimeout(resolve, 0));

				console.log(
					`PROCESS PAYMENT: After state update attempt - isNowFullyPaid=${isNowFullyPaid}, newAmountPaid=${calculatedNewAmountPaid}`
				);

				// Return success status and key updated values
				return {
					success: true,
					newAmountPaid: calculatedNewAmountPaid,
					updatedTransactions: finalUpdatedTransactions,
					isNowComplete: isNowFullyPaid, // Indicate if the *entire order* is paid
				};
			} catch (error) {
				console.error("PROCESS PAYMENT: Error:", error);
				setError(error.message || "Processing failed");
				return { success: false, error: error.message || "Processing failed" };
			}
		},
		[
			state.amountPaid, // Read state values needed for calculation
			state.paymentMethod,
			state.splitMode,
			state.splitDetails,
			state.currentStepAmount,
			state.transactions, // Needed for updating transactions array
			state.totalTipAmount,
			totalAmount,
			isPaymentCompleteInternal, // Include helper function dependency
		]
	);

	// --- COMPLETE PAYMENT FLOW ---
	// Finalizes the order with the backend via the onComplete prop.
	const completePaymentFlow = useCallback(
		async (finalTransactions) => {
			setIsCompleting(true); // Set loading state
			setError(null);
			let backendOrderData = null; // Store result from backend call

			// Validate input
			if (!finalTransactions || !Array.isArray(finalTransactions)) {
				setError("Internal error: Transaction data missing for completion.");
				setIsCompleting(false);
				return null; // Indicate failure
			}

			// Recalculate totals from the final transaction list for consistency
			const currentBasePaidFromTxns = finalTransactions.reduce(
				(sum, tx) => sum + (tx.baseAmountPaid || 0),
				0
			);
			const currentTotalTipFromTxns = finalTransactions.reduce(
				(sum, tx) => sum + (tx.tipAmount || 0),
				0
			);

			// Final check: ensure the base amount paid covers the total order amount
			const isFullyPaid = isPaymentCompleteInternal(currentBasePaidFromTxns);
			if (!isFullyPaid) {
				setError("Base payment amount is not fully complete.");
				console.error(
					`Complete Flow Error: Base paid (${currentBasePaidFromTxns}) < Total required (${totalAmount})`
				);
				setIsCompleting(false);
				return null; // Indicate failure
			}

			// Ensure order ID is available
			const orderId = state.orderId || useCartStore.getState().orderId;
			if (!orderId) {
				setError("Internal error: Order ID missing.");
				setIsCompleting(false);
				return null; // Indicate failure
			}

			// --- Prepare Payload for Backend (via onComplete prop) ---
			const paymentPayload = {
				transactions: finalTransactions,
				totalPaid: parseFloat(
					new Decimal(currentBasePaidFromTxns)
						.plus(new Decimal(currentTotalTipFromTxns))
						.toFixed(2)
				),
				baseAmountPaid: parseFloat(
					new Decimal(currentBasePaidFromTxns).toFixed(2)
				),
				totalTipAmount: parseFloat(
					new Decimal(currentTotalTipFromTxns).toFixed(2)
				),
				paymentMethod: state.splitMode ? "split" : state.paymentMethod, // Mark as 'split' if applicable
				splitPayment: state.splitMode,
				splitDetails: state.splitMode ? state.splitDetails : null, // Include split details if needed by backend
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
					JSON.stringify(paymentPayload, null, 2) // Log the payload being sent
				);

				// --- Call the onComplete Prop ---
				if (typeof onComplete !== "function") {
					throw new Error(
						"onComplete prop is not a function or was not provided."
					);
				}
				// The parent component (e.g., PaymentFlow component) provides this function
				// It should handle the actual backend API call to finalize the order.
				backendOrderData = await onComplete(orderId, paymentPayload);

				// --- Handle Result from onComplete ---
				if (backendOrderData) {
					console.log("COMPLETE FLOW (Hook): onComplete prop successful.");

					// --- Calculate Cash Details from Transactions ---
					let totalCashTendered = new Decimal(0);
					let totalChangeGiven = new Decimal(0);
					let involvedCash = false;
					finalTransactions.forEach((tx) => {
						if (tx.method === "cash") {
							involvedCash = true;
							totalCashTendered = totalCashTendered.plus(tx.cashTendered || 0);
							totalChangeGiven = totalChangeGiven.plus(tx.change || 0);
						}
					});
					// --------------------------------------------

					// --- Combine backend data with calculated cash details ---
					const finalCompletionResult = {
						...backendOrderData, // Include everything from backend (like receipt_payload)
						paymentMethodUsed: state.splitMode ? "split" : state.paymentMethod, // Overall method
						involvedCash: involvedCash, // Flag if cash was used at all
						// Add cash details only if cash was involved
						...(involvedCash && {
							totalCashTendered: parseFloat(totalCashTendered.toFixed(2)),
							totalChangeGiven: parseFloat(totalChangeGiven.toFixed(2)),
						}),
					};
					console.log(
						"COMPLETE FLOW (Hook): Final Completion Result Object:",
						finalCompletionResult
					);
					// -------------------------------------------------------

					// --- Store combined result in state ---
					setState((prev) => ({
						...prev,
						completionResultData: finalCompletionResult,
					}));

					// Clear other state AFTER success
					useCartStore.getState().setRewardsProfile(null);
					useCartStore.getState().clearLocalOrderDiscountState();
					setIsCompleting(false);
					return finalCompletionResult; // Return the combined data
				} else {
					// Failure: onComplete returned null/falsy
					console.error(
						"COMPLETE FLOW (Hook): onComplete prop failed or returned null/false."
					);
					setError("Failed to finalize order with backend."); // Set error state
					setIsCompleting(false);
					return null; // <<<--- RETURN NULL ON FAILURE
				}
			} catch (error) {
				// Catch errors from the onComplete promise itself
				console.error(
					"COMPLETE FLOW (Hook): Error calling onComplete prop:",
					error
				);
				const errorMsg =
					error?.message || "Error completing order via onComplete.";
				setError(errorMsg);
				toast.error(`Completion Failed: ${errorMsg}`);
				setState((prev) => ({ ...prev, completionResultData: null })); // Clear on error
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
			totalAmount, // Needed for isPaymentCompleteInternal check
			isPaymentCompleteInternal,
			onComplete, // The callback prop
		]
	);

	// --- Start New Order ---
	// Resets the payment flow state and calls the onNewOrder prop.
	const handleStartNewOrder = useCallback(async () => {
		try {
			console.log("Starting new order from payment flow hook");
			// Call the parent's function to handle new order logic (e.g., clear cart)
			await onNewOrder?.();
			// Reset state fully after new order is started by parent
			// Note: The useEffect based on totalAmount changing might also handle this reset
			// if onNewOrder causes totalAmount to change. Explicit reset here ensures it happens.
			setState({
				orderId: useCartStore.getState().orderId, // Get potentially new order ID
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
				receiptPayloadForCompletion: null, // Reset payload
				completionResultData: null, // <-- Reset here too
			});
			setIsCompleting(false); // Reset loading state
			// Clear potentially sensitive cart state
			useCartStore.getState().clearLocalOrderDiscountState();
			useCartStore.getState().setRewardsProfile(null);
		} catch (error) {
			console.error("Error starting new order in payment flow hook:", error);
			// Optionally set an error state or show a toast
		}
	}, [onNewOrder]); // Dependency on the callback prop

	// Public check for payment completion based on current state
	const isPaymentCompletePublic = useCallback(() => {
		return isPaymentCompleteInternal(state.amountPaid);
	}, [state.amountPaid, isPaymentCompleteInternal]);

	// --- Return Values ---
	// Expose state and functions needed by the UI components
	return {
		state, // The current state object
		setState, // Allow direct state manipulation if needed (use with caution)
		error, // Current error message
		isCompleting, // Loading state for the final completion step
		handleNavigation, // Function to navigate between views
		handleBack, // Function to handle back navigation
		processPayment, // Function to process a single payment step (updates state)
		completePaymentFlow, // Function to finalize the order with the backend (calls onComplete)
		isPaymentComplete: isPaymentCompletePublic, // Function to check if payment is complete
		handleStartNewOrder, // Function to start a new order
		resetSplitState, // Function to reset intermediate split state
	};
};
