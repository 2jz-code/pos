import { motion } from "framer-motion";
import {
	BanknotesIcon,
	CreditCardIcon,
	ArrowsRightLeftIcon,
} from "@heroicons/react/24/solid";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { useCustomerFlow } from "../../customerDisplay/hooks/useCustomerFlow";

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

export const InitialOptionsView = ({
	handleNavigation,
	state,
	remainingAmount,
}) => {
	const { startFlow, flowActive } = useCustomerFlow();

	const handlePaymentMethodSelect = (method) => {
		// Start customer flow if selecting cash payment
		if (method === "Cash" && !flowActive) {
			startFlow(state.orderId, "cash", remainingAmount);
		}

		// Navigate to the payment view
		handleNavigation(method, 1);
	};

	return (
		<motion.div
			key="initial-options"
			className="absolute inset-0 p-4 space-y-4"
			{...commonMotionProps}
		>
			<ScrollableViewWrapper>
				<div className="text-center mb-6">
					<h3 className="text-lg font-medium text-slate-800 mb-2">
						Select Payment Method
					</h3>
					<p className="text-slate-500 text-sm">
						Choose how you would like to complete this transaction
					</p>
				</div>

				<PaymentButton
					icon={BanknotesIcon}
					label="Pay with Cash"
					onClick={() => handlePaymentMethodSelect("Cash")}
					className="mb-3"
				/>
				<PaymentButton
					icon={CreditCardIcon}
					label="Pay with Credit Card"
					onClick={() => handlePaymentMethodSelect("Credit")}
					className="mb-3"
				/>
				<PaymentButton
					icon={ArrowsRightLeftIcon}
					label="Split Payment"
					onClick={() => handlePaymentMethodSelect("Split")}
				/>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

InitialOptionsView.propTypes = {
	...commonPropTypes,
	handleNavigation: PropTypes.func.isRequired,
};

export default InitialOptionsView;
