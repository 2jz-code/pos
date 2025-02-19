import { AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { useEffect, useCallback } from "react";
import { PaymentHeader } from "./PaymentHeader";
import { PaymentSummary } from "./PaymentSummary";
import { PaymentStatus } from "./PaymentStatus";
import { usePaymentFlow } from "../hooks/usePaymentFlow";
import { usePaymentValidation } from "../hooks/usePaymentValidation";
import { calculatePaymentTotals } from "../utils/paymentCalculations";
import { PaymentViews } from "../views";
import { useCartActions } from "../../cart/hooks/useCartActions";
import { useCartStore } from "../../../store/cartStore";

export const PaymentFlow = ({ totalAmount, onBack, onComplete }) => {
  const cartActions = useCartActions(); // Add this

  const handleNewOrder = useCallback(async () => {
    try {
      // Clear cart and start new order using cart actions
      useCartStore.getState().clearCart();
      await cartActions.startOrder();
      onBack(); // Close payment flow
    } catch (error) {
      console.error("Error handling new order:", error);
    }
  }, [cartActions, onBack]);

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
    onComplete,
    onNewOrder: handleNewOrder, // Pass the handler
  });

  console.log("PaymentFlow rendering with view:", state.currentView);
  useEffect(() => {
    console.log("View changed:", {
      currentView: state.currentView,
      component: PaymentViews[state.currentView]?.name,
      hasView: !!PaymentViews[state.currentView],
    });
  }, [state.currentView]);

  const handleBackNavigation = () => {
    const handled = handleBack();
    if (!handled) {
      onBack(); // Only call parent's onBack if we're at the root
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
        <PaymentStatus error={error} isProcessing={isProcessing} />
        <AnimatePresence initial={false} custom={state.direction} mode="wait">
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
