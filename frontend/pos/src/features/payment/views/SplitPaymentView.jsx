// Enhanced SplitPaymentView.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCardIcon, BanknotesIcon } from "@heroicons/react/24/solid";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";

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
		// Calculate the amount for this split
		let amountForThisSplit;

		if (splitMode === "remaining") {
			amountForThisSplit = remainingAmount;
		} else if (splitMode === "equal") {
			amountForThisSplit = parseFloat(equalSplitAmount);
		} else {
			// custom
			amountForThisSplit = parseFloat(splitAmount);
		}

		// Update state with the split amount
		setState((prev) => ({
			...prev,
			nextSplitAmount: amountForThisSplit,
			currentSplitMethod: method,
		}));

		// Navigate to the payment method view
		handleNavigation(method, 1);
	};

	return (
		<motion.div
			key="split-payment"
			className="absolute inset-0 p-4 space-y-4"
			custom={state.direction}
			variants={pageVariants}
			initial="enter"
			animate="center"
			exit="exit"
			transition={pageTransition}
		>
			<ScrollableViewWrapper>
				<div className="text-center mb-6">
					<h3 className="text-lg font-medium text-slate-800 mb-2">
						Split Payment
					</h3>
					<p className="text-slate-500 text-sm">
						Choose how you want to split the payment
					</p>
				</div>

				{/* Payment summary */}
				<motion.div
					className="p-4 bg-blue-50 text-blue-700 rounded-lg space-y-2 mb-6"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<div className="flex justify-between">
						<span className="font-medium">Total Amount:</span>
						<span className="font-bold">${remainingAmount.toFixed(2)}</span>
					</div>
					{state.amountPaid > 0 && (
						<div className="flex justify-between text-emerald-600">
							<span>Amount Paid:</span>
							<span className="font-medium">
								${state.amountPaid.toFixed(2)}
							</span>
						</div>
					)}
					<div className="flex justify-between text-amber-600">
						<span>Remaining:</span>
						<span className="font-medium">${remainingAmount.toFixed(2)}</span>
					</div>
				</motion.div>

				{/* Split configuration options */}
				<div className="space-y-4 mb-6">
					<h4 className="text-sm font-medium text-slate-600">Split Options</h4>

					{/* Split type toggle */}
					<div className="flex flex-wrap gap-2 mb-4">
						<button
							onClick={() => setSplitMode("remaining")}
							className={`flex-1 py-2 px-3 rounded-lg border ${
								splitMode === "remaining"
									? "bg-blue-50 border-blue-400 text-blue-700"
									: "bg-white border-slate-200 text-slate-700"
							}`}
						>
							Pay Remaining
						</button>
						<button
							onClick={() => setSplitMode("equal")}
							className={`flex-1 py-2 px-3 rounded-lg border ${
								splitMode === "equal"
									? "bg-blue-50 border-blue-400 text-blue-700"
									: "bg-white border-slate-200 text-slate-700"
							}`}
						>
							Equal Split
						</button>
						<button
							onClick={() => setSplitMode("custom")}
							className={`flex-1 py-2 px-3 rounded-lg border ${
								splitMode === "custom"
									? "bg-blue-50 border-blue-400 text-blue-700"
									: "bg-white border-slate-200 text-slate-700"
							}`}
						>
							Custom Amount
						</button>
					</div>

					{/* Remaining amount option */}
					{splitMode === "remaining" && (
						<div className="space-y-3">
							<div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
								<div className="flex justify-between text-sm mb-1">
									<span>Amount to pay:</span>
									<span className="font-medium">
										${remainingAmount.toFixed(2)}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span>After payment:</span>
									<span className="font-medium">$0.00</span>
								</div>
							</div>
						</div>
					)}

					{/* Equal split options */}
					{splitMode === "equal" && (
						<div className="space-y-3">
							<label className="block text-sm text-slate-600">
								Number of equal payments:
							</label>
							<div className="grid grid-cols-4 gap-2">
								{[2, 3, 4, 5].map((num) => (
									<button
										key={num}
										onClick={() => setNumberOfSplits(num)}
										className={`py-2 rounded-lg border ${
											numberOfSplits === num
												? "bg-blue-50 border-blue-400 text-blue-700"
												: "bg-white border-slate-200 text-slate-700"
										}`}
									>
										{num}
									</button>
								))}
							</div>
							<div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
								<div className="flex justify-between text-sm mb-1">
									<span>Each payment amount:</span>
									<span className="font-medium">${equalSplitAmount}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span>Number of payments:</span>
									<span className="font-medium">{numberOfSplits}</span>
								</div>
							</div>
						</div>
					)}

					{/* Custom amount input */}
					{splitMode === "custom" && (
						<div className="space-y-3">
							<label
								htmlFor="customSplitAmount"
								className="block text-sm text-slate-600"
							>
								Amount for this payment:
							</label>
							<div className="relative">
								<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
									$
								</span>
								<input
									id="customSplitAmount"
									type="number"
									value={splitAmount}
									onChange={(e) => setSplitAmount(e.target.value)}
									className="block w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
									placeholder="Enter amount"
									min="0.01"
									max={remainingAmount}
									step="0.01"
								/>
							</div>
							{splitAmount && (
								<div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
									<div className="flex justify-between text-sm">
										<span>Remaining after this payment:</span>
										<span className="font-medium">
											$
											{(remainingAmount - parseFloat(splitAmount || 0)).toFixed(
												2
											)}
										</span>
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Payment method selection for current split */}
				<div className="space-y-4">
					<h4 className="text-sm font-medium text-slate-600">
						{splitMode === "remaining"
							? "Select payment method for remaining amount"
							: splitMode === "equal"
							? `Select payment method for payment 1 of ${numberOfSplits}`
							: "Select payment method for this amount"}
					</h4>

					<PaymentButton
						icon={BanknotesIcon}
						label="Pay with Cash"
						onClick={() => handlePaymentMethodSelect("Cash")}
						disabled={
							splitMode === "custom" &&
							(!splitAmount ||
								parseFloat(splitAmount) <= 0 ||
								parseFloat(splitAmount) > remainingAmount)
						}
						className="mb-3"
					/>

					<PaymentButton
						icon={CreditCardIcon}
						label="Pay with Credit Card"
						onClick={() => handlePaymentMethodSelect("Credit")}
						disabled={
							splitMode === "custom" &&
							(!splitAmount ||
								parseFloat(splitAmount) <= 0 ||
								parseFloat(splitAmount) > remainingAmount)
						}
					/>
				</div>

				{/* Transaction history */}
				{state.transactions.length > 0 && (
					<div className="mt-6 space-y-2">
						<h4 className="text-sm font-medium text-slate-600">
							Payment History
						</h4>
						{state.transactions.map((transaction, index) => (
							<div
								key={index}
								className="p-3 bg-slate-50 rounded-lg flex justify-between text-sm border border-slate-200"
							>
								<span className="text-slate-600 flex items-center">
									{transaction.method === "cash" ? (
										<BanknotesIcon className="h-4 w-4 mr-2 text-slate-500" />
									) : (
										<CreditCardIcon className="h-4 w-4 mr-2 text-slate-500" />
									)}
									{transaction.method === "cash" ? "Cash" : "Credit Card"}
								</span>
								<span className="font-medium text-slate-800">
									${transaction.amount.toFixed(2)}
								</span>
							</div>
						))}
					</div>
				)}
			</ScrollableViewWrapper>
		</motion.div>
	);
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
