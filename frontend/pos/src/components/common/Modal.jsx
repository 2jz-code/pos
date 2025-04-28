import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * A reusable general-purpose modal component.
 *
 * Props:
 * - isOpen (bool): Controls modal visibility.
 * - onClose (func): Function called when the modal should close (overlay click, Esc key, close button).
 * - title (string): The title text displayed in the modal header.
 * - children (node): The content to be rendered inside the modal body.
 * - size (string): Controls the max-width of the modal ('sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'). Defaults to 'md'.
 * - initialFocusRef (ref): Optional ref to set initial focus on when the modal opens.
 */
const Modal = ({
	isOpen,
	onClose,
	title,
	children,
	size = "md", // Default size
	initialFocusRef, // Optional ref for initial focus
}) => {
	const modalPanelRef = useRef(null); // Ref for the modal panel itself

	// Handle ESC key press
	useEffect(() => {
		const handleEscape = (event) => {
			if (event.key === "Escape" && isOpen) {
				onClose();
			}
		};
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	// Handle click outside the modal panel to close
	// Note: This simple version might close if clicking inside interactive elements that briefly move outside the ref during interaction.
	// More complex solutions might involve checking event propagation or specific targets if needed.
	useEffect(() => {
		const handleClickOutside = (event) => {
			// Check if the click is outside the modalPanelRef
			if (
				modalPanelRef.current &&
				!modalPanelRef.current.contains(event.target)
			) {
				onClose();
			}
		};
		if (isOpen) {
			// Use setTimeout to allow immediate clicks on the trigger button without closing the modal instantly
			setTimeout(() => {
				document.addEventListener("mousedown", handleClickOutside);
			}, 0);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen, onClose]);

	// Set initial focus when modal opens
	useEffect(() => {
		if (isOpen && initialFocusRef?.current) {
			// Use timeout to ensure the element is focusable after rendering
			setTimeout(() => initialFocusRef.current.focus(), 100);
		}
	}, [isOpen, initialFocusRef]);

	// Apply different size classes based on the 'size' prop
	const sizeClasses = {
		sm: "max-w-sm",
		md: "max-w-md", // Adjusted default md size
		lg: "max-w-lg",
		xl: "max-w-xl",
		"2xl": "max-w-2xl",
		"3xl": "max-w-3xl",
		"4xl": "max-w-4xl",
		"5xl": "max-w-5xl",
		"6xl": "max-w-6xl",
		"7xl": "max-w-7xl",
	};
	const modalMaxWidth = sizeClasses[size] || sizeClasses.md; // Fallback to md

	// Render nothing if the modal is not open
	if (!isOpen) return null;

	return (
		// Use Portal? For simplicity, rendering directly here. Consider Portal for complex apps.
		<div
			className="relative z-50" // High z-index
			aria-labelledby="modal-title"
			role="dialog"
			aria-modal="true"
		>
			{/* Background overlay */}
			<div
				className="fixed inset-0 bg-slate-700/50 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0"
				aria-hidden="true"
				// data-state={isOpen ? 'open' : 'closed'} // Example for potential animation library integration
			></div>

			{/* Modal panel container - centers content */}
			<div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4">
				<div className="flex min-h-full items-center justify-center">
					{" "}
					{/* Vertical & Horizontal centering */}
					{/* Modal panel itself */}
					<div
						ref={modalPanelRef} // Ref for click outside detection
						className={`relative w-full ${modalMaxWidth} transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 sm:my-8`}
						// data-state={isOpen ? 'open' : 'closed'} // Example for animation
					>
						{/* Header */}
						<div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
							<h3
								className="text-base font-semibold leading-6 text-slate-900"
								id="modal-title"
							>
								{title}
							</h3>
							<button
								type="button"
								className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
								onClick={onClose}
								aria-label="Close modal"
							>
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						{/* Content Body - Scrollable */}
						{/* Apply max-height here to make content scrollable, adjust vh as needed */}
						<div className="max-h-[75vh] overflow-y-auto p-4 sm:p-5 custom-scrollbar">
							{children}
						</div>

						{/* Optional Footer - Could be added as a prop if needed */}
						{/* <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            Footer content here...
                        </div> */}
					</div>
				</div>
			</div>
		</div>
	);
};

// Define PropTypes for the component
Modal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	title: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired, // Content of the modal
	size: PropTypes.oneOf([
		"sm",
		"md",
		"lg",
		"xl",
		"2xl",
		"3xl",
		"4xl",
		"5xl",
		"6xl",
		"7xl",
	]), // Allowed size values
	initialFocusRef: PropTypes.oneOfType([
		PropTypes.func,
		PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
	]), // For accessibility
};

export default Modal;
