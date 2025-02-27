// src/components/payment/PaymentButton.jsx
import { motion } from "framer-motion";
import PropTypes from "prop-types";

// Only keep button-specific animations
const buttonVariants = {
	hover: { scale: 1.01 },
	tap: { scale: 0.99 },
	disabled: { opacity: 0.5 },
};

export const PaymentButton = ({
	icon: Icon,
	label,
	onClick,
	variant = "default",
	disabled = false,
	className = "",
}) => {
	const getButtonStyles = () => {
		const baseStyles =
			"w-full px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-3 font-medium";

		const variants = {
			default:
				"bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm",
			primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
			danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
		};

		return `${baseStyles} ${variants[variant]} ${className}`;
	};

	return (
		<motion.button
			className={getButtonStyles()}
			onClick={onClick}
			variants={buttonVariants}
			whileHover="hover"
			whileTap="tap"
			disabled={disabled}
			animate={disabled ? "disabled" : "active"}
		>
			{Icon && (
				<Icon
					className={`h-5 w-5 ${
						variant === "default" ? "text-slate-500" : "text-current"
					}`}
				/>
			)}
			<span>{label}</span>
		</motion.button>
	);
};

PaymentButton.propTypes = {
	icon: PropTypes.elementType,
	label: PropTypes.string.isRequired,
	onClick: PropTypes.func.isRequired,
	variant: PropTypes.oneOf(["default", "primary", "danger"]),
	disabled: PropTypes.bool,
	className: PropTypes.string,
};

export default PaymentButton;
