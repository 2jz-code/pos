// src/features/cart/components/CartItemList.jsx
import { useState } from "react";
import { CartItem } from "./CartItem";
import PropTypes from "prop-types";
import { normalizeCartItems } from "../utils/cartDataNormalizer";

export const CartItemList = ({ items, onUpdateItem, onRemoveItem }) => {
	const [expandedItemId, setExpandedItemId] = useState(null);

	const handleExpand = (itemId) => {
		setExpandedItemId(expandedItemId === itemId ? null : itemId);
	};

	// Defensive programming: ensure items is an array
	const safeItems = Array.isArray(items) ? items : [];

	// Normalize items before rendering
	const normalizedItems = normalizeCartItems(safeItems);

	return (
		<div className="flex-1 overflow-y-auto p-4 space-y-3">
			{normalizedItems.length === 0 ? (
				<p className="text-gray-400 text-center py-8">No items in cart</p>
			) : (
				normalizedItems.map((item) => (
					<CartItem
						key={item.id}
						item={item}
						isExpanded={expandedItemId === item.id}
						onExpand={() => handleExpand(item.id)}
						onUpdate={onUpdateItem}
						onRemove={onRemoveItem}
					/>
				))
			)}
		</div>
	);
};

CartItemList.propTypes = {
	items: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.number.isRequired,
			name: PropTypes.string.isRequired,
			price: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
				.isRequired,
			quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
				.isRequired,
			discount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), // Remove undefined from oneOfType
		})
	).isRequired,
	onUpdateItem: PropTypes.func.isRequired,
	onRemoveItem: PropTypes.func.isRequired,
};
