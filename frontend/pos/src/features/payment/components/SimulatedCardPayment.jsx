// src/features/payment/components/SimulatedCardPayment.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCardIcon, XMarkIcon } from "@heroicons/react/24/solid";
import PaymentButton from "../PaymentButton";
import { useSimulatedCardPayment } from "../../../hooks/useSimulatedCardPayment";
import PropTypes from "prop-types";

export const SimulatedCardPayment = ({
	amount,
	onPaymentComplete,
	onCancel,
}) => {
	const {
		status,
		isProcessing,
		error,
		tipAmount,
		cardData,
		flowSteps,
		startPayment,
		confirmAmount,
		addTip,
		processCard,
		cancelPayment,
		simulateDecline,
	} = useSimulatedCardPayment();

	const [totalAmount, setTotalAmount] = useState(amount);

	// Update total when tip changes
	useEffect(() => {
		setTotalAmount(amount + tipAmount);
	}, [amount, tipAmount]);

	// Start payment flow when component mounts
	useEffect(() => {
		startPayment(amount);
	}, [amount, startPayment]);

	// Handle successful payment
	useEffect(() => {
		if (status === flowSteps.APPROVED && cardData) {
			onPaymentComplete({
				method: "credit",
				amount: totalAmount,
				tipAmount,
				cardData,
			});
		}
	}, [
		status,
		cardData,
		flowSteps.APPROVED,
		onPaymentComplete,
		totalAmount,
		tipAmount,
	]);

	const handleCancel = async () => {
		await cancelPayment();
		onCancel();
	};

	const renderAmountConfirmation = () => (
		<div className="p-6 bg-white rounded-lg shadow-lg">
			<h3 className="text-xl font-semibold mb-4">Confirm Amount</h3>
			<p className="text-3xl font-bold text-center mb-6">
				${amount.toFixed(2)}
			</p>
			<div className="flex gap-4">
				<PaymentButton
					label="Cancel"
					variant="primary"
					onClick={handleCancel}
					className="flex-1"
				/>
				<PaymentButton
					label="Confirm"
					variant="primary"
					onClick={confirmAmount}
					className="flex-1"
				/>
			</div>
		</div>
	);

	const renderTipPrompt = () => (
		<div className="p-6 bg-white rounded-lg shadow-lg">
			<h3 className="text-xl font-semibold mb-4">Add a Tip?</h3>
			<div className="grid grid-cols-2 gap-3 mb-4">
				<PaymentButton
					label="No Tip"
					variant="primary"
					onClick={() => addTip(0)}
				/>
				<PaymentButton
					label={`15% ($${(amount * 0.15).toFixed(2)})`}
					variant="primary"
					onClick={() => addTip(parseFloat((amount * 0.15).toFixed(2)))}
				/>
				<PaymentButton
					label={`18% ($${(amount * 0.18).toFixed(2)})`}
					variant="primary"
					onClick={() => addTip(parseFloat((amount * 0.18).toFixed(2)))}
				/>
				<PaymentButton
					label={`20% ($${(amount * 0.2).toFixed(2)})`}
					variant="primary"
					onClick={() => addTip(parseFloat((amount * 0.2).toFixed(2)))}
				/>
			</div>
			<PaymentButton
				label="Cancel"
				variant="danger"
				onClick={handleCancel}
				className="w-full"
			/>
		</div>
	);

	const renderWaitingForCard = () => (
		<div className="p-6 bg-white rounded-lg shadow-lg">
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-xl font-semibold">Insert or Swipe Card</h3>
				<button
					onClick={handleCancel}
					className="text-gray-500 hover:text-gray-700"
				>
					<XMarkIcon className="h-6 w-6" />
				</button>
			</div>

			<div className="flex flex-col items-center justify-center py-8">
				<CreditCardIcon className="h-16 w-16 text-blue-500 mb-4 animate-pulse" />
				<p className="text-lg text-center mb-2">
					Please insert or swipe your card
				</p>
				<p className="text-sm text-gray-500 text-center">
					Total amount: ${totalAmount.toFixed(2)}
					{tipAmount > 0 && ` (includes $${tipAmount.toFixed(2)} tip)`}
				</p>
			</div>

			{/* This button is just for simulation - would not exist in real terminal */}
			<div className="border-t pt-4 mt-4">
				<p className="text-xs text-gray-500 mb-2 text-center">
					Simulation Controls
				</p>
				<div className="flex gap-2">
					<PaymentButton
						label="Simulate Card Read"
						variant="success"
						onClick={() => processCard()}
						className="flex-1"
					/>
					<PaymentButton
						label="Simulate Decline"
						variant="danger"
						onClick={() =>
							simulateDecline().catch((error) =>
								console.log("Decline simulation:", error.message)
							)
						}
						className="flex-1"
					/>
				</div>
			</div>
		</div>
	);

	const renderProcessing = () => (
		<div className="p-6 bg-white rounded-lg shadow-lg">
			<h3 className="text-xl font-semibold mb-4">
				{isProcessing ? "Processing Payment" : "Preparing to Process"}
			</h3>
			<div className="flex flex-col items-center justify-center py-8">
				<div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
				<p className="text-lg">Please wait</p>
				<p className="text-sm text-gray-500">
					Do not remove card until prompted
				</p>
			</div>
		</div>
	);

	const renderApproved = () => (
		<div className="p-6 bg-white rounded-lg shadow-lg">
			<h3 className="text-xl font-semibold text-green-600 mb-4">
				Payment Approved
			</h3>
			<div className="bg-green-50 p-4 rounded-lg mb-4">
				<p className="font-medium">Transaction Details:</p>
				<p className="text-sm">
					Card: {cardData.cardType} ending in {cardData.lastFour}
				</p>
				<p className="text-sm">Amount: ${amount.toFixed(2)}</p>
				{tipAmount > 0 && (
					<p className="text-sm">Tip: ${tipAmount.toFixed(2)}</p>
				)}
				<p className="text-sm">Total: ${totalAmount.toFixed(2)}</p>
				<p className="text-sm">Transaction ID: {cardData.transactionId}</p>
			</div>
			<p className="text-center text-sm text-gray-500 mb-4">
				Receipt will be printed automatically
			</p>
		</div>
	);

	const renderDeclined = () => (
		<div className="p-6 bg-white rounded-lg shadow-lg">
			<h3 className="text-xl font-semibold text-red-600 mb-4">
				Payment Declined
			</h3>
			<p className="text-center mb-6">{error}</p>
			<div className="flex gap-4">
				<PaymentButton
					label="Try Again"
					variant="primary"
					onClick={() => startPayment(amount)}
					className="flex-1"
				/>
				<PaymentButton
					label="Cancel"
					variant="primary"
					onClick={handleCancel}
					className="flex-1"
				/>
			</div>
		</div>
	);

	const renderContent = () => {
		switch (status) {
			case flowSteps.AMOUNT_CONFIRMATION:
				return renderAmountConfirmation();
			case flowSteps.TIP_PROMPT:
				return renderTipPrompt();
			case flowSteps.WAITING_FOR_CARD:
				return renderWaitingForCard();
			case flowSteps.PROCESSING:
				return renderProcessing();
			case flowSteps.APPROVED:
				return renderApproved();
			case flowSteps.DECLINED:
			case flowSteps.ERROR:
				return renderDeclined();
			default:
				return <div>Initializing payment terminal...</div>;
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<motion.div
				initial={{ scale: 0.9, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.9, opacity: 0 }}
				className="w-full max-w-md"
			>
				{renderContent()}
			</motion.div>
		</div>
	);
};

SimulatedCardPayment.propTypes = {
	amount: PropTypes.number.isRequired,
	onPaymentComplete: PropTypes.func.isRequired,
	onCancel: PropTypes.func.isRequired,
};

export default SimulatedCardPayment;
