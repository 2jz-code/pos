// src/features/cart/components/CartSummary.jsx
import PropTypes from "prop-types";
import { calculateCartTotals } from "../utils/cartCalculations";

export const CartSummary = ({ cart, onHoldOrder, onCharge, canHoldOrder }) => {
	const { subtotal, taxAmount, total } = calculateCartTotals(cart);

	return (
		<div className="sticky bottom-0 bg-white border-t border-gray-300 p-4 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
			<div className="space-y-2">
				<div className="flex justify-between text-gray-600">
					<span>Subtotal</span>
					<span>${subtotal.toFixed(2)}</span>
				</div>
				<div className="flex justify-between text-gray-600">
					<span>Tax (10%)</span>
					<span>${taxAmount.toFixed(2)}</span>
				</div>
				<div className="flex justify-between text-lg font-semibold text-gray-800">
					<span>Total</span>
					<span>${total.toFixed(2)}</span>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<button
					className={`
            bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg 
            transition-colors
            ${
							!canHoldOrder
								? "opacity-50 cursor-not-allowed"
								: "hover:bg-gray-200"
						}
          `}
					onClick={onHoldOrder}
					disabled={!canHoldOrder}
				>
					Hold Order
				</button>
				<button
					className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
					onClick={() => onCharge(total)}
					disabled={cart.length === 0}
				>
					Charge ${total.toFixed(2)}
				</button>
			</div>
		</div>
	);
};

CartSummary.propTypes = {
	cart: PropTypes.array.isRequired,
	onHoldOrder: PropTypes.func.isRequired,
	onCharge: PropTypes.func.isRequired,
	canHoldOrder: PropTypes.bool.isRequired,
};
