// src/features/cart/components/CartHeader.jsx
import PropTypes from "prop-types";
import OrderCancellation from "../../../components/OrderCancellation";
import RewardsAccessButton from "../../../components/rewards/RewardsAccessButton";
import { useCartStore } from "../../../store/cartStore";

export const CartHeader = ({
	activeOrderId,
	setActiveOrderId,
	clearCart,
	setShowOverlay,
	startNewOrder,
	axiosInstance,
}) => {
	// Get and set rewards profile from the store
	const rewardsProfile = useCartStore((state) => state.rewardsProfile);
	const setRewardsProfile = useCartStore((state) => state.setRewardsProfile);

	const handleRewardsMemberAuthenticated = (profile) => {
		setRewardsProfile(profile);
	};

	// Add handler for removing the rewards profile
	const handleRewardsMemberRemoved = () => {
		setRewardsProfile(null);
	};

	return (
		<div className="p-4 border-b border-slate-200 bg-white">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-slate-800">Order Summary</h2>
				<div className="flex gap-2 items-center">
					{/* Always show the Rewards button, but pass the profile if it exists */}
					<RewardsAccessButton
						buttonClassName="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors flex items-center gap-1"
						onUserAuthenticated={handleRewardsMemberAuthenticated}
						onUserRemoved={handleRewardsMemberRemoved} // Add this prop
						rewardsProfile={rewardsProfile}
					/>

					{activeOrderId && (
						<>
							<OrderCancellation
								activeOrderId={activeOrderId}
								setActiveOrderId={setActiveOrderId}
								clearCart={clearCart}
								setShowOverlay={setShowOverlay}
								axiosInstance={axiosInstance}
							/>
							<button
								className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors flex items-center gap-1"
								onClick={startNewOrder}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 4v16m8-8H4"
									/>
								</svg>
								New Order
							</button>
						</>
					)}
				</div>
			</div>

			{/* Remove the rewards profile information div, as it's now shown in the modal */}
		</div>
	);
};

CartHeader.propTypes = {
	activeOrderId: PropTypes.number,
	setActiveOrderId: PropTypes.func.isRequired,
	clearCart: PropTypes.func.isRequired,
	setShowOverlay: PropTypes.func.isRequired,
	startNewOrder: PropTypes.func.isRequired,
	axiosInstance: PropTypes.func.isRequired,
};
