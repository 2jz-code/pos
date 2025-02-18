// src/features/payment/components/PaymentSummary.jsx
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { TAX_RATE } from "../utils/paymentCalculations";

export const PaymentSummary = ({
	totalAmount, // This represents the subtotal
	taxAmount,
	payableAmount,
	amountPaid,
}) => (
	<motion.footer
		className="border-t border-gray-300 p-4 bg-white space-y-2"
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
	>
		<div className="flex justify-between text-gray-600">
			<span>Subtotal</span>
			<span>${totalAmount.toFixed(2)}</span>
		</div>
		<div className="flex justify-between text-gray-600">
			<span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
			<span>${taxAmount.toFixed(2)}</span>
		</div>
		<div className="flex justify-between text-lg font-semibold text-gray-800">
			<span>Total</span>
			<span>${payableAmount.toFixed(2)}</span>
		</div>
		{amountPaid > 0 && (
			<div className="flex justify-between text-green-600 font-medium">
				<span>Amount Paid</span>
				<span>${amountPaid.toFixed(2)}</span>
			</div>
		)}
	</motion.footer>
);

PaymentSummary.propTypes = {
	totalAmount: PropTypes.number.isRequired, // Represents subtotal
	taxAmount: PropTypes.number.isRequired,
	payableAmount: PropTypes.number.isRequired,
	amountPaid: PropTypes.number.isRequired,
};
