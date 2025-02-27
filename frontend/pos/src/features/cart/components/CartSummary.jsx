// src/features/cart/components/CartSummary.jsx
import PropTypes from "prop-types";
import { calculateCartTotals } from "../utils/cartCalculations";

export const CartSummary = ({ cart, onHoldOrder, onCharge, canHoldOrder }) => {
	const { subtotal, taxAmount, total } = calculateCartTotals(cart);

	return (
		<div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
			<div className="space-y-2">
				<div className="flex justify-between text-slate-600">
					<span>Subtotal</span>
					<span>${subtotal.toFixed(2)}</span>
				</div>
				<div className="flex justify-between text-slate-600">
					<span>Tax (10%)</span>
					<span>${taxAmount.toFixed(2)}</span>
				</div>
				<div className="flex justify-between text-lg font-semibold text-slate-800 pt-2 border-t border-slate-100">
					<span>Total</span>
					<span>${total.toFixed(2)}</span>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<button
					className={`
			  bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg 
			  transition-colors flex items-center justify-center
			  ${!canHoldOrder ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200"}
			`}
					onClick={onHoldOrder}
					disabled={!canHoldOrder}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 mr-1.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
						/>
					</svg>
					Hold Order
				</button>
				<button
					className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
					onClick={() => onCharge(total)}
					disabled={cart.length === 0}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 mr-1.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
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
