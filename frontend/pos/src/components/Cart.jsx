import { useState } from "react";
import { useCartStore } from "../store/cartStore";
import axiosInstance from "../api/api";
import { useNavigate } from "react-router-dom";
import PaymentFlow from "../components/PaymentFlow";
import { ChevronRightIcon, XCircleIcon } from "@heroicons/react/24/solid";

export default function Cart() {
  const { cart = [], removeFromCart, clearCart } = useCartStore();
  const [expandedItem, setExpandedItem] = useState(null);
  const [isPaymentFlow, setIsPaymentFlow] = useState(false);
  const navigate = useNavigate();

  const totalAmount = cart.reduce(
    (acc, item) =>
      acc +
      (Number(item.price) || 0) *
        (Number(item.quantity) || 1) *
        (1 - (Number(item.discount) || 0) / 100),
    0
  );
  const taxAmount = totalAmount * 0.1;
  const payableAmount = totalAmount + taxAmount;

  const saveOrder = async () => {
    if (!cart.length) return;

    try {
      const orderData = {
        status: "saved",
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          discount: item.discount || 0,
        })),
      };

      await axiosInstance.post("orders/", orderData);
      alert("Order saved successfully!");
      clearCart();
      navigate("/orders");
    } catch (error) {
      console.error("Failed to save order:", error);
      alert("Error saving order.");
    }
  };

  return (
    <div className="w-1/3 bg-white shadow-lg p-6 rounded-lg flex flex-col h-full relative transition-all duration-500">
      {/* ✅ Toggle between Cart & Payment View (No Shift) */}
      {!isPaymentFlow ? (
        <>
          <h2 className="text-xl font-semibold mb-4">Cart Summary</h2>

          {/* ✅ Scrollable cart items */}
          <div className="flex-grow overflow-y-auto max-h-[400px] space-y-2">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center">Cart is empty.</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-200 rounded-lg shadow-sm overflow-hidden"
                >
                  <div
                    className="p-3 flex justify-between items-center cursor-pointer"
                    onClick={() =>
                      setExpandedItem(expandedItem === item.id ? null : item.id)
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`transition-transform duration-200 ${
                          expandedItem === item.id ? "rotate-90" : "rotate-0"
                        }`}
                      >
                        <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-gray-800 font-semibold">
                        {item.quantity} ×
                      </span>
                      <span className="text-gray-800 font-medium">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-900 font-semibold">
                        $
                        {(
                          item.price *
                          item.quantity *
                          (1 - (item.discount || 0) / 100)
                        ).toFixed(2)}
                      </span>
                      <button onClick={() => removeFromCart(item.id)}>
                        <XCircleIcon className="h-5 w-5 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* ✅ Expandable Item Details */}
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      expandedItem === item.id
                        ? "max-h-40 opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="p-4 bg-gray-200 space-y-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col">
                          <label className="text-gray-700 font-medium">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="border p-2 w-20 text-center rounded-lg"
                            value={item.quantity}
                            onChange={(e) =>
                              useCartStore.setState((state) => ({
                                cart: state.cart.map((cartItem) =>
                                  cartItem.id === item.id
                                    ? {
                                        ...cartItem,
                                        quantity:
                                          parseInt(e.target.value, 10) || 1,
                                      }
                                    : cartItem
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-gray-700 font-medium">
                            Discount (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="border p-2 w-20 text-center rounded-lg"
                            placeholder="0"
                            value={item.discount || ""}
                            onChange={(e) =>
                              useCartStore.setState((state) => ({
                                cart: state.cart.map((cartItem) =>
                                  cartItem.id === item.id
                                    ? {
                                        ...cartItem,
                                        discount:
                                          parseInt(e.target.value, 10) || 0,
                                      }
                                    : cartItem
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ✅ Pricing Details & Buttons */}
          <div className="absolute bottom-0 left-0 w-full bg-white border-t shadow-md p-4">
            <div className="mb-4 text-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-800 font-semibold">
                  ${totalAmount.toFixed(2)}
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
                <span className="text-gray-900">
                  ${payableAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* ✅ Buttons */}
            <div className="flex space-x-2">
              <button
                className={`flex-1 px-4 py-2 rounded-lg ${
                  cart.length === 0
                    ? "bg-orange-300 cursor-not-allowed"
                    : "bg-orange-400 text-white hover:bg-orange-500"
                }`}
                onClick={saveOrder}
                disabled={cart.length === 0}
              >
                Hold Order
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-lg ${
                  cart.length === 0
                    ? "bg-green-300 cursor-not-allowed"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
                onClick={() => cart.length > 0 && setIsPaymentFlow(true)}
                disabled={cart.length === 0}
              >
                Proceed
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ✅ Payment Flow View */
        <div className="absolute inset-0 flex flex-col bg-white p-6 rounded-lg shadow-lg transition-opacity duration-500">
          <PaymentFlow
            totalAmount={payableAmount}
            onBack={() => setIsPaymentFlow(false)}
            onComplete={() => {
              clearCart();
              setIsPaymentFlow(false);
              alert("Payment Successful!");
              navigate("/orders");
            }}
          />
        </div>
      )}
    </div>
  );
}
