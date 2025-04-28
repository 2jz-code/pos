import { useState } from "react"; // Added React import
import { CartItem } from "./CartItem"; // Original import
import PropTypes from "prop-types";
import { normalizeCartItems } from "../utils/cartDataNormalizer"; // Original import
// Import animation components
import { AnimatePresence, motion } from "framer-motion";

/**
 * CartItemList Component (Logic Preserved from User Provided Code)
 *
 * Renders the list of items currently in the cart, handling expansion state.
 * UI updated for a more compact appearance and a smoother "fold" animation;
 * Logic remains unchanged based on user input.
 *
 * @param {object} props - Component props.
 * @param {array} props.items - Array of cart item objects.
 * @param {function} props.onUpdateItem - Function to update an item.
 * @param {function} props.onRemoveItem - Function to remove an item.
 */
export const CartItemList = ({ items, onUpdateItem, onRemoveItem }) => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const [expandedItemId, setExpandedItemId] = useState(null);

	const handleExpand = (itemId) => {
		setExpandedItemId(expandedItemId === itemId ? null : itemId);
	};

	// Defensive programming: ensure items is an array
	const safeItems = Array.isArray(items) ? items : [];

	// Normalize items before rendering
	const normalizedItems = normalizeCartItems(safeItems);
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only - Smoother Fold Animation v2) ---
	// Simplified animation variants for entry/exit (gentle fade)
	const itemVariants = {
		initial: { opacity: 0 }, // Start invisible
		animate: { opacity: 1, transition: { duration: 0.3 } }, // Fade in
		exit: { opacity: 0, transition: { duration: 0.2 } }, // Fade out
	};

	// Define a specific transition for the layout animation (expand/collapse)
	// Use a simpler easeOut curve to prevent overshoot/stretch effect
	const layoutTransition = {
		duration: 0.25, // Slightly faster duration
		ease: "easeOut", // Standard deceleration curve
	};

	return (
		// Main container: Takes available space, enables vertical scrolling.
		// Reduced padding (p-2), removed space-y, using subtle divider for separation.
		<div className="flex-1 overflow-y-auto p-2 custom-scrollbar divide-y divide-slate-100">
			{/* Original conditional rendering for empty cart */}
			{normalizedItems.length === 0 ? (
				// Styled empty cart message - reduced vertical padding
				<p className="text-slate-400 text-center py-6 px-4 text-sm">
					{" "}
					{/* Slightly smaller text */}
					No items in cart yet.
				</p>
			) : (
				// Use AnimatePresence for item animations (UI enhancement, optional)
				<AnimatePresence initial={false}>
					{/* Map over original normalizedItems */}
					{normalizedItems.map((item) => (
						// Wrap CartItem in motion.div for animation
						<motion.div
							key={item.id} // Original key
							layout // Animate layout changes
							variants={itemVariants}
							initial="initial"
							animate="animate"
							exit="exit"
							// Apply the updated custom layout transition
							transition={layoutTransition}
						>
							{/* Render original CartItem component */}
							{/* NOTE: For a truly compact list, the internal padding/margins */}
							{/* within CartItem.jsx itself would also need reduction. */}
							<CartItem
								key={item.id} // Pass key again if needed by CartItem itself
								item={item} // Pass original item
								// Pass original expansion state and handler
								isExpanded={expandedItemId === item.id}
								onExpand={() => handleExpand(item.id)}
								// Pass original update/remove handlers
								onUpdate={onUpdateItem}
								onRemove={onRemoveItem}
							/>
						</motion.div>
					))}
				</AnimatePresence>
			)}
		</div>
	);
	// --- END OF UPDATED UI ---
};

// --- ORIGINAL PROPTYPES (UNCHANGED) ---
CartItemList.propTypes = {
	items: PropTypes.arrayOf(
		PropTypes.shape({
			// Adjusted id proptype based on previous CartItem update
			id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
			name: PropTypes.string.isRequired,
			price: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
				.isRequired,
			quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
				.isRequired,
			discount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		})
	).isRequired,
	onUpdateItem: PropTypes.func.isRequired,
	onRemoveItem: PropTypes.func.isRequired,
};

// Add display name for consistency
CartItemList.displayName = "CartItemList";

// Default export might be needed
// export default CartItemList; // Uncomment if needed
