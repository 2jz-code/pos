import { motion } from "framer-motion";
import { CreditCardIcon, BanknotesIcon } from "@heroicons/react/24/solid";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";

const { pageVariants, pageTransition } = paymentAnimations;

const commonPropTypes = {
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
		customAmount: PropTypes.string.isRequired, // Added this
	}).isRequired,
};

const commonMotionProps = {
	variants: pageVariants,
	initial: "enter",
	animate: "center",
	exit: "exit",
	transition: pageTransition,
};

const getOrdinalSuffix = (number) => {
	const j = number % 10;
	const k = number % 100;
	if (j === 1 && k !== 11) return "st";
	if (j === 2 && k !== 12) return "nd";
	if (j === 3 && k !== 13) return "rd";
	return "th";
};

export const SplitPaymentView = ({
	state,
	remainingAmount,
	handleNavigation,
}) => {
	// Handler for selecting payment method in split mode
	const handlePaymentMethodSelect = (method) => {
		handleNavigation(method, 1); // Navigate to the payment view directly
	};

	return (
		<motion.div
			key="split-payment"
			className="absolute inset-0 p-4 space-y-4"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper>
				<div className="text-center mb-6">
					<h3 className="text-lg font-medium text-slate-800 mb-2">
						Split Payment
					</h3>
					<p className="text-slate-500 text-sm">
						Choose payment method for each portion
					</p>
				</div>

				<motion.div
					className="p-4 bg-blue-50 text-blue-700 rounded-lg space-y-2 mb-6"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<div className="flex justify-between">
						<span className="font-medium">Remaining Balance:</span>
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
				</motion.div>

				<div className="space-y-4">
					<h3 className="text-sm font-medium text-slate-600 mb-2">
						Select payment method for {state.transactions.length + 1}
						{getOrdinalSuffix(state.transactions.length + 1)} payment
					</h3>

					<PaymentButton
						icon={BanknotesIcon}
						label="Pay with Cash"
						onClick={() => handlePaymentMethodSelect("Cash")}
						disabled={remainingAmount === 0}
					/>

					<PaymentButton
						icon={CreditCardIcon}
						label="Pay with Credit Card"
						onClick={() => handlePaymentMethodSelect("Credit")}
						disabled={remainingAmount === 0}
					/>

					{state.transactions.length > 0 && (
						<div className="mt-6 space-y-2">
							<h4 className="text-sm font-medium text-slate-600 mb-2">
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
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

SplitPaymentView.propTypes = {
	...commonPropTypes,
	remainingAmount: PropTypes.number.isRequired,
	handleNavigation: PropTypes.func.isRequired,
};

export default SplitPaymentView;
