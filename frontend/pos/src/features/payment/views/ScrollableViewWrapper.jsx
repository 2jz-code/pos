// src/components/payment/views/ScrollableViewWrapper.jsx
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { paymentAnimations } from "../../../animations/paymentAnimations";

const { pageVariants, pageTransition } = paymentAnimations;

export const ScrollableViewWrapper = ({ children }) => (
	<motion.div
		className="absolute inset-0 overflow-hidden flex flex-col"
		variants={pageVariants}
		initial="enter"
		animate="center"
		exit="exit"
		transition={pageTransition}
	>
		<div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
			{children}
		</div>
	</motion.div>
);

ScrollableViewWrapper.propTypes = {
	children: PropTypes.node.isRequired,
};

export default ScrollableViewWrapper;
