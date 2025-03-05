// src/features/payment/PaymentFlowManager.jsx
import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { PaymentViews } from "./views";
import PropTypes from "prop-types";

export const PaymentFlowManager = ({ initialTotal, onComplete, onCancel }) => {
	// Payment state
	const [state, setState] = useState({
		direction: 1,
		currentView: "InitialOptions",
		paymentMethod: null,
		splitMode: false,
		amountPaid: 0,
		transactions: [],
		customAmount: "",
	});

	// Calculate remaining amount
	const remainingAmount = Math.max(0, initialTotal - state.amountPaid);

	// Navigation between views
	const handleNavigation = useCallback((view, direction = 1) => {
		setState((prev) => ({
			...prev,
			currentView: view,
			direction: direction,
		}));
	}, []);

	// Process a payment
	const handlePayment = useCallback(async (amount, paymentDetails) => {
		try {
			// In a real app, you would call your payment API here
			console.log("Processing payment:", { amount, ...paymentDetails });

			// Simulate successful payment processing
			const transaction = {
				method: paymentDetails.method,
				amount: amount,
				...paymentDetails,
			};

			// Update state with the new transaction
			setState((prev) => ({
				...prev,
				amountPaid: prev.amountPaid + amount,
				transactions: [...prev.transactions, transaction],
			}));

			return true;
		} catch (error) {
			console.error("Payment failed:", error);
			return false;
		}
	}, []);

	// Check if payment is complete
	const isPaymentComplete = useCallback(() => {
		return remainingAmount <= 0;
	}, [remainingAmount]);

	// Complete the payment flow
	const completePaymentFlow = useCallback(async () => {
		try {
			// In a real app, finalize the transaction here
			console.log("Completing payment flow:", {
				total: initialTotal,
				amountPaid: state.amountPaid,
				transactions: state.transactions,
			});

			// Notify parent component
			onComplete({
				total: initialTotal,
				amountPaid: state.amountPaid,
				transactions: state.transactions,
			});

			return true;
		} catch (error) {
			console.error("Failed to complete payment flow:", error);
			return false;
		}
	}, [initialTotal, state.amountPaid, state.transactions, onComplete]);

	// Start a new order
	const handleStartNewOrder = useCallback(async () => {
		// Reset state
		setState({
			direction: 1,
			currentView: "InitialOptions",
			paymentMethod: null,
			splitMode: false,
			amountPaid: 0,
			transactions: [],
			customAmount: "",
		});

		// Notify parent component
		onCancel();
	}, [onCancel]);

	// Render the current view
	const CurrentView = PaymentViews[state.currentView];

	return (
		<div className="relative w-full h-full overflow-hidden bg-white rounded-lg shadow">
			<AnimatePresence
				mode="wait"
				initial={false}
			>
				<CurrentView
					key={state.currentView}
					state={state}
					remainingAmount={remainingAmount}
					handleNavigation={handleNavigation}
					handlePayment={handlePayment}
					isPaymentComplete={isPaymentComplete}
					completePaymentFlow={completePaymentFlow}
					onStartNewOrder={handleStartNewOrder}
				/>
			</AnimatePresence>
		</div>
	);
};

export default PaymentFlowManager;

PaymentFlowManager.propTypes = {
	initialTotal: PropTypes.number.isRequired,
	onComplete: PropTypes.func.isRequired,
	onCancel: PropTypes.func.isRequired,
};
