// src/components/payment/views/CashPaymentView.jsx
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { hardwareService } from "../../../api/services/hardwareService";
const { pageVariants, pageTransition } = paymentAnimations;

const commonMotionProps = {
  variants: pageVariants,
  initial: "enter",
  animate: "center",
  exit: "exit",
  transition: pageTransition,
};

export const CashPaymentView = ({
  state,
  remainingAmount,
  handlePayment, // This will be the processPayment function from PaymentFlow
  setState,
  isPaymentComplete,
  completePaymentFlow,
  handleNavigation
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [drawerState, setDrawerState] = useState("closed");
  const [paymentInProgress, setPaymentInProgress] = useState(false);

  useEffect(() => {
    console.log("CashPaymentView rendered with state:", {
      drawerState,
      isProcessing,
      paymentInProgress,
    });
  }, [drawerState, isProcessing, paymentInProgress]);

  // Use useEffect to monitor state changes
  useEffect(() => {
    console.log("Drawer state updated:", drawerState);
  }, [drawerState]);

  const getLatestTransaction = () => {
    if (state.transactions.length === 0) return null;
    return state.transactions[state.transactions.length - 1];
  };

  const shouldShowChangeCalculation = () => {
    const latestTransaction = getLatestTransaction();
    return (
      latestTransaction &&
      latestTransaction.method === "cash" &&
      typeof latestTransaction.cashTendered === "number"
    );
  };

  const handlePresetAmount = async (amount) => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log("Initial drawer state:", drawerState);

      const drawerResponse = await hardwareService.openDrawer();
      console.log("Drawer response:", drawerResponse);

      if (drawerResponse.status === "success") {
        console.log("Setting drawer state to open");
        setDrawerState("open");
        setPaymentInProgress(true);

        const validAmount = Math.min(amount, remainingAmount);
        const change = amount - validAmount;

        const success = await handlePayment(validAmount, {
          method: "cash",
          cashTendered: amount,
          change: change,
        });

        if (!success) {
          throw new Error("Payment processing failed");
        }
      } else {
        throw new Error("Failed to open cash drawer");
      }
    } catch (err) {
      setError(err.message || "Failed to process payment");
      console.error("Cash drawer error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomAmount = async () => {
    const amount = parseFloat(state.customAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      // Calculate valid payment amount
      const validAmount = Math.min(amount, remainingAmount);
      const change = amount - validAmount;

      // Process the payment
      const success = await handlePayment(validAmount, {
        method: "cash",
        cashTendered: amount,
        change: change,
      });

      if (success) {
        setState((prev) => ({ ...prev, customAmount: "" }));
      } else {
        throw new Error("Payment processing failed");
      }
    } catch (err) {
      setError(err.message || "Failed to process payment");
      console.error("Cash payment error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrawerClose = async () => {
    setIsProcessing(true);
    try {
      console.log('1. Starting drawer close');
      const response = await hardwareService.closeDrawer();
  
      if (response.status === "success") {
        console.log('2. Drawer closed successfully');
        setDrawerState("closed");
        setPaymentInProgress(false);
  
        if (isPaymentComplete()) {
          console.log('3. Payment is complete');
          const success = await completePaymentFlow();
          console.log('4. Payment completion result:', success);
          
          if (success) {
            console.log('5. Forcing navigation to Completion view');
            handleNavigation('Completion');
          }
        }
      } else {
        throw new Error("Failed to close drawer");
      }
    } catch (err) {
      setError("Failed to close drawer");
      console.error("Drawer close error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const canCloseDrawer = () => {
    return (
      shouldShowChangeCalculation() && drawerState === "open" && !isProcessing
    );
  };

  return (
    <motion.div
      key="cash-payment"
      className="absolute inset-0 p-4 space-y-4"
      custom={state.direction}
      {...commonMotionProps}
    >
      <ScrollableViewWrapper>
        {error && (
          <motion.div
            className="p-3 bg-red-50 text-red-600 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <motion.div
          className="p-3 bg-blue-50 text-blue-700 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Remaining Balance: ${remainingAmount.toFixed(2)}
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {[5, 10, 20, 50].map((amount) => (
            <PaymentButton
              key={amount}
              label={`$${amount}`}
              onClick={() => handlePresetAmount(amount)}
              disabled={isProcessing || remainingAmount === 0}
              className={isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isProcessing ? "Processing..." : `$${amount}`}
            </PaymentButton>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter custom amount"
            min="0.01"
            max={remainingAmount}
            value={state.customAmount}
            onChange={(e) =>
              setState((prev) => ({ ...prev, customAmount: e.target.value }))
            }
            disabled={isProcessing || remainingAmount === 0}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !isProcessing) {
                handleCustomAmount();
              }
            }}
          />
          <PaymentButton
            label={isProcessing ? "Processing..." : "Pay"}
            variant="primary"
            onClick={handleCustomAmount}
            disabled={
              isProcessing || !state.customAmount || remainingAmount === 0
            }
          />
        </div>

        {shouldShowChangeCalculation() && (
          <motion.div
            className="p-3 bg-green-50 text-green-700 rounded-lg space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">Cash Tendered:</span>
              <span className="text-lg">
                ${getLatestTransaction().cashTendered.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center font-bold">
              <span>Change Due:</span>
              <span className="text-lg">
                ${getLatestTransaction().change.toFixed(2)}
              </span>
            </div>
          </motion.div>
        )}
        <PaymentButton
          label="Close Drawer"
          variant="primary"
          onClick={handleDrawerClose}
          disabled={!canCloseDrawer()}
          className={`w-full mt-4 ${
            !canCloseDrawer() ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isProcessing ? "Processing..." : "Close Drawer"}
        </PaymentButton>
      </ScrollableViewWrapper>
    </motion.div>
  );
};

CashPaymentView.propTypes = {
  state: PropTypes.shape({
    direction: PropTypes.number.isRequired,
    paymentMethod: PropTypes.string,
    splitMode: PropTypes.bool.isRequired,
    amountPaid: PropTypes.number.isRequired,
    transactions: PropTypes.arrayOf(
      PropTypes.shape({
        method: PropTypes.string.isRequired,
        amount: PropTypes.number.isRequired,
        cashTendered: PropTypes.number,
        change: PropTypes.number,
      })
    ).isRequired,
    customAmount: PropTypes.string.isRequired,
    pendingPayment: PropTypes.shape({
      amount: PropTypes.number,
      cashTendered: PropTypes.number,
      change: PropTypes.number,
    }),
  }).isRequired,
  remainingAmount: PropTypes.number.isRequired,
  handlePayment: PropTypes.func.isRequired,
  setState: PropTypes.func.isRequired,
  isPaymentComplete: PropTypes.func.isRequired,
  completePaymentFlow: PropTypes.func.isRequired,
  handleNavigation: PropTypes.func.isRequired, // Add this line
};

export default CashPaymentView;
