// src/features/payment/components/PaymentFlow.jsx
import { AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { useCallback } from "react";
import { PaymentHeader } from "./PaymentHeader";
import { PaymentSummary } from "./PaymentSummary";
import { PaymentStatus } from "./PaymentStatus";
import { usePaymentFlow } from "../hooks/usePaymentFlow";
import { calculatePaymentTotals as calculateDisplayTotals } from "../utils/paymentCalculations"; // Renamed import for clarity
import { PaymentViews } from "../views";
import { useCartActions } from "../../cart/hooks/useCartActions";
import { useCartStore } from "../../../store/cartStore";

export const PaymentFlow = ({ totalAmount, onBack }) => {
	const cartActions = useCartActions();

	// Wrapper for onComplete to pass to usePaymentFlow
	// This function now receives the already structured payload from usePaymentFlow.completePaymentFlow
	const handleBackendComplete = useCallback(
		async (orderId, paymentPayload) => {
			// <<< Receive orderId and paymentPayload from usePaymentFlow
			try {
				if (!orderId) {
					console.error(
						"PAYMENT FLOW: Missing orderId when completing payment!"
					);
					return null; // Return null on failure
				}
				if (!paymentPayload) {
					console.error(
						"PAYMENT FLOW: Missing paymentPayload when completing payment!"
					);
					return null; // Return null on failure
				}

				console.log("PAYMENT FLOW: handleBackendComplete received:", {
					orderId,
					paymentPayload,
				});

				// Add/Confirm discount details in the payload before sending to cartActions.completeOrder
				// Note: usePaymentFlow already includes discountId/Amount in its payload
				const finalPayload = {
					...paymentPayload, // Spread the payload received from usePaymentFlow
					// Ensure discount details are up-to-date from store state if necessary,
					// although usePaymentFlow should already have the correct ones in paymentPayload.
					// If recalculation based on cart is absolutely needed here (less ideal):
					// discount_id: orderDiscount?.id,
					// discount_amount: orderDiscount
					// 	? calculateCartTotals(currentCartItems, orderDiscount).discountAmount.toFixed(2)
					// 	: "0.00",
				};

				// *** Call cartActions.completeOrder (which handles backend API) ***
				const result = await cartActions.completeOrder(
					orderId,
					finalPayload // Pass the correct, detailed payload
				);
				console.log(
					"PAYMENT FLOW: cartActions.completeOrder result:",
					result ? "Order Data Received" : result
				);

				// *** MODIFIED: Return the result (order data or null) ***
				return result;
			} catch (error) {
				console.error(
					"PAYMENT FLOW: Error calling cartActions.completeOrder:",
					error
				);
				return null; // Indicate failure by returning null
			}
		},
		[cartActions] // Dependency array
	);

	// Wrapper for onNewOrder
	const handleNewOrderRequest = useCallback(async () => {
		try {
			useCartStore.getState().clearCart();
			useCartStore.getState().clearLocalOrderDiscountState();
			useCartStore.getState().setRewardsProfile(null);
			await cartActions.startOrder();
			onBack();
		} catch (error) {
			console.error("Error handling new order request:", error);
		}
	}, [cartActions, onBack]);

	// Initialize the payment flow hook
	const {
		state,
		setState,
		error,
		isCompleting, // Use isCompleting from the hook
		handleNavigation,
		handleBack,
		processPayment,
		completePaymentFlow, // This calls handleBackendComplete internally
		isPaymentComplete,
		handleStartNewOrder,
	} = usePaymentFlow({
		totalAmount,
		onComplete: handleBackendComplete, // Pass the wrapper
		onNewOrder: handleNewOrderRequest,
	});

	// Handle back navigation
	const handleBackNavigation = () => {
		const handledByHook = handleBack();
		if (!handledByHook) {
			onBack();
		}
	};

	// Calculate display totals
	const { subtotal, taxAmount, payableAmount, remainingAmount } =
		calculateDisplayTotals(totalAmount, state.amountPaid);

	// Get the current view component
	const CurrentView = PaymentViews[state.currentView];

	return (
		<div className="w-full h-full flex flex-col bg-slate-50">
			<PaymentHeader
				onBack={handleBackNavigation}
				title={`Payment - Order #${state.orderId || "..."}`}
			/>
			<div className="flex-1 relative overflow-hidden p-4">
				<AnimatePresence
					initial={false}
					custom={state.direction}
					mode="wait"
				>
					<CurrentView
						key={state.currentView}
						state={state}
						setState={setState} // Pass down if needed by views (e.g., CashPaymentView for customAmount)
						remainingAmount={remainingAmount}
						handleNavigation={handleNavigation}
						handlePayment={processPayment}
						isPaymentComplete={isPaymentComplete}
						completePaymentFlow={completePaymentFlow} // Pass the hook's function
						onStartNewOrder={handleStartNewOrder} // Pass the hook's function
						totalAmount={totalAmount}
						// Pass isCompleting for disabling buttons in views
						isCompleting={isCompleting}
					/>
				</AnimatePresence>
				{/* Use error/isCompleting from the hook */}
				<PaymentStatus
					error={error}
					isProcessing={isCompleting}
				/>
			</div>
			{state.currentView !== "Completion" && (
				<PaymentSummary
					totalAmount={subtotal}
					taxAmount={taxAmount}
					payableAmount={payableAmount}
					amountPaid={state.amountPaid}
				/>
			)}
		</div>
	);
};

PaymentFlow.propTypes = {
	totalAmount: PropTypes.number.isRequired,
	onBack: PropTypes.func.isRequired,
};

export default PaymentFlow;
