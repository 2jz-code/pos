// src/features/cart/utils/cartDataNormalizer.js
export const normalizeCartItem = (item) => {
	// Guard clause for undefined/null items
	if (!item) {
		console.warn("Attempted to normalize undefined/null item");
		return null;
	}

	try {
		const normalizedPrice =
			typeof item.price === "string" ? parseFloat(item.price) : item.price;

		if (isNaN(normalizedPrice)) {
			console.error(`Invalid price value for item ${item.id}: ${item.price}`);
			return null;
		}

		return {
			...item,
			price: normalizedPrice,
			quantity:
				typeof item.quantity === "string"
					? parseInt(item.quantity, 10)
					: item.quantity,
			discount:
				item.discount != null
					? typeof item.discount === "string"
						? parseFloat(item.discount)
						: item.discount
					: 0,
		};
	} catch (error) {
		console.error("Error normalizing cart item:", error);
		return null;
	}
};

// Add the normalizeCartItems function
export const normalizeCartItems = (items) => {
	if (!Array.isArray(items)) {
		console.warn("normalizeCartItems received non-array input:", items);
		return [];
	}

	return items.map(normalizeCartItem).filter((item) => item !== null); // Remove any null items
};
