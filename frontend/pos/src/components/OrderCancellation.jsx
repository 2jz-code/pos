// src/components/OrderCancellation.jsx
import { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useOrderCancellation } from "../utils/useOrderCancellation";
import PropTypes from "prop-types";
import ConfirmationModal from "./ConfirmationModal";

const OrderCancellation = ({
	activeOrderId,
	setActiveOrderId,
	clearCart,
	setShowOverlay,
	axiosInstance,
}) => {
	const { cancelOrder, isLoading } = useOrderCancellation(axiosInstance);
	const [showConfirmModal, setShowConfirmModal] = useState(false);

	const handleCancelClick = () => {
		setShowConfirmModal(true);
	};

	const handleConfirm = async () => {
		setShowConfirmModal(false);
		await cancelOrder(
			activeOrderId,
			setActiveOrderId,
			clearCart,
			setShowOverlay
		);
	};

	return (
		<>
			<button
				className={`
                    px-3 py-1.5 bg-gray-100 text-gray-700 
                    rounded-md text-sm hover:bg-gray-200 
                    transition-colors disabled:opacity-50 
                    disabled:cursor-not-allowed
                `}
				onClick={handleCancelClick}
				disabled={isLoading || !activeOrderId}
			>
				{isLoading ? (
					<span className="flex items-center gap-2">
						<svg
							className="animate-spin h-4 w-4"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
								fill="none"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						Cancelling...
					</span>
				) : (
					"No Sale"
				)}
			</button>

			<ConfirmationModal
				isOpen={showConfirmModal}
				onClose={() => setShowConfirmModal(false)}
				onConfirm={handleConfirm}
				title="Cancel Order?"
				message="Are you sure you want to cancel this order? This action cannot be undone."
				confirmText="Yes, Cancel Order"
				cancelText="No, Keep Order"
			/>

			<ToastContainer
				position="top-right"
				autoClose={3000}
				hideProgressBar={false}
				closeOnClick
				pauseOnHover
			/>
		</>
	);
};

OrderCancellation.propTypes = {
	activeOrderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	setActiveOrderId: PropTypes.func.isRequired,
	clearCart: PropTypes.func.isRequired,
	setShowOverlay: PropTypes.func.isRequired,
	axiosInstance: PropTypes.oneOfType([PropTypes.object, PropTypes.func])
		.isRequired,
};

export default OrderCancellation;
