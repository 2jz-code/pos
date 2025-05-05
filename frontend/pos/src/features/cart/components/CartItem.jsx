// combined-project/src-pos/features/cart/components/CartItem.jsx

import { memo, useState, useEffect } from "react";
import { ChevronRightIcon, XCircleIcon } from "@heroicons/react/24/solid";
import PropTypes from "prop-types";
import { ensureNumber, formatPrice } from "../../../utils/numberUtils";
import { useKeypad } from "../../../hooks/useKeypad"; // Import useKeypad
import { Keypad } from "../../../components/keypad/Keypad"; // Import Keypad component

export const CartItem = memo(
	({ item, isExpanded, onExpand, onUpdate, onRemove }) => {
		// Use the keypad hook
		const { isKeypadOpen, keypadProps, openKeypad } = useKeypad();

		// Local state for discount input (remains the same)
		const [localDiscount, setLocalDiscount] = useState(
			item.discount !== undefined ? item.discount.toString() : ""
		);

		useEffect(() => {
			if (item.discount !== undefined) {
				setLocalDiscount(item.discount.toString());
			}
		}, [item.discount]);

		// Add validation and safe number conversion
		const calculateItemTotal = () => {
			const price = ensureNumber(item.price);
			const quantity = ensureNumber(item.quantity);
			const discountPercent = ensureNumber(item.discount);

			const basePrice = price * quantity;
			const discount = basePrice * (discountPercent / 100);
			return formatPrice(basePrice - discount);
		};

		const getFormattedDiscount = () => {
			if (localDiscount === "") return "";
			const numericDiscount = parseInt(localDiscount, 10);
			return Number.isFinite(numericDiscount) ? numericDiscount : 0;
		};

		// --- Keypad Integration ---

		// Function to open keypad for quantity - pass empty string for value
		const handleQuantityClick = (e) => {
			e.stopPropagation();
			openKeypad({
				// Reset value to empty string when opening
				value: "",
				onChange: (newValue) => {
					const updatedQuantity = parseInt(newValue, 10);
					// Only update if a valid number is entered
					if (Number.isFinite(updatedQuantity) && updatedQuantity > 0) {
						onUpdate(item.id, updatedQuantity);
					} else if (newValue === "" || updatedQuantity <= 0) {
						// If cleared or invalid, maybe default to 1 or keep previous?
						// Let's default to 1 if empty or invalid for quantity
						onUpdate(item.id, 1);
					}
				},
				title: `Quantity for ${item.name}`,
				maxLength: 3,
				decimal: false,
			});
		};

		// Function to open keypad for discount - pass empty string for value
		const handleDiscountClick = (e) => {
			e.stopPropagation();
			openKeypad({
				// Reset value to empty string when opening
				value: "",
				onChange: (newValue) => {
					let numericValue = 0;
					if (newValue !== "") {
						numericValue = Math.min(100, Math.max(0, parseInt(newValue) || 0));
					}
					// Update local state immediately for display (if needed)
					// setLocalDiscount(String(numericValue));
					// Update the actual cart state
					onUpdate(item.id, { discount: numericValue });
				},
				title: `Discount (%) for ${item.name}`,
				maxLength: 3,
				decimal: false,
			});
		};

		// --- End Keypad Integration ---

		// Handle removing the item
		const handleRemoveClick = (e) => {
			e.stopPropagation();
			onRemove(item.id);
		};

		return (
			<>
				{/* Main item container - Apply modern styling */}
				{/* Use py-1 instead of full bg for slightly tighter list */}
				<div className="py-1">
					<div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-shadow duration-150 ease-in-out">
						{/* Clickable main row */}
						<div
							className="p-3 flex justify-between items-center cursor-pointer group"
							onClick={onExpand} // Original handler
						>
							{/* Left side: Expand icon, Quantity, Name */}
							<div className="flex items-center gap-3 flex-1 min-w-0">
								{" "}
								{/* Added flex-1 and min-w-0 */}
								<ChevronRightIcon
									className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
										isExpanded ? "rotate-90" : "" // Original logic
									}`}
								/>
								{/* Quantity - Styled to look clickable */}
								<span
									className="text-sm text-slate-800 font-medium cursor-pointer hover:bg-blue-50 active:bg-blue-100 px-2 py-1 rounded-md transition-colors"
									onClick={handleQuantityClick} // Original handler
									title="Click to edit quantity"
								>
									{item.quantity}
								</span>
								{/* Item Name - Allow truncation */}
								<span
									className="text-sm text-slate-800 font-medium truncate"
									title={item.name}
								>
									× {item.name}
								</span>
							</div>
							{/* Right side: Total Price, Remove Button */}
							<div className="flex items-center gap-2 flex-shrink-0 ml-2">
								{" "}
								{/* Added flex-shrink-0 and margin */}
								{/* Calculated Total */}
								<span className="text-sm text-slate-700 font-semibold w-16 text-right">
									{" "}
									{/* Added width and text-right */}
									{calculateItemTotal()} {/* Original function */}
								</span>
								{/* Remove Button - Styled */}
								<button
									onClick={handleRemoveClick} // Original handler
									className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors duration-150 ease-in-out"
									title="Remove item"
								>
									<XCircleIcon className="h-5 w-5" />
								</button>
							</div>
						</div>

						{/* Expanded Section - Conditionally rendered based on original prop */}
						{isExpanded && (
							<div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-lg">
								<div className="flex gap-4">
									{/* Quantity Section - Styled clickable div */}
									<div className="flex-1">
										<label className="text-xs font-medium text-slate-600 mb-1 block">
											Quantity
										</label>
										<div
											className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 cursor-pointer text-center text-sm transition-colors"
											onClick={handleQuantityClick} // Original handler
											title="Click to edit quantity"
										>
											{/* Display original quantity */}
											{item.quantity}
										</div>
									</div>

									{/* Discount Section - Styled clickable div */}
									<div className="flex-1">
										<label className="text-xs font-medium text-slate-600 mb-1 block">
											Discount (%)
										</label>
										<div
											className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 cursor-pointer text-center text-sm transition-colors"
											onClick={handleDiscountClick} // Original handler
											title="Click to edit discount"
										>
											{/* Display original discount */}
											{ensureNumber(item.discount)}%
										</div>
									</div>
								</div>

								{/* Discount Preview - Conditionally rendered based on original logic/value */}
								{ensureNumber(item.discount) > 0 && (
									<div className="mt-2 text-xs text-emerald-600">
										Discount Amount: {getFormattedDiscount()}%
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Keypad Rendering - Conditionally rendered based on original state */}
				{isKeypadOpen && <Keypad {...keypadProps} />}
			</>
		);
		// --- END OF UPDATED UI ---
	}
);

CartItem.propTypes = {
	item: PropTypes.shape({
		id: PropTypes.number.isRequired,
		name: PropTypes.string.isRequired,
		price: PropTypes.number.isRequired,
		quantity: PropTypes.number.isRequired,
		discount: PropTypes.number,
	}).isRequired,
	isExpanded: PropTypes.bool.isRequired,
	onExpand: PropTypes.func.isRequired,
	onUpdate: PropTypes.func.isRequired,
	onRemove: PropTypes.func.isRequired,
};

CartItem.displayName = "CartItem";
