// features/customerDisplay/components/CustomerFlowView.jsx

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
// import FlowProgressMeter from "./FlowProgressMeter";
// import { CUSTOMER_FLOW_STEPS } from "../../../payment/constants/paymentFlowSteps";
import CartView from "../cart/CartView";
import RewardsRegistrationView from "../rewards/RewardsRegistrationView";
import TipSelectionView from "../tip/TipSelectionView";

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
		};
	};

	// Render the current step content
	const renderStepContent = () => {
		const orderData = getOrderData();

		switch (currentStep) {
			case "cart":
				return <CartView cartData={flowData?.cartData || { items: [] }} />;
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
					<div className="text-center p-4">
						<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-8 w-8 text-blue-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
								/>
							</svg>
						</div>
						<h2 className="text-xl font-bold text-slate-800 mb-2">
							Processing Payment
						</h2>
						<p className="text-slate-600">
							Please follow the prompts on the payment terminal.
						</p>
					</div>
				);
			case "receipt":
				return (
					<div className="text-center p-4">
						<div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-8 w-8 text-emerald-600"
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
						<h2 className="text-xl font-bold text-slate-800 mb-2">
							Transaction Complete
						</h2>
						<p className="text-slate-600">
							Thank you for your purchase!
							<br />
							Your receipt is being printed.
						</p>
					</div>
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

			{/* Progress meter */}
			{/* <div className="p-6">
				<FlowProgressMeter
					steps={CUSTOMER_FLOW_STEPS}
					currentStep={currentStep}
				/>
			</div> */}

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
	}),
	onStepComplete: PropTypes.func,
};

export default CustomerFlowView;
