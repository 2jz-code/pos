import { memo, useState, useEffect } from "react";
import { ChevronRightIcon, XCircleIcon } from "@heroicons/react/24/solid";
import PropTypes from "prop-types";
import { ensureNumber, formatPrice } from "../../../utils/numberUtils";

export const CartItem = memo(
	({ item, isExpanded, onExpand, onUpdate, onRemove }) => {
		// Local state for discount input
		const [localDiscount, setLocalDiscount] = useState(
			item.discount !== undefined ? item.discount.toString() : ""
		);

		// Update local state when item.discount changes from outside
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

		// Handle quantity updates
		const handleQuantityUpdate = (newQuantity) => {
			// Ensure we're working with numbers
			const updatedQuantity = parseInt(newQuantity, 10);

			if (Number.isFinite(updatedQuantity) && updatedQuantity > 0) {
				onUpdate(item.id, updatedQuantity); // Pass the number directly
			}
		};

		// Handle discount input changes
		const handleDiscountChange = (e) => {
			const inputValue = e.target.value;

			// Only allow digits and limit input length to 3 characters
			if (/^\d{0,3}$/.test(inputValue)) {
				// Always update local state for responsive UI
				setLocalDiscount(inputValue);

				// Only update the actual discount when we have valid input
				if (inputValue !== "") {
					// Apply maximum limit during input
					const numericValue = Math.min(100, parseInt(inputValue) || 0);

					// If user tries to enter >100, cap the displayed value too
					if (parseInt(inputValue) > 100) {
						setLocalDiscount("100");
					}

					// Update the discount in the store - be explicit about the object structure
					console.log("Updating discount to:", numericValue);
					onUpdate(item.id, { discount: numericValue });
				} else {
					// If field is empty, set discount to 0 but don't update yet
					// This allows user to clear the field and type a new value
					console.log("Empty discount field");
				}
			}
		};

		// Ensure valid value on blur
		const handleDiscountBlur = () => {
			let finalValue = 0;
			if (localDiscount !== "") {
				finalValue = Math.min(100, Math.max(0, parseInt(localDiscount) || 0));
			}

			// Update both local state and store
			setLocalDiscount(finalValue.toString());
			onUpdate(item.id, { discount: finalValue });
		};

		return (
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
						<span className="text-slate-800 font-medium">
							{item.quantity} × {item.name}
						</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-slate-700 font-medium">
							${calculateItemTotal()}
						</span>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onRemove(item.id);
							}}
							className="text-red-400 hover:text-red-500 transition-colors"
						>
							<XCircleIcon className="h-5 w-5" />
						</button>
					</div>
				</div>

				{isExpanded && (
					<div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-lg">
						<div className="flex gap-4">
							<div className="flex-1">
								<label className="text-sm font-medium text-slate-600 mb-1 block">
									Quantity
								</label>
								<div className="flex items-center gap-2">
									<button
										onClick={(e) => {
											e.stopPropagation();
											const currentQuantity = parseInt(item.quantity, 10);
											if (currentQuantity > 1) {
												handleQuantityUpdate(currentQuantity - 1);
											}
										}}
										disabled={item.quantity <= 1}
										className="px-3 py-1 bg-white rounded-md border border-slate-200 hover:bg-slate-50 
                    transition-colors disabled:opacity-50 
                    disabled:cursor-not-allowed"
									>
										-
									</button>
									<span className="px-3 py-1 min-w-[40px] text-center bg-white border border-slate-200 rounded-md">
										{parseInt(item.quantity, 10)}
									</span>
									<button
										onClick={(e) => {
											e.stopPropagation();
											const currentQuantity = parseInt(item.quantity, 10);
											handleQuantityUpdate(currentQuantity + 1);
										}}
										className="px-3 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-50 
                    transition-colors"
									>
										+
									</button>
								</div>
							</div>

							<div className="flex-1">
								<label className="text-sm font-medium text-slate-600 mb-1 block">
									Discount (%)
								</label>
								<input
									type="text"
									pattern="\d*"
									inputMode="numeric"
									className="w-full px-3 py-2 border border-slate-200 rounded-md 
                  focus:ring-2 focus:ring-blue-500"
									value={localDiscount}
									onClick={(e) => e.stopPropagation()}
									onChange={handleDiscountChange}
									onBlur={handleDiscountBlur}
									placeholder="0"
									maxLength={3}
								/>
							</div>
						</div>

						{/* Add discount preview */}
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
