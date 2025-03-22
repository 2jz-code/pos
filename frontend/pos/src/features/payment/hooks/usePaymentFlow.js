// src/features/payment/hooks/usePaymentFlow.js
import { useState, useCallback } from "react";
// import { hardwareService } from "../../../api/services/hardwareService";

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
		const allPaymentsComplete = Math.abs(totalAmount - state.amountPaid) < 0.01;

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
		return state.amountPaid >= totalAmount;
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
					"All split payments complete, redirecting to completion view"
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
		[isSplitPaymentComplete, state.amountPaid, totalAmount]
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
			setState((prev) => {
				const newAmountPaid = prev.amountPaid + amount;
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
					};

					// Calculate and store the actual remaining amount
					const calculatedRemainingAmount = totalAmount - newAmountPaid;
					updatedSplitDetails.remainingAmount = calculatedRemainingAmount;

					console.log("Updated split details after payment:", {
						newAmountPaid,
						originalTotal: totalAmount,
						calculatedRemainingAmount,
						completedSplits: updatedSplitDetails.completedSplits,
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

	const completePaymentFlow = useCallback(async () => {
		try {
			// CRITICAL FIX: Add an explicit check to prevent premature completion
			const epsilon = 0.01;
			const remainingAmount = totalAmount - state.amountPaid;
			const isFullyPaid = Math.abs(remainingAmount) < epsilon;

			if (state.splitMode && !isFullyPaid) {
				console.log(
					"Preventing premature payment completion - payments not complete",
					{
						amountPaid: state.amountPaid,
						totalAmount,
						remainingAmount,
					}
				);
				return false;
			}

			const paymentDetails = {
				totalPaid: state.amountPaid,
				transactions: state.transactions,
				paymentMethod: state.splitMode ? "split" : state.paymentMethod,
				splitPayment: state.splitMode,
				splitDetails: state.splitDetails,
			};

			const success = await onComplete?.(paymentDetails);

			if (success) {
				setState((prev) => ({
					...prev,
					currentView: "Completion",
					previousViews: [...prev.previousViews, prev.currentView],
				}));
				return true;
			}
			return false;
		} catch (error) {
			setError(error.message);
			return false;
		}
	}, [
		state.amountPaid,
		state.transactions,
		state.paymentMethod,
		state.splitMode,
		state.splitDetails,
		onComplete,
		totalAmount,
	]);

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
