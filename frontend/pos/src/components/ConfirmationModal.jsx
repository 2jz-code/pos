// src/components/ConfirmationModal.jsx
import PropTypes from "prop-types";

const ConfirmationModal = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
				<h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
				<p className="text-gray-600 mb-6">{message}</p>
				<div className="flex justify-end gap-3">
					<button
						className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
						onClick={onClose}
					>
						{cancelText}
					</button>
					<button
						className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						onClick={onConfirm}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
};

ConfirmationModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onConfirm: PropTypes.func.isRequired,
	title: PropTypes.string.isRequired,
	message: PropTypes.string.isRequired,
	confirmText: PropTypes.string,
	cancelText: PropTypes.string,
};

export default ConfirmationModal;
