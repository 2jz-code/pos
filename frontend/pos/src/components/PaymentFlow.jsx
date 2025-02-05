import { useState } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";

export default function PaymentFlow({ totalAmount, onClose, onComplete }) {
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [amountPaid, setAmountPaid] = useState(0);
  const [transactions, setTransactions] = useState([]); // ✅ Track multiple payments
  const [splitMode, setSplitMode] = useState(false); // ✅ Track if split payment is selected
  const [customAmount, setCustomAmount] = useState(""); // ✅ Custom input for manual payments

  const remainingAmount = totalAmount - amountPaid;

  // ✅ Handle payment input (cash or card)
  const handlePayment = (method, amount) => {
    const newAmountPaid = amountPaid + amount;
    setAmountPaid(newAmountPaid);
    setTransactions([...transactions, { method, amount }]);

    if (newAmountPaid >= totalAmount) finalizePayment();
  };

  // ✅ Finalize Order when fully paid
  const finalizePayment = () => {
    if (amountPaid >= totalAmount) {
      onComplete(transactions);
    }
  };

  // ✅ Handle back button functionality
  const handleBack = () => {
    if (splitMode) {
      setSplitMode(false);
      setPaymentMethod(null);
    } else if (paymentMethod) {
      setPaymentMethod(null);
    } else {
      onClose();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white p-6 rounded-lg w-1/3 text-black shadow-lg"
        initial={{ y: "-50%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        exit={{ y: "-50%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        <h2 className="text-2xl font-bold">Payment</h2>

        {/* Step 1: Choose Payment Method or Split Payment */}
        {!paymentMethod && !splitMode && (
          <motion.div
            className="mt-4 flex flex-col space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              className="px-4 py-2 bg-green-500 text-white rounded-lg"
              onClick={() => setPaymentMethod("cash")}
            >
              💵 Pay with Cash
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              onClick={() => setPaymentMethod("credit")}
            >
              💳 Pay with Credit Card
            </button>
            <button
              className="px-4 py-2 bg-gray-400 text-black rounded-lg"
              onClick={() => setSplitMode(true)}
            >
              🔄 Split Payment
            </button>
          </motion.div>
        )}

        {/* Step 2: Choose Payment Method for Split */}
        {splitMode && !paymentMethod && (
          <motion.div
            className="mt-4 flex flex-col space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-lg font-semibold">
              Choose first payment method:
            </h3>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded-lg"
              onClick={() => setPaymentMethod("cash")}
            >
              💵 Pay with Cash
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              onClick={() => setPaymentMethod("credit")}
            >
              💳 Pay with Credit Card
            </button>
          </motion.div>
        )}

        {/* Step 3: Cash Payment Options */}
        {paymentMethod === "cash" && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 150 }}
          >
            <h3 className="text-lg">Total: ${totalAmount.toFixed(2)}</h3>
            <h3 className="text-lg">
              Remaining: ${remainingAmount.toFixed(2)}
            </h3>

            {/* Quick Cash Buttons */}
            <div className="flex space-x-2 mt-4">
              {[5, 10, 20, 50].map((amount) => (
                <button
                  key={amount}
                  className="px-4 py-2 bg-yellow-500 text-black rounded-lg"
                  onClick={() => handlePayment("cash", amount)}
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Manual Cash Input */}
            <div className="mt-4">
              <input
                type="number"
                className="border p-2 rounded-lg w-full"
                placeholder="Enter custom amount"
                min="1"
                max={remainingAmount}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
              <button
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg"
                onClick={() => handlePayment("cash", parseFloat(customAmount))}
              >
                Confirm Cash Payment
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Credit Card Payment */}
        {paymentMethod === "credit" && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 150 }}
          >
            <h3 className="text-lg">
              Remaining Balance: ${remainingAmount.toFixed(2)}
            </h3>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
              onClick={() => handlePayment("credit", remainingAmount)}
            >
              Confirm Credit Payment
            </button>
          </motion.div>
        )}

        {/* Show Payment Summary */}
        {transactions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold">Payment Summary</h3>
            <ul className="mt-2 text-gray-700">
              {transactions.map((tx, index) => (
                <li key={index}>
                  {tx.method}: ${tx.amount.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Back & Close Buttons */}
        <div className="flex justify-between mt-4">
          <motion.button
            className="px-4 py-2 bg-gray-500 text-white rounded-lg"
            onClick={handleBack}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            ← Back
          </motion.button>

          <motion.button
            className="px-4 py-2 bg-gray-500 text-white rounded-lg"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

PaymentFlow.propTypes = {
  totalAmount: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onComplete: PropTypes.func.isRequired,
};
