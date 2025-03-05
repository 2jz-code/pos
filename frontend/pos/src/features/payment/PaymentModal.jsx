// src/features/payment/PaymentModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/solid";
import PaymentFlowManager from "./PaymentFlowManager";
import PropTypes from "prop-types";

export const PaymentModal = ({
	isOpen,
	onClose,
	orderTotal,
	onPaymentComplete,
}) => {
	if (!isOpen) return null;

	const handleComplete = (paymentResult) => {
		onPaymentComplete(paymentResult);
	};

	const handleCancel = () => {
		onClose();
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<motion.div
						className="relative w-full max-w-2xl h-[80vh] bg-white rounded-lg shadow-xl overflow-hidden"
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 20, opacity: 0 }}
					>
						<div className="absolute top-0 right-0 p-2 z-10">
							<button
								onClick={onClose}
								className="p-2 rounded-full hover:bg-gray-100 transition-colors"
							>
								<XMarkIcon className="h-6 w-6 text-gray-500" />
							</button>
						</div>

						<div className="h-full">
							<PaymentFlowManager
								initialTotal={orderTotal}
								onComplete={handleComplete}
								onCancel={handleCancel}
							/>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default PaymentModal;

PaymentModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	orderTotal: PropTypes.number.isRequired,
	onPaymentComplete: PropTypes.func.isRequired,
};
