import { motion } from "framer-motion";
import { CreditCardIcon } from "@heroicons/react/24/solid";
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

export const CreditPaymentView = ({
	state,
	remainingAmount,
	handlePayment,
}) => (
	<motion.div
		key="credit-payment"
		className="absolute inset-0 p-4 space-y-4"
		custom={state.direction}
		{...commonMotionProps}
	>
		<ScrollableViewWrapper>
			<motion.div
				className="p-3 bg-blue-50 text-blue-700 rounded-lg"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
			>
				Amount to Pay: ${remainingAmount.toFixed(2)}
			</motion.div>

			<div className="space-y-4">
				<PaymentButton
					icon={CreditCardIcon}
					label="Pay Full Amount"
					variant="primary"
					onClick={() => handlePayment("credit", remainingAmount)}
					disabled={remainingAmount === 0}
				/>

				<div className="p-3 bg-gray-50 rounded-lg space-y-2">
					<p className="text-sm text-gray-600">
						Payment will be processed via card terminal
					</p>
					<p className="text-xs text-gray-500">
						Please follow the instructions on the terminal
					</p>
				</div>
			</div>
		</ScrollableViewWrapper>
	</motion.div>
);

CreditPaymentView.propTypes = {
	...commonPropTypes,
	remainingAmount: PropTypes.number.isRequired,
	handlePayment: PropTypes.func.isRequired,
};

export default CreditPaymentView;
