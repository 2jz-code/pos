// features/customerDisplay/components/flow/CustomerFlowView.jsx

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
// import FlowProgressMeter from "./FlowProgressMeter";
// import { CUSTOMER_FLOW_STEPS } from "../../../payment/constants/paymentFlowSteps";
import CartView from "../cart/CartView";
import RewardsRegistrationView from "../rewards/RewardsRegistrationView";
import TipSelectionView from "../tip/TipSelectionView";
import PaymentView from "../payment/PaymentView";
import ReceiptView from "../receipt/ReceiptView"; // Import the new receipt component

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
			onStepComplete(currentStep, stepData);
		}
	};

	// Get cart data from the pre-calculated values
	const getOrderData = () => {
		// Ensure we have valid cart data
		const cartData = flowData?.cartData || {
			items: [],
			subtotal: 0,
			taxAmount: 0,
			total: 0,
		};

		// Return a standardized structure
		return {
			items: cartData.items || [],
			subtotal: cartData.subtotal || 0,
			tax: cartData.taxAmount || 0, // Note: taxAmount from calculateCartTotals
			total: cartData.total || 0,
			tipAmount: flowData?.tipAmount || 0, // Add tip amount from flow data
			orderId: flowData?.orderId || null, // Explicitly include the order ID
		};
	};

	// Render the current step content
	const renderStepContent = () => {
		const orderData = getOrderData();

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
						paymentData={flowData?.payment} // Pass payment data from flow
						onComplete={handleStepComplete}
					/>
				);
			default:
				return <div>Unknown step</div>;
		}
	};

	return (
		<div className="w-full h-screen bg-white flex flex-col overflow-hidden">
			{/* Top colored band */}
			<motion.div
				className="h-3 bg-gradient-to-r from-blue-500 to-indigo-600 w-full flex-shrink-0"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			></motion.div>

			{/* Step content */}
			<div className="flex-1 overflow-auto">
				<motion.div
					key={currentStep}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.3 }}
					className="h-full"
				>
					{renderStepContent()}
				</motion.div>
			</div>
		</div>
	);
};

CustomerFlowView.propTypes = {
	flowData: PropTypes.shape({
		currentStep: PropTypes.string,
		cartData: PropTypes.object,
		tipAmount: PropTypes.number,
		payment: PropTypes.object, // Add payment data to the prop types
	}),
	onStepComplete: PropTypes.func,
};

export default CustomerFlowView;
