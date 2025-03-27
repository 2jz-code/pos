// src/components/common/Modal.jsx
import { useEffect, useRef } from "react";
import PropTypes from "prop-types";

export default function Modal({
	isOpen,
	onClose,
	title,
	children,
	size = "md",
}) {
	const modalRef = useRef(null);

	// Handle ESC key press to close the modal
	useEffect(() => {
		const handleEscKey = (event) => {
			if (event.key === "Escape" && isOpen) {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscKey);
		return () => {
			document.removeEventListener("keydown", handleEscKey);
		};
	}, [isOpen, onClose]);

	// Handle click outside to close
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (modalRef.current && !modalRef.current.contains(event.target)) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen, onClose]);

	// Apply different size classes
	const sizeClasses = {
		sm: "max-w-md",
		md: "max-w-lg",
		lg: "max-w-2xl",
		xl: "max-w-4xl",
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
				{/* Background overlay */}
				<div
					className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
					aria-hidden="true"
				></div>

				{/* Center modal */}
				<span
					className="hidden sm:inline-block sm:align-middle sm:h-screen"
					aria-hidden="true"
				>
					&#8203;
				</span>

				{/* Modal panel */}
				<div
					ref={modalRef}
					className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} w-full`}
				>
					{/* Header */}
					<div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
						<div className="sm:flex sm:items-start">
							<div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
								<h3 className="text-lg font-medium leading-6 text-gray-900">
									{title}
								</h3>
								<div className="mt-4">{children}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

Modal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	title: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
	size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
};
