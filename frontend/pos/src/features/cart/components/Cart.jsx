// src/features/cart/components/Cart.jsx
import { useState } from "react";
import { useCart } from "../hooks/useCart";
import { useCartActions } from "../hooks/useCartActions";
import { CartHeader } from "./CartHeader";
import { CartItemList } from "./CartItemList";
import { CartSummary } from "./CartSummary";
import { useOrderValidation } from "../../../utils/useOrderValidation";
import PaymentFlow from "../../payment/components/PaymentFlow";
import { calculateCartTotals } from "../utils/cartCalculations";
import axiosInstance from "../../../api/config/axiosConfig";
import DiscountSelector from "../../../components/discounts/DiscountSelector";
import { useCartStore } from "../../../store/cartStore";

export const Cart = () => {
	const { cart, orderId, showOverlay, orderDiscount } = useCart();
	const { updateItemQuantity, removeFromCart } = useCartActions();
	const cartActions = useCartActions();
	const [isPaymentFlow, setIsPaymentFlow] = useState(false);
	const [showDiscountSelector, setShowDiscountSelector] = useState(false);
	const { canHoldOrder } = useOrderValidation(cart, orderId);

	// Get setOrderDiscount and removeOrderDiscount from the store
	const setOrderDiscount = useCartStore((state) => state.setOrderDiscount);
	const removeOrderDiscount = useCartStore(
		(state) => state.removeOrderDiscount
	);

	const handlePaymentComplete = async (paymentDetails) => {
		try {
			console.log("1. Payment completion started");
			const success = await cartActions.completeOrder(orderId, paymentDetails);
			console.log("2. Complete order result:", success);

			if (success) {
				console.log("3. Payment successful - keeping payment flow open");
				return true;
			}

			console.log("4. Payment failed");
			return false;
		} catch (error) {
			console.error("5. Payment completion error:", error);
			return false;
		}
	};

	const handleApplyDiscount = (discount) => {
		setOrderDiscount(discount);
	};

	// Calculate cart totals once to avoid recalculation
	const cartTotals = calculateCartTotals(cart, orderDiscount);

	return (
		<div className="relative w-full bg-white flex flex-col border-l border-slate-200 shadow-lg h-full">
			<CartHeader
				activeOrderId={orderId}
				setActiveOrderId={cartActions.setOrderId}
				clearCart={cartActions.clearCart}
				setShowOverlay={cartActions.setShowOverlay}
				startNewOrder={cartActions.startOrder}
				axiosInstance={axiosInstance}
			/>

			{showOverlay ? (
				<div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center">
					<button
						className="px-8 py-3.5 bg-blue-600 text-white rounded-lg shadow-lg text-lg hover:bg-blue-700 transition-all flex items-center gap-2 group"
						onClick={cartActions.startOrder}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6 group-hover:scale-110 transition-transform"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
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
						orderDiscount={orderDiscount}
						onShowDiscounts={() => setShowDiscountSelector(true)}
						onRemoveDiscount={removeOrderDiscount}
					/>
				</>
			)}

			{isPaymentFlow && (
				<div className="absolute inset-0 bg-white z-20">
					<PaymentFlow
						totalAmount={cartTotals.total}
						onBack={() => setIsPaymentFlow(false)}
						onComplete={handlePaymentComplete}
					/>
				</div>
			)}

			{/* Discount Selector Modal */}
			{showDiscountSelector && (
				<DiscountSelector
					isOpen={showDiscountSelector}
					onClose={() => setShowDiscountSelector(false)}
					onSelectDiscount={handleApplyDiscount}
					orderId={orderId}
				/>
			)}
		</div>
	);
};

export default Cart;
