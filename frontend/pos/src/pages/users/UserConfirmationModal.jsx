// src/components/ConfirmationModal.jsx
import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import PropTypes from "prop-types";

const ConfirmationModal = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmButtonText = "Confirm",
	cancelButtonText = "Cancel",
	confirmButtonClass = "bg-blue-600 hover:bg-blue-700",
}) => {
	return (
		<Transition
			appear
			show={isOpen}
			as={Fragment}
		>
			<Dialog
				as="div"
				className="relative z-10"
				onClose={onClose}
			>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/50 bg-opacity-25" />
				</Transition.Child>

				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
								<Dialog.Title
									as="h3"
									className="text-lg font-medium leading-6 text-gray-900"
								>
									{title}
								</Dialog.Title>
								<div className="mt-2">
									<p className="text-sm text-gray-500">{message}</p>
								</div>

								<div className="mt-4 flex justify-end space-x-3">
									<button
										type="button"
										className="inline-flex justify-center rounded-md border border-transparent bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
										onClick={onClose}
									>
										{cancelButtonText}
									</button>
									<button
										type="button"
										className={`inline-flex justify-center rounded-md border border-transparent ${confirmButtonClass} px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
										onClick={onConfirm}
									>
										{confirmButtonText}
									</button>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
};

ConfirmationModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onConfirm: PropTypes.func.isRequired,
	title: PropTypes.string.isRequired,
	message: PropTypes.string.isRequired,
	confirmButtonText: PropTypes.string,
	cancelButtonText: PropTypes.string,
	confirmButtonClass: PropTypes.string,
};

export default ConfirmationModal;
