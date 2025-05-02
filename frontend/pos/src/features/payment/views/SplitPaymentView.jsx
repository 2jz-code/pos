// Enhanced SplitPaymentView.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
	CreditCardIcon,
	BanknotesIcon,
	AdjustmentsHorizontalIcon,
	ScaleIcon,
	VariableIcon,
} from "@heroicons/react/24/solid";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { formatPrice } from "../../../utils/numberUtils";

const { pageVariants, pageTransition } = paymentAnimations;

export const SplitPaymentView = ({
	state,
	remainingAmount,
	handleNavigation,
	setState,
}) => {
	// State for split configuration
	const [splitAmount, setSplitAmount] = useState("");
	const [splitMode, setSplitMode] = useState("remaining"); // "remaining", "equal" or "custom"
	const [numberOfSplits, setNumberOfSplits] = useState(2);

	// Calculate equal split amounts
	const equalSplitAmount = parseFloat(
		(remainingAmount / numberOfSplits).toFixed(2)
	);

	useEffect(() => {
		if (state.splitMode && state.amountPaid > 0) {
			console.log("SPLIT VIEW: Split view mounted after partial payment", {
				amountPaid: state.amountPaid,
				remainingAmount,
				transactions: state.transactions.length,
			});

			// Reset any "next" payment values to prevent auto-processing
			setState((prev) => ({
				...prev,
				nextSplitAmount: null,
				currentSplitMethod: null,
			}));
		}
	}, []);

	useEffect(() => {
		// Check if payment is already complete (remaining amount is zero)
		const epsilon = 0.01;
		const isFullyPaid = Math.abs(remainingAmount) < epsilon;

		if (isFullyPaid && state.splitMode) {
			console.log(
				"SPLIT VIEW: Payment already complete, redirecting to completion",
				{
					remainingAmount,
					amountPaid: state.amountPaid,
					totalAmount: remainingAmount + state.amountPaid,
					isFullyPaid,
					epsilon,
				}
			);

			// Add a slight delay to allow rendering to complete
			const timer = setTimeout(() => {
				handleNavigation("Completion", 1);
			}, 100);

			return () => clearTimeout(timer);
		}
	}, [remainingAmount, state.splitMode, state.amountPaid, handleNavigation]);

	// Update split mode in parent state
	useEffect(() => {
		setState((prev) => ({
			...prev,
			splitMode: true,
			splitDetails: {
				mode: splitMode,
				numberOfSplits: splitMode === "equal" ? numberOfSplits : null,
				customAmount: splitMode === "custom" ? parseFloat(splitAmount) : null,
				remainingAmount: splitMode === "remaining" ? remainingAmount : null,
				currentSplitIndex: state.splitDetails?.currentSplitIndex || 0,
			},
		}));
	}, [splitMode, numberOfSplits, splitAmount, remainingAmount, setState]);

	// Handle selecting a payment method for the current split
	const handlePaymentMethodSelect = (method) => {
		let amountForThisSplit;
		if (splitMode === "remaining") {
			amountForThisSplit = remainingAmount;
		} else if (splitMode === "equal") {
			amountForThisSplit = parseFloat(equalSplitAmount.toFixed(2)); // Ensure precision
		} else {
			// custom
			amountForThisSplit = parseFloat(splitAmount || 0); // Ensure fallback if empty
			// Add validation check here before proceeding if desired
			const epsilon = 0.01;
			if (
				amountForThisSplit < epsilon ||
				amountForThisSplit > remainingAmount + epsilon
			) {
				console.error("SPLIT VIEW: Invalid custom amount selected.");
				// Optionally set an error state and return
				return;
			}
			amountForThisSplit = parseFloat(amountForThisSplit.toFixed(2)); // Ensure precision
		}

		// No longer need setState here to set nextSplitAmount, handleNavigation will do it.
		// setState((prev) => ({
		//     ...prev,
		//     nextSplitAmount: amountForThisSplit, // REMOVE THIS LINE
		//     currentSplitMethod: method,          // Keep this if needed, or pass via nav options
		// }));

		console.log(
			`SPLIT VIEW: Navigating to ${method} with amount: ${amountForThisSplit}`
		);

		// *** MODIFIED CALL: Pass amount in navigation options ***
		handleNavigation(method, 1, { nextSplitAmount: amountForThisSplit });
	};

	return (
		<motion.div
			key="split-payment-ui" // Unique key
			className="absolute inset-0 p-4 flex flex-col bg-slate-50" // Added background, flex-col
			custom={state.direction}
			variants={pageVariants}
			initial="enter"
			animate="center"
			exit="exit"
			transition={pageTransition}
		>
			{/* Scrollable main content area */}
			<ScrollableViewWrapper className="flex-grow space-y-4 mb-4">
				{" "}
				{/* Added spacing and margin */}
				{/* Header */}
				<div className="text-center">
					{" "}
					{/* Removed mb-6 */}
					<h3 className="text-xl font-semibold text-slate-800 mb-1">
						{" "}
						{/* Larger text */}
						Split Payment
					</h3>
					<p className="text-slate-500 text-sm">
						Choose how to split the remaining amount
					</p>
				</div>
				{/* Payment summary - Styled like blue amount box */}
				<motion.div
					className="p-4 bg-blue-50 text-blue-700 rounded-lg space-y-2 shadow border border-blue-100" // Added border and shadow
					initial={{ opacity: 0, y: 10 }} // Adjusted animation
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
				>
					<div className="flex justify-between items-center">
						<span className="font-medium text-blue-800">Total Due:</span>
						{/* Use total amount for context */}
						<span className="font-bold text-lg text-blue-900">
							{formatPrice(state.amountPaid + remainingAmount)}
						</span>
					</div>
					{state.amountPaid > 0 && (
						<div className="flex justify-between items-center text-sm text-emerald-700">
							<span>Amount Paid:</span>
							<span className="font-medium">
								{formatPrice(state.amountPaid)}
							</span>
						</div>
					)}
					<div className="flex justify-between items-center text-lg text-blue-900 border-t border-blue-100 pt-2 mt-2">
						<span className="font-semibold">Remaining:</span>
						<span className="font-bold">{formatPrice(remainingAmount)}</span>
					</div>
				</motion.div>
				{/* Split configuration options */}
				<div className="space-y-4">
					{" "}
					{/* Removed mb-6 */}
					<h4 className="text-base font-semibold text-slate-700 border-b pb-2">
						Split Options
					</h4>{" "}
					{/* Styled heading */}
					{/* Split type toggle - Improved styling */}
					<div className="flex flex-col sm:flex-row gap-2">
						{" "}
						{/* Stack on small screens */}
						{[
							{
								mode: "remaining",
								label: "Pay Remaining",
								icon: AdjustmentsHorizontalIcon,
							},
							{ mode: "equal", label: "Equal Split", icon: ScaleIcon },
							{ mode: "custom", label: "Custom Amount", icon: VariableIcon },
						].map(({ mode, label, icon: Icon }) => (
							<button
								key={mode}
								onClick={() => setSplitMode(mode)}
								className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
									splitMode === mode
										? "bg-blue-600 border-blue-600 text-white shadow-sm" // Active state
										: "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400" // Inactive state
								}`}
							>
								<Icon className="h-4 w-4" />
								<span>{label}</span>
							</button>
						))}
					</div>
					{/* Conditional Options based on splitMode */}
					<div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm min-h-[100px]">
						{" "}
						{/* Container for options */}
						{/* Pay Remaining Info */}
						{splitMode === "remaining" && (
							<div className="space-y-2 text-sm">
								<p className="text-slate-600">
									This option will pay the full remaining amount.
								</p>
								<div className="flex justify-between font-medium text-slate-800">
									<span>Amount to pay:</span>
									<span>{formatPrice(remainingAmount)}</span>
								</div>
								<div className="flex justify-between text-xs text-slate-500">
									<span>Balance after payment:</span>
									<span>$0.00</span>
								</div>
							</div>
						)}
						{/* Equal Split Options */}
						{splitMode === "equal" && (
							<div className="space-y-3">
								<label className="block text-sm font-medium text-slate-700">
									Number of equal payments:
								</label>
								<div className="grid grid-cols-4 gap-2">
									{[2, 3, 4, 5].map((num) => (
										<button
											key={num}
											onClick={() => setNumberOfSplits(num)}
											className={`py-2 rounded-md border text-sm font-medium transition-colors ${
												numberOfSplits === num
													? "bg-blue-100 border-blue-300 text-blue-800 ring-1 ring-blue-300"
													: "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
											}`}
										>
											{num}
										</button>
									))}
								</div>
								<div className="text-sm space-y-1 pt-2 border-t border-slate-100 mt-2">
									<div className="flex justify-between">
										<span className="text-slate-600">Each payment:</span>
										<span className="font-medium text-slate-800">
											{formatPrice(equalSplitAmount)}
										</span>
									</div>
								</div>
							</div>
						)}
						{/* Custom Amount Input */}
						{splitMode === "custom" && (
							<div className="space-y-3">
								<label
									htmlFor="customSplitAmount"
									className="block text-sm font-medium text-slate-700"
								>
									Amount for this payment:
								</label>
								<div className="relative">
									<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
										$
									</span>
									<input
										id="customSplitAmount"
										type="number"
										value={splitAmount}
										onChange={(e) => setSplitAmount(e.target.value)}
										className="block w-full pl-7 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-right" // Added text-right
										placeholder="0.00"
										min="0.01"
										max={remainingAmount}
										step="0.01"
									/>
								</div>
								{splitAmount && parseFloat(splitAmount) > 0 && (
									<div className="text-sm space-y-1 pt-2 border-t border-slate-100 mt-2">
										<div className="flex justify-between">
											<span className="text-slate-600">Remaining after:</span>
											<span className="font-medium text-slate-800">
												{formatPrice(
													remainingAmount - parseFloat(splitAmount || 0)
												)}
											</span>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
				{/* Payment method selection for current split */}
				<div className="space-y-3 pt-4 border-t border-slate-200">
					{" "}
					{/* Added border */}
					<h4 className="text-base font-semibold text-slate-700">
						{/* Dynamic heading based on split mode */}
						{splitMode === "remaining"
							? "Choose Payment Method"
							: `Pay ${
									splitMode === "equal"
										? formatPrice(equalSplitAmount)
										: splitMode === "custom" && splitAmount
										? formatPrice(parseFloat(splitAmount))
										: "..."
							  } with:`}
					</h4>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{" "}
						{/* Responsive grid */}
						<PaymentButton
							icon={BanknotesIcon}
							label="Cash"
							onClick={() => handlePaymentMethodSelect("Cash")}
							// Disable logic remains the same
							disabled={
								splitMode === "custom" &&
								(!splitAmount ||
									parseFloat(splitAmount) <= 0 ||
									parseFloat(splitAmount) > remainingAmount)
							}
							variant="default" // Use default style
							className="py-3 text-base" // Consistent size
						/>
						<PaymentButton
							icon={CreditCardIcon}
							label="Credit Card"
							onClick={() => handlePaymentMethodSelect("Credit")}
							// Disable logic remains the same
							disabled={
								splitMode === "custom" &&
								(!splitAmount ||
									parseFloat(splitAmount) <= 0 ||
									parseFloat(splitAmount) > remainingAmount)
							}
							variant="default" // Use default style
							className="py-3 text-base" // Consistent size
						/>
					</div>
				</div>
				{/* Transaction history */}
				{state.transactions.length > 0 && (
					<div className="mt-6 space-y-2 pt-4 border-t border-slate-200">
						{" "}
						{/* Added border */}
						<h4 className="text-sm font-medium text-slate-600">
							Payment History
						</h4>
						{state.transactions.map((transaction, index) => (
							<div
								key={index}
								className="p-3 bg-white rounded-lg flex justify-between items-center text-sm border border-slate-200 shadow-sm" // Improved item styling
							>
								<span className="text-slate-600 flex items-center">
									{transaction.method === "cash" ? (
										<BanknotesIcon className="h-5 w-5 mr-2 text-green-600" /> // Colored icons
									) : (
										<CreditCardIcon className="h-5 w-5 mr-2 text-blue-600" /> // Colored icons
									)}
									{transaction.method === "cash" ? "Cash" : "Card"}{" "}
									{/* Shortened label */}
								</span>
								<span className="font-semibold text-slate-800">
									{formatPrice(transaction.amount)}
								</span>
							</div>
						))}
					</div>
				)}
			</ScrollableViewWrapper>
		</motion.div>
	);
	// --- END OF UI UPDATES ---
};

SplitPaymentView.propTypes = {
	state: PropTypes.shape({
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		transactions: PropTypes.arrayOf(
			PropTypes.shape({
				method: PropTypes.oneOf(["cash", "credit"]).isRequired,
				amount: PropTypes.number.isRequired,
				cashTendered: PropTypes.number,
				change: PropTypes.number,
			})
		).isRequired,
		customAmount: PropTypes.string.isRequired,
		splitDetails: PropTypes.object,
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired,
	handleNavigation: PropTypes.func.isRequired,
	setState: PropTypes.func.isRequired,
};

export default SplitPaymentView;
