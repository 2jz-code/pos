import { useMemo } from "react"; // Added React import
import PropTypes from "prop-types";
// Original imports
import { calculateCartTotals } from "../utils/cartCalculations";
import {
	TagIcon,
	BellAlertIcon,
	CreditCardIcon,
	XCircleIcon,
} from "@heroicons/react/24/solid"; // Use solid icons for buttons/tags

/**
 * CartSummary Component (Logic Preserved from User Provided Code)
 *
 * Displays the subtotal, tax, discount, total, and action buttons (Hold, Discount, Charge).
 * UI updated to match modern styling; Logic remains unchanged based on user input.
 *
 * @param {object} props - Component props.
 * @param {array} props.cart - The current cart items array.
 * @param {function} props.onHoldOrder - Function to handle holding the order.
 * @param {function} props.onCharge - Function to proceed to payment/charge.
 * @param {boolean} props.canHoldOrder - Flag indicating if the order can be held.
 * @param {object|null} props.orderDiscount - The applied order-level discount object.
 * @param {function} props.onShowDiscounts - Function to show the discount selection UI.
 * @param {function} props.onRemoveDiscount - Function to remove the applied order discount.
 */
export const CartSummary = ({
	cart,
	onHoldOrder,
	onCharge,
	canHoldOrder,
	orderDiscount,
	onShowDiscounts,
	onRemoveDiscount,
}) => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const { subtotal, taxAmount, total, discountAmount } = useMemo(() => {
		// console.log("Recalculating cart totals with cart:", cart); // Original console log (commented out for cleaner production)
		return calculateCartTotals(cart, orderDiscount);
	}, [cart, orderDiscount]);

	// Determine if the cart is empty for disabling buttons
	const isCartEmpty = cart.length === 0;
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	return (
		// Main container: Sticky bottom, modern background, border, padding, shadow
		<div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
			{/* Calculation Summary Section */}
			<div className="space-y-1.5 text-sm">
				{" "}
				{/* Reduced spacing slightly */}
				{/* Subtotal Row */}
				<div className="flex justify-between text-slate-600">
					<span>Subtotal</span>
					{/* Display original calculated subtotal */}
					<span>${subtotal.toFixed(2)}</span>
				</div>
				{/* Discount Row - Conditional rendering based on original prop */}
				{orderDiscount && (
					<div className="flex justify-between text-emerald-600">
						<span className="flex items-center gap-1">
							<TagIcon className="h-4 w-4" />
							{/* Display original discount name */}
							Discount ({orderDiscount.name})
							{/* Remove Discount Button - Styled */}
							<button
								onClick={onRemoveDiscount} // Original handler
								className="ml-1 text-red-500 hover:text-red-700 focus:outline-none"
								title="Remove Discount"
							>
								<XCircleIcon className="h-4 w-4" /> {/* Use XCircleIcon */}
							</button>
						</span>
						{/* Display original calculated discount amount */}
						<span>-${discountAmount.toFixed(2)}</span>
					</div>
				)}
				{/* Tax Row */}
				<div className="flex justify-between text-slate-600">
					<span>Tax (10%)</span> {/* Assuming 10% is still correct */}
					{/* Display original calculated tax amount */}
					<span>${taxAmount.toFixed(2)}</span>
				</div>
				{/* Divider */}
				<hr className="border-slate-200 !my-3" />{" "}
				{/* Increased margin for divider */}
				{/* Total Row - Styled */}
				<div className="flex justify-between text-base font-semibold text-slate-800 pt-1">
					{" "}
					{/* Adjusted padding/size */}
					<span>Total</span>
					{/* Display original calculated total */}
					<span>${total.toFixed(2)}</span>
				</div>
			</div>

			{/* Action Buttons Section - Styled Grid */}
			<div className="grid grid-cols-3 gap-3 pt-1">
				{" "}
				{/* Added slight top padding */}
				{/* Hold Button - Styled */}
				<button
					className={`
                        bg-slate-100 text-slate-700 px-3 py-2.5 rounded-lg text-sm
                        transition-colors flex items-center justify-center gap-1.5
                        ${
													!canHoldOrder || isCartEmpty // Use original flags for disabled state
														? "opacity-50 cursor-not-allowed"
														: "hover:bg-slate-200 active:bg-slate-300"
												}
                    `}
					onClick={onHoldOrder} // Original handler
					disabled={!canHoldOrder || isCartEmpty} // Original disabled logic
				>
					<BellAlertIcon className="h-4 w-4" /> {/* Changed icon */}
					Hold
				</button>
				{/* Discount Button - Styled */}
				<button
					className={`
                        bg-amber-100 text-amber-700 px-3 py-2.5 rounded-lg text-sm
                        transition-colors flex items-center justify-center gap-1.5
                        ${
													isCartEmpty // Use original flag for disabled state
														? "opacity-50 cursor-not-allowed"
														: "hover:bg-amber-200 active:bg-amber-300"
												}
                     `}
					onClick={onShowDiscounts} // Original handler
					disabled={isCartEmpty} // Original disabled logic
				>
					<TagIcon className="h-4 w-4" />
					Discount
				</button>
				{/* Charge/Payment Button - Styled */}
				<button
					className={`
                        bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-colors flex items-center justify-center gap-1.5
                        ${
													isCartEmpty // Use original flag for disabled state
														? "opacity-50 cursor-not-allowed bg-blue-400" // Dimmer blue when disabled
														: "hover:bg-blue-700 active:bg-blue-800"
												}
                    `}
					onClick={() => onCharge(total)} // Original handler, passing original total
					disabled={isCartEmpty} // Original disabled logic
				>
					<CreditCardIcon className="h-4 w-4" /> {/* Changed icon */}
					{/* Display original total */}
					Charge ${total.toFixed(2)}
				</button>
			</div>
		</div>
	);
	// --- END OF UPDATED UI ---
};

// --- ORIGINAL PROPTYPES (UNCHANGED) ---
CartSummary.propTypes = {
	cart: PropTypes.array.isRequired,
	onHoldOrder: PropTypes.func.isRequired,
	onCharge: PropTypes.func.isRequired,
	canHoldOrder: PropTypes.bool.isRequired,
	orderDiscount: PropTypes.object, // Can be null or object
	onShowDiscounts: PropTypes.func.isRequired,
	onRemoveDiscount: PropTypes.func.isRequired,
};

// Add display name for consistency
CartSummary.displayName = "CartSummary";

// Default export might be needed
// export default CartSummary; // Uncomment if needed
