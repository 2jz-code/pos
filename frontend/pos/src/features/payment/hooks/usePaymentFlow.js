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
	});
	const [error, setError] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const handleNavigation = useCallback((nextView, direction = 1) => {
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
				return {
					...prev,
					currentView: nextView,
					previousViews: [...prev.previousViews, prev.currentView],
					direction,
				};
			}
		});
	}, []);

	const handleBack = useCallback(() => {
		if (state.currentView === "InitialOptions") {
			return false; // Indicate we're at the root
		}
		handleNavigation(null, -1);
		return true; // Indicate we handled the back navigation
	}, [state.currentView, handleNavigation]);

	const processPayment = async (amount, paymentDetails = {}) => {
		setIsProcessing(true);
		setError(null);

		try {
			// Remove the hardware service call since it's handled by useCashDrawer
			setState((prev) => ({
				...prev,
				amountPaid: prev.amountPaid + amount,
				transactions: [
					...prev.transactions,
					{
						method: paymentDetails.method || state.paymentMethod,
						amount,
						...paymentDetails,
					},
				],
			}));

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
			console.log("Starting payment completion flow");
			const paymentDetails = {
				totalPaid: state.amountPaid,
				transactions: state.transactions,
			};

			const success = await onComplete?.(paymentDetails);
			console.log("Payment completion result:", success);

			if (success) {
				console.log("Setting view to Completion");
				// Use immediate state update
				setState((prev) => {
					const newState = {
						...prev,
						currentView: "Completion",
						previousViews: [...prev.previousViews, prev.currentView],
					};
					console.log("New state:", newState);
					return newState;
				});

				// Add verification
				setTimeout(() => {
					console.log("Current view after update:", state.currentView);
				}, 0);

				return true;
			}
			return false;
		} catch (error) {
			console.error("Payment completion error:", error);
			setError(error.message);
			return false;
		}
	}, [state.amountPaid, state.transactions, onComplete, state.currentView]);

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

	const isPaymentComplete = useCallback(() => {
		return state.amountPaid >= totalAmount;
	}, [state.amountPaid, totalAmount]);

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
		navigateToView,
		handleStartNewOrder,
	};
};
