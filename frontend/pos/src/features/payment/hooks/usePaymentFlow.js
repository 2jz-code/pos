// src/features/payment/hooks/usePaymentFlow.js
import { useState, useCallback } from "react";
import { useCartStore } from "../../../store/cartStore";

export const usePaymentFlow = ({ totalAmount, onComplete, onNewOrder }) => {
	// Add onNewOrder prop
	const [state, setState] = useState({
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
	});
	const [error, setError] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const isSplitPaymentComplete = useCallback(() => {
		if (!state.splitMode) return false;

		// The most reliable way to check if all payments are complete
		// is to compare the total amount paid with the total amount due
		const epsilon = 0.01; // Small epsilon to handle floating point errors
		const allPaymentsComplete =
			Math.abs(totalAmount - state.amountPaid) < epsilon;

		// Log for debugging
		console.log("Split payment completion check:", {
			totalAmount,
			amountPaid: state.amountPaid,
			difference: totalAmount - state.amountPaid,
			isComplete: allPaymentsComplete,
		});

		return allPaymentsComplete;
	}, [state.splitMode, state.amountPaid, totalAmount]);

	const isPaymentComplete = useCallback(() => {
		// Use a more precise epsilon check for floating point comparison
		const epsilon = 0.01;
		const remainingAmount = totalAmount - state.amountPaid;
		return Math.abs(remainingAmount) < epsilon;
	}, [state.amountPaid, totalAmount]);

	const resetSplitState = useCallback(() => {
		setState((prev) => ({
			...prev,
			nextSplitAmount: null,
			currentSplitMethod: null,
		}));
	}, [setState]);

	const handleNavigation = useCallback(
		(nextView, direction = 1) => {
			// Calculate the remaining amount within the function scope
			const remainingAmount = totalAmount - state.amountPaid;

			// CRITICAL FIX: Use a more precise check for remaining amount
			const epsilon = 0.01;
			const isFullyPaid = Math.abs(remainingAmount) < epsilon;

			console.log("NAVIGATION: Payment navigation check:", {
				nextView,
				direction,
				totalAmount,
				amountPaid: state.amountPaid,
				remainingAmount,
				isFullyPaid,
				splitMode: state.splitMode,
			});

			if (nextView === "Split" && direction < 0) {
				// Reset split-specific state to prevent auto-processing
				resetSplitState();
			}
			// If we're in split mode and all payments are complete,
			// we should go to the completion view instead of going back to split view
			else if (
				state.splitMode &&
				isFullyPaid &&
				direction < 0 &&
				nextView !== "Completion"
			) {
				console.log(
					"NAVIGATION: All split payments complete, redirecting to completion view"
				);
				setState((prev) => ({
					...prev,
					currentView: "Completion",
					previousViews: [...prev.previousViews, prev.currentView],
					direction: 1,
				}));
				return;
			}

			setState((prev) => {
				if (direction < 0) {
					// Going back
					const previousViews = [...prev.previousViews];
					const lastView = previousViews.pop() || "InitialOptions";

					return {
						...prev,
						currentView: lastView,
						previousViews,
						direction,
					};
				} else {
					// Going forward
					// Set payment method based on the view we're navigating to
					let paymentMethod = prev.paymentMethod;
					if (nextView === "Cash") paymentMethod = "cash";
					if (nextView === "Credit") paymentMethod = "credit";

					// Special handling for split payment completion
					// CRITICAL FIX: Only redirect to completion if truly complete
					if (
						prev.splitMode &&
						isFullyPaid &&
						(nextView === "Cash" || nextView === "Credit")
					) {
						console.log(
							"NAVIGATION: Split payment is complete, going to completion view"
						);
						// If split payment is complete, go to completion view instead
						return {
							...prev,
							currentView: "Completion",
							previousViews: [...prev.previousViews, prev.currentView],
							direction: 1,
							paymentMethod,
						};
					}

					// Normal navigation
					return {
						...prev,
						currentView: nextView,
						previousViews: [...prev.previousViews, prev.currentView],
						direction,
						paymentMethod,
					};
				}
			});
		},
		[totalAmount, state.amountPaid, state.splitMode, resetSplitState]
	);

	const handleBack = useCallback(() => {
		if (state.currentView === "InitialOptions") {
			return false; // Indicate we're at the root
		}

		// If we're in a payment view during a split payment,
		// check if all payments are complete before going back to split view
		if (
			state.splitMode &&
			(state.currentView === "Cash" || state.currentView === "Credit")
		) {
			// If all payments are complete, go to completion view instead
			if (Math.abs(totalAmount - state.amountPaid) < 0.01) {
				console.log("All split payments complete, redirecting to completion");
				setState((prev) => ({
					...prev,
					currentView: "Completion",
					previousViews: [...prev.previousViews, prev.currentView],
					direction: 1,
				}));
				return true;
			}

			// Otherwise, go back to split view as normal
			if (!isPaymentComplete()) {
				setState((prev) => ({
					...prev,
					currentView: "Split",
					previousViews: [...prev.previousViews.filter((v) => v !== "Split")],
					direction: -1,
					nextSplitAmount: null,
				}));
				return true;
			}
		}

		// Normal back navigation
		handleNavigation(null, -1);
		return true;
	}, [
		state.currentView,
		state.splitMode,
		handleNavigation,
		isPaymentComplete,
		totalAmount,
		state.amountPaid,
	]);

	const processPayment = async (amount, paymentDetails = {}) => {
		setIsProcessing(true);
		setError(null);

		try {
			console.log("PAYMENT: Processing payment:", {
				amount,
				method: paymentDetails.method,
				splitMode: state.splitMode,
				currentAmountPaid: state.amountPaid,
				totalAmount,
			});

			setState((prev) => {
				// CRITICAL FIX: Ensure we're only adding the exact amount being processed
				const newAmountPaid = prev.amountPaid + amount;

				// Calculate the new remaining amount
				const newRemainingAmount = totalAmount - newAmountPaid;

				const newTransaction = {
					method: paymentDetails.method || state.paymentMethod,
					amount,
					...paymentDetails,
					splitPayment: prev.splitMode ? true : false,
					splitDetails: prev.splitMode ? prev.splitDetails : null,
				};

				// Update split details if in split mode
				let updatedSplitDetails = prev.splitDetails;
				if (prev.splitMode && prev.splitDetails) {
					const currentIndex = prev.splitDetails.currentSplitIndex || 0;
					updatedSplitDetails = {
						...prev.splitDetails,
						currentSplitIndex: currentIndex + 1,
						completedSplits: [
							...(prev.splitDetails.completedSplits || []),
							{
								method: newTransaction.method,
								amount: amount,
								index: currentIndex,
							},
						],
						// Store the calculated remaining amount
						remainingAmount: newRemainingAmount,
					};

					console.log("PAYMENT: Updated split details after payment:", {
						currentIndex,
						newCompletedSplit: {
							method: newTransaction.method,
							amount,
							index: currentIndex,
						},
						newRemainingAmount,
						newAmountPaid,
						totalAmount,
					});
				}

				return {
					...prev,
					amountPaid: newAmountPaid,
					transactions: [...prev.transactions, newTransaction],
					splitDetails: updatedSplitDetails,
					nextSplitAmount: null, // Reset the split amount after processing
				};
			});

			return true;
		} catch (error) {
			setError(error.message);
			return false;
		} finally {
			setIsProcessing(false);
		}
	};

	const completePaymentFlow = useCallback(
		async (paymentDetailsOverride = null) => {
			try {
				console.log("FLOW CHAIN: Starting completePaymentFlow");

				// Validation checks with improved precision
				const epsilon = 0.01;
				const remainingAmount = totalAmount - state.amountPaid;
				const isFullyPaid = Math.abs(remainingAmount) < epsilon;

				console.log("FLOW CHAIN: Payment completion check:", {
					totalAmount,
					amountPaid: state.amountPaid,
					remainingAmount,
					isFullyPaid,
					epsilon,
				});

				if (state.splitMode && !isFullyPaid && !paymentDetailsOverride) {
					console.log(
						"FLOW CHAIN: Preventing premature completion - payments not complete"
					);
					return false;
				}

				// Use override details if provided, otherwise construct from state
				const paymentDetails = paymentDetailsOverride || {
					totalPaid: state.amountPaid,
					transactions: state.transactions,
					paymentMethod: state.splitMode ? "split" : state.paymentMethod,
					splitPayment: state.splitMode,
					splitDetails: state.splitDetails,
					orderId: state.orderId, // Explicitly include orderId
				};

				// Ensure orderId is included
				if (!paymentDetails.orderId) {
					paymentDetails.orderId =
						state.orderId || useCartStore.getState().orderId;
					console.log(
						"FLOW CHAIN: Adding orderId from state:",
						paymentDetails.orderId
					);
				}

				console.log(
					"FLOW CHAIN: Calling onComplete with payment details:",
					paymentDetails
				);

				// Ensure we properly await the promise and handle errors
				try {
					const success = await onComplete?.(paymentDetails);
					console.log("FLOW CHAIN: onComplete result:", success);

					if (success) {
						setState((prev) => ({
							...prev,
							currentView: "Completion",
							previousViews: [...prev.previousViews, prev.currentView],
						}));
						useCartStore.getState().setRewardsProfile(null);
						return true;
					}
					return false;
				} catch (error) {
					console.error("FLOW CHAIN: Error in onComplete:", error);
					throw error; // Re-throw to be caught by outer try/catch
				}
			} catch (error) {
				console.error("FLOW CHAIN: Error in completePaymentFlow:", error);
				setError(error.message);
				return false;
			}
		},
		[
			state.amountPaid,
			state.transactions,
			state.paymentMethod,
			state.splitMode,
			state.splitDetails,
			state.orderId,
			onComplete,
			totalAmount,
		]
	);
	// Add explicit navigation function
	const navigateToView = useCallback((viewName) => {
		console.log(`Explicitly navigating to: ${viewName}`);
		setState((prev) => ({
			...prev,
			currentView: viewName,
			previousViews: [...prev.previousViews, prev.currentView],
		}));
	}, []);

	// Add function to handle starting new order
	const handleStartNewOrder = useCallback(async () => {
		try {
			console.log("Starting new order from payment flow");

			// First call the parent's onNewOrder callback
			await onNewOrder?.();

			// Then reset payment flow state
			setState({
				currentView: "InitialOptions",
				previousViews: [],
				paymentMethod: null,
				splitMode: false,
				amountPaid: 0,
				transactions: [],
				customAmount: "",
				direction: 1,
			});
		} catch (error) {
			console.error("Error starting new order:", error);
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
		isPaymentComplete,
		isSplitPaymentComplete,
		navigateToView,
		handleStartNewOrder,
		resetSplitState,
	};
};
