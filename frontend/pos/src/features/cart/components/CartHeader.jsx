import PropTypes from "prop-types";
// Original component imports
import OrderCancellation from "../../../components/OrderCancellation";
import RewardsAccessButton from "../../../components/rewards/RewardsAccessButton";
// Original store import
import { useCartStore } from "../../../store/cartStore";
// Icons for styling
import { ShoppingCartIcon, PlusIcon } from "@heroicons/react/24/outline"; // Using outline icons for consistency

/**
 * CartHeader Component (Logic Preserved from User Provided Code)
 *
 * Displays the title and action buttons (Rewards, Cancel, New Order).
 * UI updated to match modern styling; Logic remains unchanged based on user input.
 *
 * @param {object} props - Component props.
 * @param {number|null} props.activeOrderId - The ID of the currently active order, or null.
 * @param {function} props.setActiveOrderId - Function to set the active order ID.
 * @param {function} props.clearCart - Function to clear the cart contents.
 * @param {function} props.setShowOverlay - Function to control an overlay display.
 * @param {function} props.startNewOrder - Function to initiate a new order.
 * @param {object} props.axiosInstance - Axios instance for API calls (likely passed to OrderCancellation).
 */
export const CartHeader = ({
	activeOrderId,
	setActiveOrderId,
	clearCart,
	setShowOverlay,
	startNewOrder,
	axiosInstance,
}) => {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const rewardsProfile = useCartStore((state) => state.rewardsProfile);
	const setRewardsProfile = useCartStore((state) => state.setRewardsProfile);

	const handleRewardsMemberAuthenticated = (profile) => {
		setRewardsProfile(profile);
	};

	const handleRewardsMemberRemoved = () => {
		setRewardsProfile(null);
	};
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	return (
		// Apply modern padding, background, and border
		<div className="p-4 bg-slate-50 border-b border-slate-200">
			<div className="flex items-center justify-between flex-wrap gap-2">
				{" "}
				{/* Added flex-wrap and gap */}
				{/* Title with Icon */}
				<div className="flex items-center gap-2">
					<ShoppingCartIcon className="h-6 w-6 text-slate-600" />
					<h2 className="text-lg font-semibold text-slate-800">
						Order Summary
					</h2>{" "}
					{/* Adjusted font size */}
				</div>
				{/* Action Buttons Container */}
				<div className="flex gap-2 items-center">
					{/* Rewards Button - Apply consistent styling */}
					<RewardsAccessButton
						// Pass original props
						onUserAuthenticated={handleRewardsMemberAuthenticated}
						onUserRemoved={handleRewardsMemberRemoved}
						rewardsProfile={rewardsProfile}
						// Apply consistent button styling (adjust if RewardsAccessButton accepts className)
						// Note: If RewardsAccessButton internally defines styles, these might need adjustment there.
						// This example assumes it might accept a className or has similar internal styles.
						// Using a generic style here for demonstration.
						buttonClassName="p-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors flex items-center gap-1" // Example styling
					/>

					{/* Conditional rendering based on original activeOrderId prop */}
					{activeOrderId && (
						<>
							{/* Order Cancellation Component - No UI changes needed here, assuming it's styled internally */}
							<OrderCancellation
								// Pass original props
								activeOrderId={activeOrderId}
								setActiveOrderId={setActiveOrderId}
								clearCart={clearCart}
								setShowOverlay={setShowOverlay}
								axiosInstance={axiosInstance}
								// Assuming OrderCancellation has its own button styling.
								// If not, pass className like:
								// buttonClassName="p-2 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors flex items-center gap-1"
							/>
							{/* New Order Button - Apply consistent styling */}
							<button
								className="p-2 bg-emerald-100 text-emerald-700 rounded-md text-sm hover:bg-emerald-200 transition-colors flex items-center gap-1" // Consistent styling
								onClick={startNewOrder} // Use original prop function
							>
								<PlusIcon className="h-4 w-4" /> {/* Use imported icon */}
								New Order
							</button>
						</>
					)}
				</div>
			</div>
			{/* Original code had no rewards profile info div here, so it remains removed */}
		</div>
	);
	// --- END OF UPDATED UI ---
};

// --- ORIGINAL PROPTYPES (UNCHANGED) ---
CartHeader.propTypes = {
	activeOrderId: PropTypes.number,
	setActiveOrderId: PropTypes.func,
	clearCart: PropTypes.func,
	setShowOverlay: PropTypes.func,
	// Note: Original code had isRequired for axiosInstance, kept it here. Adjust if needed.
	startNewOrder: PropTypes.func.isRequired,
	axiosInstance: PropTypes.func.isRequired, // Assuming axiosInstance is an object or function based on usage
};

// Default export might be needed depending on how it's imported elsewhere
// export default CartHeader; // Uncomment if needed
