// src/features/cart/components/Cart.jsx
import { useState } from "react";
import { useCart } from "../hooks/useCart";
import { useCartActions } from "../hooks/useCartActions";
import { CartHeader } from "./CartHeader";
import { CartItemList } from "./CartItemList";
import { CartSummary } from "./CartSummary";
import { useOrderValidation } from "../../../utils/useOrderValidation";
import PaymentFlow from "../../payment/components/PaymentFlow";
import { calculateCartTotals } from "../utils/cartCalculations"; // Add this import
import axiosInstance from "../../../api/config/axiosConfig";

export const Cart = () => {
  const { cart, orderId, showOverlay } = useCart();
  const { updateItemQuantity, removeFromCart } = useCartActions();
  const cartActions = useCartActions();
  const [isPaymentFlow, setIsPaymentFlow] = useState(false);
  const { canHoldOrder } = useOrderValidation(cart, orderId);

  const handlePaymentComplete = async (paymentDetails) => {
    try {
      console.log('1. Payment completion started');
      const success = await cartActions.completeOrder(orderId, paymentDetails);
      console.log('2. Complete order result:', success);
      
      if (success) {
        // Don't immediately close payment flow - wait for completion view
        console.log('3. Payment successful - keeping payment flow open');
        return true;
      }
      
      console.log('4. Payment failed');
      return false;
    } catch (error) {
      console.error("5. Payment completion error:", error);
      return false;
    }
  };

  // Calculate cart totals once to avoid recalculation
  const cartTotals = calculateCartTotals(cart);

  return (
    <div className="relative w-1/3 bg-white flex flex-col border-l border-gray-300 shadow-lg h-full">
      <CartHeader
        activeOrderId={orderId}
        setActiveOrderId={cartActions.setOrderId}
        clearCart={cartActions.clearCart}
        setShowOverlay={cartActions.setShowOverlay}
        startNewOrder={cartActions.startOrder}
        axiosInstance={axiosInstance}
      />

      {showOverlay ? (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center">
          <button
            className="px-8 py-3 bg-blue-600 text-white rounded-lg shadow-lg text-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            onClick={cartActions.startOrder}
          >
            <span>Start New Order</span>
          </button>
        </div>
      ) : (
        <>
          <CartItemList
            items={cart}
            onUpdateItem={updateItemQuantity}
            onRemoveItem={removeFromCart}
          />
          <CartSummary
            cart={cart}
            onHoldOrder={() => cartActions.holdOrder(orderId, cart)}
            onCharge={() => setIsPaymentFlow(true)}
            canHoldOrder={canHoldOrder}
          />
        </>
      )}

      {isPaymentFlow && (
        <div className="absolute inset-0 bg-white">
          <PaymentFlow
            totalAmount={cartTotals.total}
            onBack={() => setIsPaymentFlow(false)}
            onComplete={handlePaymentComplete}
          />
        </div>
      )}
    </div>
  );
};

export default Cart;
