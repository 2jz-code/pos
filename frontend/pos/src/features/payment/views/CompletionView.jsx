// src/components/payment/views/CompletionView.jsx
import { motion } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";

const { pageVariants, pageTransition } = paymentAnimations;

export const CompletionView = ({ onStartNewOrder }) => {
  console.log("Rendering CompletionView");

  const handleStartNew = async () => {
    console.log("Starting new order from completion view");
    await onStartNewOrder();
  };

  return (
    <motion.div
      key="completion"
      className="absolute inset-0 p-4 space-y-4"
      variants={pageVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={pageTransition}
    >
      <ScrollableViewWrapper>
        <div className="flex flex-col items-center justify-center space-y-6 py-8">
          <CheckCircleIcon className="w-16 h-16 text-green-500" />
          <h2 className="text-2xl font-semibold text-gray-800">
            Payment Complete!
          </h2>
          <p className="text-gray-600 text-center">
            The transaction has been processed successfully.
          </p>

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
