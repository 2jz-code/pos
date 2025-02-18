import PropTypes from "prop-types";
import OrderCancellation from "../../../components/OrderCancellation";

export const CartHeader = ({
	activeOrderId,
	setActiveOrderId,
	clearCart,
	setShowOverlay,
	startNewOrder,
	axiosInstance, // Add this prop
}) => (
	<div className="p-4 border-b border-gray-300 flex items-center justify-between">
		<h2 className="text-xl font-semibold text-gray-800">Order Summary</h2>
		<div className="flex gap-2">
			{activeOrderId && (
				<>
					<OrderCancellation
						activeOrderId={activeOrderId}
						setActiveOrderId={setActiveOrderId}
						clearCart={clearCart}
						setShowOverlay={setShowOverlay}
						axiosInstance={axiosInstance} // Pass it to OrderCancellation
					/>
					<button
						className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-md text-sm hover:bg-blue-200 transition-colors"
						onClick={startNewOrder}
					>
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
