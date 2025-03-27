// src/components/payments/RefundSuccessModal.jsx
import PropTypes from "prop-types";
import Modal from "../../components/common/Modal";

export default function RefundSuccessModal({
	isOpen,
	onClose,
	refundData,
	paymentMethod,
}) {
	// Format currency
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Refund Processed Successfully"
			size="md"
		>
			<div className="space-y-4">
				<div className="flex items-center justify-center p-4">
					<div className="bg-green-100 rounded-full p-3">
						<svg
							className="h-8 w-8 text-green-600"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
				</div>

				<div className="text-center mb-4">
					<p className="text-lg font-medium text-gray-900">
						Refund Processed Successfully
					</p>
					<p className="text-sm text-gray-600 mt-1">
						The refund has been processed and the payment status has been
						updated.
					</p>
				</div>

				<div className="bg-gray-50 p-4 rounded-lg mb-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-sm font-medium text-gray-500">
								Amount Refunded
							</p>
							<p className="text-lg font-semibold text-gray-900">
								{formatCurrency(refundData.amount)}
							</p>
						</div>
						<div>
							<p className="text-sm font-medium text-gray-500">
								Payment Method
							</p>
							<p className="text-lg font-semibold text-gray-900">
								{paymentMethod === "split"
									? "Split Payment"
									: paymentMethod.replace("_", " ").toUpperCase()}
							</p>
						</div>
						{refundData.refund_id && (
							<div className="col-span-2">
								<p className="text-sm font-medium text-gray-500">Refund ID</p>
								<p className="text-base font-mono text-gray-900">
									{refundData.refund_id}
								</p>
							</div>
						)}
					</div>
				</div>

				<div className="bg-blue-50 border-l-4 border-blue-400 p-4">
					<div className="flex">
						<div className="flex-shrink-0">
							<svg
								className="h-5 w-5 text-blue-400"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm text-blue-700">
								{paymentMethod === "cash"
									? "Please provide the customer with the cash refund amount."
									: "The customer's payment method has been refunded."}
							</p>
						</div>
					</div>
				</div>

				<div className="mt-5 sm:mt-6">
					<button
						type="button"
						onClick={onClose}
						className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:text-sm"
					>
						Close
					</button>
				</div>
			</div>
		</Modal>
	);
}

RefundSuccessModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	refundData: PropTypes.object.isRequired,
	paymentMethod: PropTypes.string.isRequired,
};
