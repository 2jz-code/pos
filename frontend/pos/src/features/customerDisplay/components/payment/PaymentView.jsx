import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useTerminalSimulation } from "../../hooks/useTerminalSimulation"; // Ensure path is correct
import { formatPrice } from "../../../../utils/numberUtils"; // Ensure path is correct
import {
	CheckCircleIcon,
	ExclamationCircleIcon,
	CreditCardIcon,
	ArrowPathIcon as ArrowPathSolidIcon, // Use Solid for consistency
	WifiIcon, // Added for waiting state
	CpuChipIcon, // Added for processing state
} from "@heroicons/react/24/solid"; // Using solid icons for status

/**
 * PaymentView Component (UI Revamped)
 * Displays payment status and amount during card transactions on the customer display.
 */
const PaymentView = ({ orderData, onComplete }) => {
	const [isInitiating, setIsInitiating] = useState(true); // Track initial setup phase
	const { processPayment, paymentStatus, paymentResult, error, readerInfo } =
		useTerminalSimulation();
	const hasStartedPaymentRef = useRef(false); // Prevent multiple payment starts
	const isMountedRef = useRef(true); // Track mount status for async operations

	// Safely get order details
	const tipAmount = orderData?.tipAmount || 0;
	const baseTotal = typeof orderData?.total === "number" ? orderData.total : 0; // Base amount for this payment step
	const finalTotal = baseTotal + tipAmount; // Total including tip for display
	const orderId = orderData?.orderId;

	// Mount/Unmount effect
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	// Effect to start the payment process via the simulation hook
	useEffect(() => {
		// Guards to prevent running multiple times or with invalid data
		if (
			hasStartedPaymentRef.current ||
			!orderData ||
			!orderId ||
			!isInitiating ||
			!isMountedRef.current
		) {
			return;
		}

		// Short delay before initiating payment processing
		const timer = setTimeout(() => {
			if (!isMountedRef.current) return;

			setIsInitiating(false); // Mark initiation complete
			console.log(
				`PaymentView: Initiating payment for Order ${orderId}, Base: ${baseTotal}, Tip: ${tipAmount}, Final: ${finalTotal}`
			);

			// Prepare data object for the simulation hook
			const dataForSimulation = {
				total: baseTotal, // Pass the BASE total for the payment intent
				tipAmount: tipAmount,
				orderId: orderId,
				isSplitPayment: orderData?.isSplitPayment,
				originalTotal: orderData?.originalTotal,
				items: orderData?.items,
				discountAmount: orderData?.discountAmount,
				orderDiscount: orderData?.orderDiscount,
			};

			console.log(
				"PaymentView: Calling processPayment with data:",
				JSON.stringify(dataForSimulation, null, 2)
			);
			hasStartedPaymentRef.current = true; // Mark payment as started
			processPayment(dataForSimulation); // Trigger the simulation hook
		}, 1500); // Delay before starting

		return () => clearTimeout(timer); // Cleanup timer
	}, [orderData, orderId, baseTotal, tipAmount, processPayment, isInitiating]);

	// Effect to handle completion when payment succeeds
	useEffect(() => {
		if (paymentStatus === "success" && paymentResult && onComplete) {
			if (!isMountedRef.current) return;

			// Delay before calling onComplete to allow user to see success message
			const timer = setTimeout(() => {
				if (!isMountedRef.current) return;

				const completionData = {
					status: "success",
					...paymentResult, // Include result details (amount, cardInfo, etc.)
					orderId,
				};
				console.log(
					"PaymentView: Payment successful, calling onComplete:",
					completionData
				);
				onComplete(completionData); // Signal completion to parent
			}, 2000); // 2-second delay

			return () => clearTimeout(timer);
		}
	}, [paymentStatus, paymentResult, onComplete, orderId]);

	// Effect to allow retry on error
	useEffect(() => {
		if (paymentStatus === "error" && isMountedRef.current) {
			hasStartedPaymentRef.current = false; // Reset flag to allow retry
		}
	}, [paymentStatus]);

	// Retry handler
	const handleRetry = () => {
		if (!orderData || !orderId || !isMountedRef.current || isInitiating) return;
		console.log("PaymentView: Retrying payment...");
		setIsInitiating(true); // Re-trigger the payment initiation effect
		hasStartedPaymentRef.current = false;
		// The processPayment hook should handle resetting its internal state
	};

	// Determine status message and icon based on paymentStatus
	const getStatusDisplay = () => {
		switch (paymentStatus) {
			case "success":
				return {
					Icon: CheckCircleIcon,
					text: "Payment Successful",
					color: "text-green-500",
					message: paymentResult?.cardInfo
						? `${paymentResult.cardInfo.brand} •••• ${paymentResult.cardInfo.last4}`
						: "Approved",
				};
			case "error":
				return {
					Icon: ExclamationCircleIcon,
					text: "Payment Failed",
					color: "text-red-500",
					message: error || "An unknown error occurred.",
				};
			case "processing":
			case "processing_intent":
				return {
					Icon: CpuChipIcon,
					text: "Processing Payment...",
					color: "text-blue-500",
					message: "Please wait...",
					animate: true,
				};
			case "waiting_for_card":
				return {
					Icon: WifiIcon,
					text: "Complete Payment on Terminal",
					color: "text-blue-500",
					message: `Follow instructions on ${readerInfo?.label || "terminal"}.`,
					animate: true,
				};
			case "connecting":
			case "reader_check":
			case "creating_intent":
			case "idle":
			default:
				return {
					Icon: CreditCardIcon,
					text: "Preparing Payment",
					color: "text-slate-400",
					message: "Please wait, connecting...",
				};
		}
	};
	const { Icon, text, color, message, animate } = getStatusDisplay();

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1 },
		exit: { opacity: 0 },
	};
	const itemVariants = {
		hidden: { opacity: 0, scale: 0.8 },
		visible: {
			opacity: 1,
			scale: 1,
			transition: { type: "spring", stiffness: 300, damping: 20 },
		},
	};

	return (
		<motion.div
			key="payment" // Key for AnimatePresence
			className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-8 text-center md:p-12 lg:p-16"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			transition={{ duration: 0.3 }}
		>
			<div className="w-full max-w-md">
				{/* Status Icon */}
				<motion.div
					key={paymentStatus}
					variants={itemVariants}
					className="mb-6"
				>
					<Icon
						className={`mx-auto h-20 w-20 ${color} ${
							animate ? "animate-pulse" : ""
						}`}
					/>
				</motion.div>

				{/* Status Header */}
				<motion.h1
					variants={itemVariants}
					className="mb-2 text-3xl font-bold text-slate-900"
				>
					{text}
				</motion.h1>

				{/* Amount Display */}
				<motion.p
					variants={itemVariants}
					className="mb-4 text-4xl font-bold text-blue-600"
				>
					{formatPrice(finalTotal)}
				</motion.p>

				{/* Status Message */}
				<motion.div
					variants={itemVariants}
					className="min-h-[3rem] text-lg text-slate-600" // Ensure minimum height
				>
					{message}
				</motion.div>

				{/* Retry Button */}
				{paymentStatus === "error" && (
					<motion.div
						variants={itemVariants}
						className="mt-8"
					>
						<button
							onClick={handleRetry}
							className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						>
							<ArrowPathSolidIcon className="h-5 w-5" />
							Try Again
						</button>
					</motion.div>
				)}
			</div>
		</motion.div>
	);
};

PaymentView.propTypes = {
	orderData: PropTypes.shape({
		total: PropTypes.number, // Base total for this step
		tipAmount: PropTypes.number,
		orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		isSplitPayment: PropTypes.bool,
		originalTotal: PropTypes.number,
		items: PropTypes.array,
		discountAmount: PropTypes.number,
		orderDiscount: PropTypes.object,
	}).isRequired,
	onComplete: PropTypes.func,
};

export default PaymentView;
