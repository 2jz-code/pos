import { useState } from "react";
import {
  BanknotesIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import PropTypes from "prop-types"; // ✅ Import PropTypes

export default function PaymentFlow({ totalAmount, onBack, onComplete }) {
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [amountPaid, setAmountPaid] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [customAmount, setCustomAmount] = useState("");

  const taxRate = 0.1;
  const taxAmount = totalAmount * taxRate;
  const payableAmount = totalAmount; // Already includes tax
  const remainingAmount = payableAmount - amountPaid;

  const handlePayment = (method, amount) => {
    const newAmountPaid = amountPaid + amount;
    setAmountPaid(newAmountPaid);
    setTransactions([...transactions, { method, amount }]);

    if (newAmountPaid >= payableAmount) {
      setTimeout(() => onComplete(), 1000);
    }
  };

  const goBack = () => {
    if (paymentMethod) {
      setPaymentMethod(null);
    } else if (splitMode) {
      setSplitMode(false);
    } else {
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: "0%", opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex flex-col relative"
    >
      <h2 className="text-xl font-semibold p-4">Payment</h2>

      {/* Payment Options */}
      <div className="flex-grow px-4 space-y-4">
        {!paymentMethod && !splitMode && (
          <>
            <button
              className="flex items-center px-6 py-3 bg-green-500 text-white rounded-lg w-full"
              onClick={() => setPaymentMethod("cash")}
            >
              <BanknotesIcon className="h-6 w-6 mr-2" />
              Pay with Cash
            </button>
            <button
              className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg w-full"
              onClick={() => setPaymentMethod("credit")}
            >
              <CreditCardIcon className="h-6 w-6 mr-2" />
              Pay with Credit Card
            </button>
            <button
              className="flex items-center px-6 py-3 bg-gray-400 text-black rounded-lg w-full"
              onClick={() => setSplitMode(true)}
            >
              <ArrowsRightLeftIcon className="h-6 w-6 mr-2" />
              Split Payment
            </button>
          </>
        )}

        {/* Split Payment Selection */}
        {splitMode && !paymentMethod && (
          <>
            <p className="text-lg font-semibold text-gray-700">
              Choose first payment method:
            </p>
            <button
              className="flex items-center px-6 py-3 bg-green-500 text-white rounded-lg w-full"
              onClick={() => setPaymentMethod("cash")}
            >
              <BanknotesIcon className="h-6 w-6 mr-2" />
              Pay with Cash
            </button>
            <button
              className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg w-full"
              onClick={() => setPaymentMethod("credit")}
            >
              <CreditCardIcon className="h-6 w-6 mr-2" />
              Pay with Credit Card
            </button>
          </>
        )}

        {/* Cash Payment */}
        {paymentMethod === "cash" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Remaining Balance: ${remainingAmount.toFixed(2)}
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {[5, 10, 20, 50].map((amount) => (
                <button
                  key={amount}
                  className="px-4 py-3 bg-yellow-500 text-black rounded-lg"
                  onClick={() => handlePayment("cash", amount)}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
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
                className="px-4 py-3 bg-green-600 text-white rounded-lg"
                onClick={() =>
                  handlePayment("cash", parseFloat(customAmount) || 0)
                }
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {/* Credit Card Payment */}
        {paymentMethod === "credit" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Remaining Balance: ${remainingAmount.toFixed(2)}
            </h3>
            <button
              className="px-6 py-3 bg-blue-500 text-white rounded-lg w-full"
              onClick={() => handlePayment("credit", remainingAmount)}
            >
              Confirm Credit Payment
            </button>
          </div>
        )}

        {/* Back Button (Below Payment Options) */}
        <button
          className="flex items-center px-6 py-3 bg-gray-500 text-white rounded-lg w-full"
          onClick={goBack}
        >
          <ArrowLeftIcon className="h-6 w-6 mr-2" />
          {paymentMethod || splitMode
            ? "Back to Payment Selection"
            : "Back to Cart"}
        </button>
      </div>

      {/* Pricing Section (Fixed at Bottom) */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t shadow-md p-4">
        <div className="mb-4 text-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-gray-800 font-semibold">
              ${Number(totalAmount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax (10%):</span>
            <span className="text-gray-800 font-semibold">
              ${taxAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-xl font-bold">
            <span className="text-gray-900">Total:</span>
            <span className="text-gray-900">${payableAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

PaymentFlow.propTypes = {
  totalAmount: PropTypes.number.isRequired, // ✅ Ensures totalAmount is a number
  onBack: PropTypes.func.isRequired, // ✅ Ensures onBack is a function
  onComplete: PropTypes.func.isRequired, // ✅ Ensures onComplete is a function
};
