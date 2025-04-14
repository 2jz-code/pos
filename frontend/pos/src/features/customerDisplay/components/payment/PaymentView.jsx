// features/customerDisplay/components/payment/PaymentView.jsx

import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useTerminalSimulation } from "../../hooks/useTerminalSimulation"; // Ensure path is correct
import { useCartStore } from "../../../../store/cartStore"; // Ensure path is correct
import { formatPrice } from "../../../../utils/numberUtils"; // Ensure path is correct
import {
	CheckCircleIcon,
	ExclamationCircleIcon,
	CreditCardIcon,
	ArrowPathIcon,
} from "@heroicons/react/24/solid";

// // Mock animation objects if paymentAnimations is not used/imported
// const pageVariants = { enter: {}, center: {}, exit: {} };
// const pageTransition = {};

const PaymentView = ({ orderData, onComplete }) => {
	const [isInitiating, setIsInitiating] = useState(true);
	// Use the simulation hook
	const { processPayment, paymentStatus, paymentResult, error, readerInfo } =
		useTerminalSimulation();
	const hasStartedPaymentRef = useRef(false);
	const isMountedRef = useRef(false); // Track mount status

	// Safely get order details from props
	const tipAmount = orderData?.tipAmount || 0;
	// *** Ensure baseTotal uses the 'total' field from the prop, which should be the base ***
	const baseTotal = typeof orderData?.total === "number" ? orderData.total : 0;
	const finalTotal = baseTotal + tipAmount; // Total with tip *for display* only
	const orderId = orderData?.orderId || useCartStore.getState().orderId; // Get orderId

	// Mount/Unmount effect
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	// Start payment process
	useEffect(() => {
		// Guard clauses
		if (
			hasStartedPaymentRef.current ||
			!orderData ||
			!orderId ||
			!isInitiating ||
			!isMountedRef.current
		) {
			return;
		}

		const timer = setTimeout(() => {
			if (!isMountedRef.current) return; // Check mount status again before proceeding

			setIsInitiating(false); // Mark initiating phase as done
			console.log(
				"PaymentView.jsx: Start Payment Timer Fired. Processing payment for Order:",
				orderId,
				"Base Amount:",
				baseTotal,
				"Tip Amount:",
				tipAmount,
				"Final Display Amount:",
				finalTotal
			);

			// *** FIX: Construct the data object passed to processPayment correctly ***
			// This object MUST contain the BASE total in its 'total' field
			const dataForSimulation = {
				total: baseTotal, // <<< Explicitly pass the BASE total
				tipAmount: tipAmount, // <<< Explicitly pass the tip amount
				orderId: orderId,
				// Pass other relevant details if needed by the simulation hook or backend metadata
				isSplitPayment: orderData?.isSplitPayment,
				originalTotal: orderData?.originalTotal, // Use originalTotal if available
				items: orderData?.items, // Pass items if needed for metadata
				// Pass discount info if needed
				discountAmount: orderData?.discountAmount,
				orderDiscount: orderData?.orderDiscount,
			};
			// *** END FIX ***

			// *** Add log right before calling processPayment ***
			console.log(
				"PaymentView.jsx: Calling processPayment with dataForSimulation:",
				JSON.stringify(dataForSimulation, null, 2)
			);
			// *************************************************

			hasStartedPaymentRef.current = true; // Mark as payment process started
			processPayment(dataForSimulation); // Call the hook's processPayment
		}, 1500); // Initial delay

		return () => clearTimeout(timer);
	}, [orderData, orderId, baseTotal, tipAmount, processPayment, isInitiating]); // Dependencies

	// Handle completion - This effect listens to the result from useTerminalSimulation
	useEffect(() => {
		if (paymentStatus === "success" && paymentResult && onComplete) {
			if (!isMountedRef.current) return; // Check mount status

			const timer = setTimeout(() => {
				if (!isMountedRef.current) return;

				const completionData = {
					status: "success",
					...paymentResult, // Result from hook should have correct amounts now
					orderId, // Ensure orderId is included
				};
				console.log(
					"PaymentView.jsx: Payment successful, calling onComplete with:",
					completionData
				);
				onComplete(completionData); // Signal completion to parent (CustomerFlowView)
			}, 2000); // Delay for showing success message
			return () => clearTimeout(timer);
		}
	}, [paymentStatus, paymentResult, onComplete, orderId]);

	// Allow retry on error
	useEffect(() => {
		if (paymentStatus === "error") {
			if (!isMountedRef.current) return; // Check mount status
			hasStartedPaymentRef.current = false; // Allow retry
		}
	}, [paymentStatus]);

	const handleRetry = () => {
		if (!orderData || !orderId || !isMountedRef.current) return;
		console.log("PaymentView.jsx: Retrying payment...");
		// Reset state to allow the main useEffect to trigger payment again
		setIsInitiating(true);
		hasStartedPaymentRef.current = false;
		// Note: processPayment itself should reset its internal state when called again by the useEffect
	};

	// Brand colors
	const primaryColor = "blue-600";
	const primaryHoverColor = "blue-700";
	const primaryRingColor = "blue-300";
	const successColor = "green-600";
	const errorColor = "red-600";

	return (
		<motion.div
			key="payment" // Key for animation triggering
			className="flex flex-col h-full bg-slate-50"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.3 }}
		>
			{/* Main Content Area */}
			<div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 text-center">
				<div className="w-full max-w-md">
					{/* Status Icon and Header */}
					<motion.div
						key={paymentStatus} // Animate change based on status
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ type: "spring", stiffness: 300, damping: 20 }}
						className="mb-6"
					>
						{/* Icon logic remains the same */}
						{paymentStatus === "success" && (
							<CheckCircleIcon
								className={`w-20 h-20 text-${successColor} mx-auto`}
							/>
						)}
						{paymentStatus === "error" && (
							<ExclamationCircleIcon
								className={`w-20 h-20 text-${errorColor} mx-auto`}
							/>
						)}
						{(paymentStatus === "idle" ||
							isInitiating ||
							paymentStatus === "connecting" ||
							paymentStatus === "reader_check") && (
							<CreditCardIcon className="w-20 h-20 text-slate-300 mx-auto" />
						)}
						{(paymentStatus === "processing" ||
							paymentStatus === "processing_intent" ||
							paymentStatus === "waiting_for_card") && (
							<div className="relative w-20 h-20 mx-auto">
								<CreditCardIcon className="w-20 h-20 text-slate-300 opacity-40" />
								<motion.div
									className={`absolute inset-0 border-4 border-${primaryColor} border-t-transparent rounded-full`}
									animate={{ rotate: 360 }}
									transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
								/>
							</div>
						)}
						{/* Header text logic remains the same */}
						<h1 className="text-3xl font-bold text-gray-900 mt-5 mb-2">
							{paymentStatus === "success"
								? "Payment Successful"
								: paymentStatus === "error"
								? "Payment Failed"
								: paymentStatus === "processing"
								? "Processing Payment..."
								: paymentStatus === "waiting_for_card"
								? "Complete Payment on Terminal"
								: paymentStatus === "processing_intent"
								? "Preparing Terminal..."
								: "Preparing Payment"}
						</h1>
					</motion.div>

					{/* Message / Details Area */}
					<div className="min-h-[6rem] mb-8">
						{/* Total Amount Display */}
						<p className="text-4xl font-bold text-gray-900 mb-1">
							{formatPrice(finalTotal)}{" "}
							{/* Display final total including tip */}
						</p>
						<p className="text-lg text-slate-500 mb-4">Total Amount Due</p>
						{/* Status specific messages logic remains the same */}
						{(paymentStatus === "processing" ||
							paymentStatus === "waiting_for_card" ||
							paymentStatus === "processing_intent") && (
							<p className="text-lg text-slate-600">
								Follow the instructions on the{" "}
								{readerInfo?.label || "payment terminal"}.
							</p>
						)}
						{paymentStatus === "success" && paymentResult?.cardInfo && (
							<p className="text-lg text-slate-600">
								{paymentResult.cardInfo.brand} ••••{" "}
								{paymentResult.cardInfo.last4}
							</p>
						)}
						{paymentStatus === "error" && (
							<p className="text-lg text-red-600 font-medium">
								{error || "An unknown error occurred."}
							</p>
						)}
						{(paymentStatus === "idle" ||
							isInitiating ||
							paymentStatus === "connecting" ||
							paymentStatus === "reader_check") && (
							<p className="text-lg text-slate-600">
								Please wait, connecting to terminal...
							</p>
						)}
					</div>

					{/* Action Button */}
					{paymentStatus === "error" && (
						<motion.button
							onClick={handleRetry}
							className={`inline-flex items-center gap-2 px-8 py-3 bg-${primaryColor} text-white rounded-lg shadow-sm hover:bg-${primaryHoverColor} transition-colors font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${primaryRingColor}`}
							whileTap={{ scale: 0.97 }}
						>
							<ArrowPathIcon className="w-5 h-5" />
							Try Again
						</motion.button>
					)}
				</div>
			</div>
		</motion.div>
	);
};

PaymentView.propTypes = {
	orderData: PropTypes.shape({
		subtotal: PropTypes.number,
		tax: PropTypes.number,
		total: PropTypes.number, // Expecting base total here
		tipAmount: PropTypes.number,
		orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		discountAmount: PropTypes.number,
		orderDiscount: PropTypes.object,
		isSplitPayment: PropTypes.bool,
		originalTotal: PropTypes.number,
		items: PropTypes.array, // Added items back as it's used
	}).isRequired, // Make orderData required
	onComplete: PropTypes.func,
};

export default PaymentView;
