// src/features/payment/components/PaymentStatus.jsx
import { motion } from "framer-motion";
import PropTypes from "prop-types";

export const PaymentStatus = ({ error, isProcessing }) => {
	if (!error && !isProcessing) return null;

	return (
		<motion.div
			className={`p-4 rounded-lg mb-4 ${
				error ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
			} flex items-center`}
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
		>
			{error ? (
				<>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 mr-2 text-red-500"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
					{error}
				</>
			) : (
				<>
					<svg
						className="animate-spin h-5 w-5 mr-2 text-blue-600"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Processing payment...
				</>
			)}
		</motion.div>
	);
};

PaymentStatus.propTypes = {
	error: PropTypes.string,
	isProcessing: PropTypes.bool,
};
