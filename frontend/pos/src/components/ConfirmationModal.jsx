import { useEffect } from "react";
import PropTypes from "prop-types";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"; // Use outline for consistency

/**
 * A reusable confirmation modal component.
 *
 * Props:
 * - isOpen (bool): Controls modal visibility.
 * - onClose (func): Function called when the modal should close (overlay click, cancel button).
 * - onConfirm (func): Function called when the confirm button is clicked.
 * - title (string): The title text displayed in the modal header.
 * - message (string|node): The main content/message of the modal.
 * - confirmButtonText (string): Text for the confirmation button (default: "Confirm").
 * - confirmButtonClass (string): Additional CSS classes for the confirm button (e.g., 'bg-red-600 hover:bg-red-700').
 * - cancelText (string): Text for the cancel button (default: "Cancel").
 * - isConfirmDisabled (bool): Disables the confirm button if true.
 * - icon (elementType): Optional icon component to display (defaults to ExclamationTriangleIcon).
 * - iconColorClass (string): Tailwind CSS class for the icon color (defaults to 'text-red-600').
 * - iconBgClass (string): Tailwind CSS class for the icon background circle (defaults to 'bg-red-100').
 */
const ConfirmationModal = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmButtonText = "Confirm", // Default text
	confirmButtonClass = "bg-red-600 hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-300", // Default red for confirm
	cancelText = "Cancel", // Default text
	isConfirmDisabled = false,
	icon: IconComponent = ExclamationTriangleIcon, // Default icon
	iconColorClass = "text-red-600", // Default icon color
	iconBgClass = "bg-red-100", // Default icon background
}) => {
	// Effect to handle Escape key press for closing the modal
	useEffect(() => {
		const handleEscape = (event) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
		}

		// Cleanup listener when modal closes or component unmounts
		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, onClose]);

	// Render nothing if the modal is not open
	if (!isOpen) return null;

	// Base classes for buttons
	const baseButtonClass =
		"inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
	const cancelButtonClass =
		"border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-500";

	return (
		// Overlay container
		<div
			className="relative z-50" // Use relative and z-index
			aria-labelledby="modal-title"
			role="dialog"
			aria-modal="true"
		>
			{/* Background overlay */}
			<div
				className="fixed inset-0 bg-slate-700/50 backdrop-blur-sm transition-opacity"
				aria-hidden="true"
			></div>

			{/* Modal panel container */}
			<div className="fixed inset-0 z-10 overflow-y-auto p-4">
				<div className="flex min-h-full items-center justify-center">
					{" "}
					{/* Center vertically and horizontally */}
					{/* Modal panel */}
					<div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all">
						<div className="bg-white p-5 sm:p-6">
							<div className="sm:flex sm:items-start">
								{/* Icon */}
								<div
									className={`mx-auto flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconBgClass} sm:mx-0 sm:h-10 sm:w-10`}
								>
									<IconComponent
										className={`h-5 w-5 ${iconColorClass}`}
										aria-hidden="true"
									/>
								</div>
								{/* Content */}
								<div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
									<h3
										className="text-base font-semibold leading-6 text-slate-900"
										id="modal-title"
									>
										{title}
									</h3>
									<div className="mt-2">
										<p className="text-sm text-slate-600">{message}</p>
									</div>
								</div>
							</div>
						</div>
						{/* Action Buttons */}
						<div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
							<button
								type="button"
								className={`${baseButtonClass} ${confirmButtonClass} sm:ml-3 sm:w-auto`}
								onClick={onConfirm}
								disabled={isConfirmDisabled}
							>
								{confirmButtonText}
							</button>
							<button
								type="button"
								className={`${baseButtonClass} ${cancelButtonClass} mt-3 sm:mt-0 sm:w-auto`}
								onClick={onClose}
							>
								{cancelText}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

// Define PropTypes for the component
ConfirmationModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onConfirm: PropTypes.func.isRequired,
	title: PropTypes.string.isRequired,
	message: PropTypes.node.isRequired, // Allow string or React nodes
	confirmButtonText: PropTypes.string,
	confirmButtonClass: PropTypes.string, // Allow overriding confirm button style
	cancelText: PropTypes.string,
	isConfirmDisabled: PropTypes.bool, // Prop to disable confirm button
	icon: PropTypes.elementType, // Allow passing a custom icon component
	iconColorClass: PropTypes.string, // Allow overriding icon color
	iconBgClass: PropTypes.string, // Allow overriding icon background
};

export default ConfirmationModal;
