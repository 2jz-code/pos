// features/customerDisplay/components/flow/CustomerFlowView.jsx

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import CartView from "../cart/CartView";
import RewardsRegistrationView from "../rewards/RewardsRegistrationView";
import TipSelectionView from "../tip/TipSelectionView";
import PaymentView from "../payment/PaymentView";
import ReceiptView from "../receipt/ReceiptView";
import CashFlowView from "../payment/CashFlowView";

const CustomerFlowView = ({ flowData, onStepComplete }) => {
	const [currentStep, setCurrentStep] = useState(
		flowData?.currentStep || "cart"
	);

	// Update current step when flowData changes
	useEffect(() => {
		if (flowData?.currentStep) {
			setCurrentStep(flowData.currentStep);
		}
	}, [flowData]);

	// Handle step completion
	const handleStepComplete = (stepData) => {
		if (onStepComplete) {
			console.log(`Completing step: ${currentStep}`, stepData);
			onStepComplete(currentStep, stepData);
		}
	};

	const renderStepContent = () => {
		// Debug log to track orderId
		console.log("CustomerFlowView rendering with orderId:", flowData?.orderId);

		// Get order data from the pre-calculated values or use split order data if available
		const orderData =
			flowData?.splitOrderData && flowData?.isSplitPayment
				? {
						...flowData.splitOrderData,
						items: flowData?.cartData?.items || [],
						orderId: flowData?.orderId, // Explicitly add orderId
						// Add discount fields
						discountAmount: flowData?.cartData?.discountAmount || 0,
						orderDiscount: flowData?.cartData?.orderDiscount || null,
				  }
				: {
						items: flowData?.cartData?.items || [],
						subtotal: flowData?.cartData?.subtotal || 0,
						tax: flowData?.cartData?.taxAmount || 0,
						total: flowData?.cartData?.total || 0,
						tipAmount: flowData?.tipAmount || 0,
						orderId: flowData?.orderId,
						// Add discount fields
						discountAmount: flowData?.cartData?.discountAmount || 0,
						orderDiscount: flowData?.cartData?.orderDiscount || null,
				  };

		// Debug log to verify orderId in orderData
		console.log("OrderData prepared with orderId:", orderData.orderId);

		switch (currentStep) {
			case "cart":
				return <CartView cartData={orderData} />;
			case "rewards":
				return <RewardsRegistrationView onComplete={handleStepComplete} />;
			case "tip":
				return (
					<TipSelectionView
						orderTotal={orderData.total}
						orderData={orderData}
						onComplete={handleStepComplete}
					/>
				);
			case "payment":
				// Check if this is a cash payment
				if (flowData?.paymentMethod === "cash") {
					return (
						<CashFlowView
							orderData={orderData}
							cashData={flowData.cashData}
							onComplete={handleStepComplete}
							isComplete={flowData.cashPaymentComplete === true}
						/>
					);
				}
				return (
					<PaymentView
						orderData={orderData}
						onComplete={handleStepComplete}
					/>
				);
			case "receipt":
				return (
					<ReceiptView
						orderData={orderData}
						paymentData={flowData?.payment}
						paymentMethod={flowData?.paymentMethod || "credit"}
						cashData={flowData?.cashData}
						onComplete={handleStepComplete}
					/>
				);
			default:
				return <div>Unknown step</div>;
		}
	};

	return (
		<div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
			{/* Subtle gradient background */}
			<div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-0"></div>

			{/* Top accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 w-full flex-shrink-0 z-10 shadow-sm"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			></motion.div>

			{/* Step content */}
			<div className="flex-1 overflow-auto relative z-10">
				<motion.div
					key={currentStep}
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -15 }}
					transition={{ duration: 0.3 }}
					className="h-full"
				>
					{renderStepContent()}
				</motion.div>
			</div>

			{/* Bottom accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 w-full flex-shrink-0 z-10 shadow-sm"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
			></motion.div>
		</div>
	);
};

CustomerFlowView.propTypes = {
	flowData: PropTypes.shape({
		currentStep: PropTypes.string,
		cartData: PropTypes.object,
		tipAmount: PropTypes.number,
		payment: PropTypes.object,
		orderId: PropTypes.number,
		cashData: PropTypes.object,
		paymentMethod: PropTypes.string,
		cashPaymentComplete: PropTypes.bool,
		splitOrderData: PropTypes.object,
		isSplitPayment: PropTypes.bool,
	}),
	onStepComplete: PropTypes.func,
};

export default CustomerFlowView;
