// src/features/payment/components/PaymentHeader.jsx
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import PropTypes from "prop-types";

export const PaymentHeader = ({ onBack, title = "Payment" }) => (
	<motion.header
		className="p-4 border-b border-slate-200 flex items-center justify-between"
		initial={{ opacity: 0, y: -20 }}
		animate={{ opacity: 1, y: 0 }}
	>
		<h2 className="text-xl font-semibold text-slate-800">{title}</h2>
		<button
			onClick={onBack}
			className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm 
				 transition-colors flex items-center gap-2"
		>
			<ArrowLeftIcon className="h-4 w-4" />
			<span>Back</span>
		</button>
	</motion.header>
);

PaymentHeader.propTypes = {
	onBack: PropTypes.func.isRequired,
	title: PropTypes.string,
};
