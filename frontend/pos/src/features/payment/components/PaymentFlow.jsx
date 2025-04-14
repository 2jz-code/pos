// src/features/payment/components/PaymentFlow.jsx
import { AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { useCallback } from "react";
import { PaymentHeader } from "./PaymentHeader";
import { PaymentSummary } from "./PaymentSummary";
import { PaymentStatus } from "./PaymentStatus";
import { usePaymentFlow } from "../hooks/usePaymentFlow";
// remove usePaymentValidation as it's not used directly here anymore
import { calculatePaymentTotals } from "../utils/paymentCalculations";
import { PaymentViews } from "../views";
import { useCartActions } from "../../cart/hooks/useCartActions";
import { useCartStore } from "../../../store/cartStore"; // Import cart store
import { calculateCartTotals } from "../../cart/utils/cartCalculations";

export const PaymentFlow = ({ totalAmount, onBack }) => {
	const cartActions = useCartActions(); // Use cart actions hook

	// Wrapper for onComplete to pass to usePaymentFlow
	// This function now receives the already structured payload from usePaymentFlow.completePaymentFlow
	const handleBackendComplete = useCallback(
		async (paymentPayload) => {
			try {
				const orderId =
					paymentPayload.orderId || useCartStore.getState().orderId; // Ensure orderId is present
				const orderDiscount = useCartStore.getState().orderDiscount; // Get discount from store

				if (!orderId) {
					console.error(
						"PAYMENT FLOW: Missing orderId when completing payment!"
					);
					return false;
				}

				console.log("PAYMENT FLOW: Calling cartActions.completeOrder with:", {
					orderId,
					paymentPayload,
				});

				// Add discount details to the payload before sending
				const finalPayload = {
					...paymentPayload,
					discount_id: orderDiscount?.id,
					discount_amount: orderDiscount
						? calculateCartTotals(
								useCartStore.getState().cart,
								orderDiscount
						  ).discountAmount.toFixed(2)
						: "0.00",
				};

				const result = await cartActions.completeOrder(
					orderId,
					finalPayload // Pass the already structured payload
				);
				console.log("PAYMENT FLOW: cartActions.completeOrder result:", result);

				// Reset discount only AFTER successful completion
				if (result) {
					useCartStore.getState().removeOrderDiscount(); // Use the removal action
				}

				return result; // Return success/failure
			} catch (error) {
				console.error(
					"PAYMENT FLOW: Error calling cartActions.completeOrder:",
					error
				);
				return false; // Indicate failure
			}
		},
		[cartActions] // Dependency array
	);

	// Wrapper for onNewOrder to pass to usePaymentFlow
	const handleNewOrderRequest = useCallback(async () => {
		try {
			useCartStore.getState().clearCart(); // Clear cart state
			await cartActions.startOrder(); // Start a new order via backend
			onBack(); // Call original onBack (likely closes modal)
		} catch (error) {
			console.error("Error handling new order request:", error);
		}
	}, [cartActions, onBack]);

	// Initialize the payment flow hook
	const {
		state,
		setState, // Expose setState if needed by child views
		error,
		isProcessing,
		handleNavigation,
		handleBack,
		processPayment, // This now updates the transactions array in state
		completePaymentFlow, // This now calls handleBackendComplete internally
		isPaymentComplete,
		handleStartNewOrder, // Use the hook's start new order handler
	} = usePaymentFlow({
		totalAmount,
		onComplete: handleBackendComplete, // Pass the wrapper
		onNewOrder: handleNewOrderRequest, // Pass the wrapper
	});

	// Handle back navigation, falling back to the parent onBack if at the start
	const handleBackNavigation = () => {
		const handledByHook = handleBack();
		if (!handledByHook) {
			onBack(); // Call original onBack if the hook didn't handle it
		}
	};

	// Calculate display totals based on the initial total and amount paid from state
	const { subtotal, taxAmount, payableAmount, remainingAmount } =
		calculatePaymentTotals(totalAmount, state.amountPaid);

	// Get the current view component
	const CurrentView = PaymentViews[state.currentView];

	return (
		<div className="w-full h-full flex flex-col bg-slate-50">
			{" "}
			{/* Changed background */}
			<PaymentHeader
				onBack={handleBackNavigation}
				title={`Payment - Order #${state.orderId || "..."}`}
			/>{" "}
			{/* Added Order ID */}
			<div className="flex-1 relative overflow-hidden p-4">
				{/* Moved PaymentStatus inside the animated div parent for context */}
				<AnimatePresence
					initial={false}
					custom={state.direction}
					mode="wait"
				>
					{/* Pass relevant props down to the current view */}
					<CurrentView
						key={state.currentView} // Key for animation
						state={state} // Pass the whole state object
						setState={setState} // Pass setState for direct manipulation if needed
						remainingAmount={remainingAmount} // Pass calculated remaining amount
						handleNavigation={handleNavigation} // Pass navigation handler
						handlePayment={processPayment} // Pass the updated payment processor
						isPaymentComplete={isPaymentComplete} // Pass completion check function
						completePaymentFlow={completePaymentFlow} // Pass the flow completion trigger
						onStartNewOrder={handleStartNewOrder} // Pass the new order handler
						// Pass totalAmount too, as some views might need it
						totalAmount={totalAmount}
					/>
				</AnimatePresence>
				{/* Display global errors and processing status here */}
				<PaymentStatus
					error={error}
					isProcessing={isProcessing}
				/>
			</div>
			{/* Only show summary if not on the completion screen */}
			{state.currentView !== "Completion" && (
				<PaymentSummary
					totalAmount={subtotal} // Use calculated subtotal
					taxAmount={taxAmount}
					payableAmount={payableAmount} // Use calculated payable amount
					amountPaid={state.amountPaid}
				/>
			)}
		</div>
	);
};

PaymentFlow.propTypes = {
	totalAmount: PropTypes.number.isRequired,
	onBack: PropTypes.func.isRequired,
	// onComplete prop is handled internally by usePaymentFlow now
};

export default PaymentFlow;
