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
				<div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
					<div
						className="p-3 flex justify-between items-center cursor-pointer group"
						onClick={onExpand}
					>
						<div className="flex items-center gap-3">
							<ChevronRightIcon
								className={`h-5 w-5 text-slate-400 transition-transform ${
									isExpanded ? "rotate-90" : ""
								}`}
							/>
							{/* Make quantity clickable */}
							<span
								className="text-slate-800 font-medium cursor-pointer hover:bg-blue-50 p-1 rounded"
								onClick={handleQuantityClick} // Use the updated handler
							>
								{item.quantity}
							</span>
							<span className="text-slate-800 font-medium">× {item.name}</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="text-slate-700 font-medium">
								${calculateItemTotal()}
							</span>
							<button
								onClick={handleRemoveClick}
								className="text-red-400 hover:text-red-500 transition-colors"
							>
								<XCircleIcon className="h-5 w-5" />
							</button>
						</div>
					</div>

					{isExpanded && (
						<div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-lg">
							<div className="flex gap-4">
								{/* Quantity Section (Now just displays, click opens keypad) */}
								<div className="flex-1">
									<label className="text-sm font-medium text-slate-600 mb-1 block">
										Quantity
									</label>
									<div
										className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white cursor-pointer text-center"
										onClick={handleQuantityClick} // Use the updated handler
									>
										{parseInt(item.quantity, 10)}
									</div>
								</div>

								{/* Discount Section (Now just displays, click opens keypad) */}
								<div className="flex-1">
									<label className="text-sm font-medium text-slate-600 mb-1 block">
										Discount (%)
									</label>
									<div
										className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white cursor-pointer text-center"
										onClick={handleDiscountClick} // Use the updated handler
									>
										{item.discount || 0}%
									</div>
								</div>
							</div>

							{/* Add discount preview (remains the same) */}
							{getFormattedDiscount() > 0 && (
								<div className="mt-2 text-sm text-green-600">
									Discount: $
									{(
										(item.price * item.quantity * getFormattedDiscount()) /
										100
									).toFixed(2)}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Render Keypad conditionally */}
				{isKeypadOpen && <Keypad {...keypadProps} />}
			</>
		);
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
