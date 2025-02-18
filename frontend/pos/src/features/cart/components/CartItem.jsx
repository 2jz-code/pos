// src/features/cart/components/CartItem.jsx
import { memo } from "react";
import { ChevronRightIcon, XCircleIcon } from "@heroicons/react/24/solid";
import PropTypes from "prop-types";
import { ensureNumber, formatPrice } from "../../../utils/numberUtils";

export const CartItem = memo(
	({ item, isExpanded, onExpand, onUpdate, onRemove }) => {
		// Add validation and safe number conversion
		const calculateItemTotal = () => {
			const price = ensureNumber(item.price);
			const quantity = ensureNumber(item.quantity);
			const discountPercent = ensureNumber(item.discount);

			const basePrice = price * quantity;
			const discount = basePrice * (discountPercent / 100);
			return formatPrice(basePrice - discount);
		};

		// Add debugging for item updates
		const handleQuantityUpdate = (newQuantity) => {
			// Ensure we're working with numbers
			const updatedQuantity = parseInt(newQuantity, 10);

			if (Number.isFinite(updatedQuantity) && updatedQuantity > 0) {
				onUpdate(item.id, updatedQuantity); // Pass the number directly
			}
		};

		return (
			<div className="bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow">
				<div
					className="p-3 flex justify-between items-center cursor-pointer group"
					onClick={onExpand}
				>
					<div className="flex items-center gap-3">
						<ChevronRightIcon
							className={`h-5 w-5 text-gray-400 transition-transform ${
								isExpanded ? "rotate-90" : ""
							}`}
						/>
						<span className="text-gray-800 font-medium">
							{item.quantity} × {item.name}
						</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-gray-700 font-medium">
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
					<div className="p-3 border-t border-gray-300">
						<div className="flex gap-4">
							<div className="flex-1">
								<label className="text-sm font-medium text-gray-600 mb-1 block">
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
										className="px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200 
                         transition-colors disabled:opacity-50 
                         disabled:cursor-not-allowed"
									>
										-
									</button>
									<span className="px-3 py-1 min-w-[40px] text-center">
										{parseInt(item.quantity, 10)}
									</span>
									<button
										onClick={(e) => {
											e.stopPropagation();
											const currentQuantity = parseInt(item.quantity, 10);
											handleQuantityUpdate(currentQuantity + 1);
										}}
										className="px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200 
                         transition-colors"
									>
										+
									</button>
								</div>
							</div>

							<div className="flex-1">
								<label className="text-sm font-medium text-gray-600 mb-1 block">
									Discount (%)
								</label>
								<input
									type="number"
									min="0"
									max="100"
									className="w-full px-3 py-2 border border-gray-300 rounded-md 
                                             focus:ring-2 focus:ring-blue-500"
									value={item.discount || ""}
									onClick={(e) => e.stopPropagation()}
									onChange={(e) => {
										const value = Math.min(
											100,
											Math.max(0, parseInt(e.target.value) || 0)
										);
										onUpdate(item.id, { discount: value });
									}}
								/>
							</div>
						</div>
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
