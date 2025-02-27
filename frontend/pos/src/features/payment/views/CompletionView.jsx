// src/components/payment/views/CompletionView.jsx
import { motion } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";

const { pageVariants, pageTransition } = paymentAnimations;

export const CompletionView = ({ onStartNewOrder }) => {
	const handleStartNew = async () => {
		console.log("Starting new order from completion view");
		await onStartNewOrder();
	};

	return (
		<motion.div
			key="completion"
			className="absolute inset-0 p-4"
			variants={pageVariants}
			initial="enter"
			animate="center"
			exit="exit"
			transition={pageTransition}
		>
			<ScrollableViewWrapper>
				<div className="flex flex-col items-center justify-center space-y-6 py-8">
					<div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
						<CheckCircleIcon className="w-12 h-12 text-emerald-500" />
					</div>

					<h2 className="text-2xl font-semibold text-slate-800">
						Payment Complete!
					</h2>

					<div className="text-slate-600 text-center max-w-md">
						<p>The transaction has been processed successfully.</p>
						<p className="mt-2">Receipt has been printed.</p>
					</div>

					<PaymentButton
						label="Start New Order"
						variant="primary"
						onClick={handleStartNew}
						className="w-full max-w-md mt-8"
					/>
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CompletionView.propTypes = {
	onStartNewOrder: PropTypes.func.isRequired,
};

export default CompletionView;
