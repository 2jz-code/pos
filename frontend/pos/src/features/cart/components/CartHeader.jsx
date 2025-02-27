import PropTypes from "prop-types";
import OrderCancellation from "../../../components/OrderCancellation";

export const CartHeader = ({
	activeOrderId,
	setActiveOrderId,
	clearCart,
	setShowOverlay,
	startNewOrder,
	axiosInstance,
}) => (
	<div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
		<h2 className="text-xl font-semibold text-slate-800">Order Summary</h2>
		<div className="flex gap-2">
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
);

CartHeader.propTypes = {
	activeOrderId: PropTypes.number,
	setActiveOrderId: PropTypes.func.isRequired,
	clearCart: PropTypes.func.isRequired,
	setShowOverlay: PropTypes.func.isRequired,
	startNewOrder: PropTypes.func.isRequired,
	axiosInstance: PropTypes.func.isRequired, // Add PropType validation
};
