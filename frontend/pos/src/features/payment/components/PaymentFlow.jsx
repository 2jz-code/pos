import { AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { useCallback } from "react";
import { PaymentHeader } from "./PaymentHeader";
import { PaymentSummary } from "./PaymentSummary";
import { PaymentStatus } from "./PaymentStatus";
import { usePaymentFlow } from "../hooks/usePaymentFlow";
import { usePaymentValidation } from "../hooks/usePaymentValidation";
import { calculatePaymentTotals } from "../utils/paymentCalculations";
import { PaymentViews } from "../views";
import { useCartActions } from "../../cart/hooks/useCartActions";
import { useCartStore } from "../../../store/cartStore";

export const PaymentFlow = ({ totalAmount, onBack }) => {
	const cartActions = useCartActions();

	const handleNewOrder = useCallback(async () => {
		try {
			useCartStore.getState().clearCart();
			await cartActions.startOrder();
			onBack();
		} catch (error) {
			console.error("Error handling new order:", error);
		}
	}, [cartActions, onBack]);

	const handleComplete = useCallback(
		async (paymentDetails) => {
			try {
				// Ensure orderId is available
				const orderId = useCartStore.getState().orderId;

				if (!orderId) {
					console.error(
						"PAYMENT CHAIN: Missing orderId when completing payment!"
					);
					return false;
				}

				console.log("PAYMENT CHAIN: Completing order with payment details:", {
					orderId,
					paymentMethod: paymentDetails.paymentMethod,
					transactionId: paymentDetails.transactionId,
					amount: paymentDetails.amount,
				});

				// CRITICAL FIX: Ensure we're calling the right method with correct parameters
				const completePaymentDetails = {
					...paymentDetails,
					orderId: orderId,
				};

				// CRITICAL FIX: Add explicit try/catch for better error handling
				try {
					console.log(
						"PAYMENT CHAIN: Calling cartActions.completeOrder with orderId:",
						orderId
					);
					const result = await cartActions.completeOrder(
						orderId,
						completePaymentDetails
					);
					console.log("PAYMENT CHAIN: completeOrder result:", result);
					return true;
				} catch (error) {
					console.error(
						"PAYMENT CHAIN: Error in cartActions.completeOrder:",
						error
					);
					// Check if there's a response with more details
					if (error.response) {
						console.error("PAYMENT CHAIN: API error details:", {
							status: error.response.status,
							data: error.response.data,
						});
					}
					return false;
				}
			} catch (error) {
				console.error("PAYMENT CHAIN: Error in handleComplete:", error);
				return false;
			}
		},
		[cartActions]
	);

	const {
		state,
		setState,
		error,
		isProcessing,
		handleNavigation,
		handleBack,
		processPayment,
		completePaymentFlow,
		isPaymentComplete,
		handleStartNewOrder,
	} = usePaymentFlow({
		totalAmount,
		onComplete: handleComplete, // Use our wrapper function
		onNewOrder: handleNewOrder,
	});

	const handleBackNavigation = () => {
		const handled = handleBack();
		if (!handled) {
			onBack();
		}
	};

	const { subtotal, taxAmount, payableAmount, remainingAmount } =
		calculatePaymentTotals(totalAmount, state.amountPaid);

	const validation = usePaymentValidation(state, totalAmount);
	const CurrentView = PaymentViews[state.currentView];

	return (
		<div className="w-full h-full flex flex-col bg-white">
			<PaymentHeader onBack={handleBackNavigation} />
			<div className="flex-1 relative overflow-hidden p-4">
				<PaymentStatus
					error={error}
					isProcessing={isProcessing}
				/>
				<AnimatePresence
					initial={false}
					custom={state.direction}
					mode="wait"
				>
					<CurrentView
						key={state.currentView}
						state={state}
						setState={setState}
						remainingAmount={remainingAmount}
						handleNavigation={handleNavigation}
						handlePayment={processPayment}
						validation={validation}
						isPaymentComplete={isPaymentComplete}
						completePaymentFlow={completePaymentFlow}
						onStartNewOrder={handleStartNewOrder}
					/>
				</AnimatePresence>
			</div>
			<PaymentSummary
				totalAmount={subtotal}
				taxAmount={taxAmount}
				payableAmount={payableAmount}
				amountPaid={state.amountPaid}
			/>
		</div>
	);
};

PaymentFlow.propTypes = {
	totalAmount: PropTypes.number.isRequired,
	onBack: PropTypes.func.isRequired,
	onComplete: PropTypes.func.isRequired,
};

export default PaymentFlow;
