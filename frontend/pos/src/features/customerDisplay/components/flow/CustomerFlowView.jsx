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
import { calculateCartTotals } from "../../../cart/utils/cartCalculations";

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
		console.log("--- CustomerFlowView ---");
		console.log("Received flowData:", JSON.stringify(flowData, null, 2));

		let orderDataForView; // Renamed variable for clarity
		const isSplit = flowData?.isSplitPayment;
		// Use calculateCartTotals to get base totals from cartData if available
		const baseCartTotals = flowData?.cartData
			? calculateCartTotals(
					flowData.cartData.items || [],
					flowData.cartData.orderDiscount
			  )
			: { subtotal: 0, taxAmount: 0, total: 0, discountAmount: 0 };

		// eslint-disable-next-line
		const accumulatedTipAmount = flowData?.tip?.tipAmount || 0; // <-- MODIFIED LINE

		// *** FIX: Ensure orderDataForView.total is always the BASE total before tip ***
		if (isSplit && flowData?.currentPaymentAmount != null) {
			console.log("Split payment: Using currentPaymentAmount for view.");
			const currentAmount = flowData.currentPaymentAmount;
			// For split, 'total' represents the amount for *this* payment step
			orderDataForView = {
				items: flowData?.cartData?.items || [],
				subtotal: baseCartTotals.subtotal, // Keep original subtotal for context
				tax: baseCartTotals.taxAmount, // Keep original tax for context
				total: currentAmount, // ** This is the base amount for THIS split payment **
				tipAmount: accumulatedTipAmount,
				orderId: flowData?.orderId,
				discountAmount: baseCartTotals.discountAmount,
				orderDiscount: flowData?.cartData?.orderDiscount,
				isSplitPayment: true,
				splitDetails: flowData?.splitDetails,
				// Original total of the *entire* order before splitting
				originalTotal: baseCartTotals.total,
			};
		}
		// Removed fallback to splitOrderData as currentPaymentAmount should be primary for splits
		else {
			// Not a split payment or first step
			console.log("Not split or first step: Using base cartData for view.");
			orderDataForView = {
				items: flowData?.cartData?.items || [],
				subtotal: baseCartTotals.subtotal,
				tax: baseCartTotals.taxAmount, // Renamed from taxAmount for consistency below
				total: baseCartTotals.total, // ** This is the BASE total before tip **
				tipAmount: accumulatedTipAmount,
				orderId: flowData?.orderId,
				discountAmount: baseCartTotals.discountAmount,
				orderDiscount: flowData?.cartData?.orderDiscount,
				isSplitPayment: false,
			};
		}

		console.log(
			"Constructed orderDataForView:",
			JSON.stringify(orderDataForView, null, 2)
		);
		console.log("--- End CustomerFlowView Logs ---");

		switch (currentStep) {
			case "cart":
				// CartView might need the full cart data structure from the flow
				return <CartView cartData={flowData?.cartData} />;
			case "rewards":
				return <RewardsRegistrationView onComplete={handleStepComplete} />;
			case "tip":
				// TipSelectionView needs the BASE total to calculate percentages correctly
				return (
					<TipSelectionView
						orderTotal={orderDataForView.total} // Pass the BASE total
						orderData={orderDataForView} // Pass full object if needed
						onComplete={handleStepComplete}
					/>
				);
			case "payment":
				// Payment views need the constructed orderDataForView
				// which has 'total' as base and separate 'tipAmount'
				if (flowData?.paymentMethod === "cash") {
					return (
						<CashFlowView
							orderData={orderDataForView}
							cashData={flowData?.cashData}
							isComplete={flowData?.cashPaymentComplete}
							onComplete={handleStepComplete}
						/>
					);
				}
				return (
					<PaymentView
						orderData={orderDataForView} // Pass the constructed data
						onComplete={handleStepComplete}
					/>
				);
			case "receipt":
				// Receipt view needs the BASE total and the tip amount separately
				// It also needs the payment result details
				console.log("CustomerFlowView: Rendering ReceiptView");
				console.log(
					"CustomerFlowView: Passing paymentData:",
					flowData?.payment
				);

				return (
					<ReceiptView
						orderData={orderDataForView} // Pass constructed data (base total + tip)
						paymentData={flowData?.payment} // Pass payment results
						paymentMethod={flowData?.paymentMethod}
						onComplete={handleStepComplete}
					/>
				);
			default:
				return <div>Unknown step: {currentStep}</div>;
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
		splitDetails: PropTypes.object,
		tipAmount: PropTypes.number,
		payment: PropTypes.object,
		orderId: PropTypes.number,
		cashData: PropTypes.object,
		paymentMethod: PropTypes.string,
		cashPaymentComplete: PropTypes.bool,
		splitOrderData: PropTypes.object,
		isSplitPayment: PropTypes.bool,
		currentPaymentAmount: PropTypes.number,
	}),
	onStepComplete: PropTypes.func,
};

export default CustomerFlowView;
