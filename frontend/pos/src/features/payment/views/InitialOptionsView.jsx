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

export const InitialOptionsView = ({ handleNavigation }) => (
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
				onClick={() => handleNavigation("Cash", 1)}
				className="mb-3"
			/>
			<PaymentButton
				icon={CreditCardIcon}
				label="Pay with Credit Card"
				onClick={() => handleNavigation("Credit", 1)}
				className="mb-3"
			/>
			<PaymentButton
				icon={ArrowsRightLeftIcon}
				label="Split Payment"
				onClick={() => handleNavigation("Split", 1)}
			/>
		</ScrollableViewWrapper>
	</motion.div>
);

InitialOptionsView.propTypes = {
	...commonPropTypes,
	handleNavigation: PropTypes.func.isRequired,
};

export default InitialOptionsView;
