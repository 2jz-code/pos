// src/features/payment/hooks/usePaymentFlow.js
import { useState, useCallback } from "react";
import { hardwareService } from "../../../api/services/hardwareService";

export const usePaymentFlow = ({ totalAmount, onComplete }) => {
	const [state, setState] = useState({
		currentView: "InitialOptions",
		previousViews: [], // Add this to track navigation history
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
			if (paymentDetails.method === "cash") {
				await hardwareService.openDrawer();
			}

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

			// If payment is complete, call onComplete
			const newAmountPaid = state.amountPaid + amount;
			if (newAmountPaid >= totalAmount) {
				onComplete?.();
			}

			return true;
		} catch (error) {
			setError(error.message);
			return false;
		} finally {
			setIsProcessing(false);
		}
	};

	return {
		state,
		setState,
		error,
		isProcessing,
		handleNavigation,
		handleBack,
		processPayment,
	};
};
