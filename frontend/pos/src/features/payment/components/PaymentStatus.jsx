// src/features/payment/components/PaymentStatus.jsx
import { motion } from "framer-motion";
import PropTypes from "prop-types";

export const PaymentStatus = ({ error, isProcessing }) => {
	if (!error && !isProcessing) return null;

	return (
		<motion.div
			className={`p-3 rounded-lg mb-4 ${
				error ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
			}`}
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
		>
			{error ? (
				<p className="flex items-center gap-2">
					<span className="text-red-500">⚠️</span>
					{error}
				</p>
			) : (
				<p className="flex items-center gap-2">
					<span className="animate-spin">⭕</span>
					Processing payment...
				</p>
			)}
		</motion.div>
	);
};

PaymentStatus.propTypes = {
	error: PropTypes.string,
	isProcessing: PropTypes.bool,
};
