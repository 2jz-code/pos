import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import Cart from "../components/Cart";
import axiosInstance from "../api/api";
import PaymentFlow from "../components/PaymentFlow";

export default function POS() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showPayment, setShowPayment] = useState(false); // ✅ Control overlay
  const { cart, addToCart, clearCart } = useCartStore(); // ✅ Fix: Use cart instead of cartItems
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Cart State:", cart); // ✅ Debugging Zustand state
  }, [cart]);

  const totalAmount = cart.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );
  // Handle payment completion
  const handlePaymentComplete = async (paymentMethod, amountPaid) => {
    try {
      const orderData = {
        status: "completed",
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        amount_paid: amountPaid,
      };

      await axiosInstance.post("orders/", orderData);
      alert("Order completed successfully!");
      clearCart();
      setShowPayment(false);
      navigate("/orders");
    } catch (error) {
      console.error("Failed to complete order:", error);
      alert("Error processing payment.");
    }
  };
  // ✅ Fetch categories and products
  useEffect(() => {
    axiosInstance.get("products/categories/").then((response) => {
      setCategories(response.data);
      if (response.data.length > 0) setSelectedCategory(response.data[0].name);
    });

    axiosInstance.get("products/").then((response) => {
      const groupedProducts = response.data.reduce((acc, product) => {
        const categoryName = product.category_name;
        if (!acc[categoryName]) acc[categoryName] = [];
        acc[categoryName].push(product);
        return acc;
      }, {});
      setProducts(groupedProducts);
    });
  }, []);

  // ✅ Save Order to Backend
  const saveOrder = async () => {
    try {
      const { cart, orderId } = useCartStore.getState(); // ✅ Get stored orderId

      if (!cart || cart.length === 0) {
        alert("Cart is empty. Add items before saving.");
        return;
      }

      const orderData = {
        status: "saved",
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      };

      console.log("Saving Order Data:", orderData); // Debugging

      if (orderId) {
        // ✅ If orderId exists, update the existing order
        await axiosInstance.patch(`orders/${orderId}/`, orderData);
        alert("Order updated successfully!");
      } else {
        // ✅ Otherwise, create a new order
        const response = await axiosInstance.post("orders/", orderData);
        useCartStore.setState({ orderId: response.data.id }); // ✅ Store new order ID
        alert("New order saved successfully!");
      }

      clearCart();
      navigate("/orders"); // Redirect to orders page
    } catch (error) {
      console.error("Failed to save order:", error);
      alert("Error saving order.");
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-800 text-white">
      {/* Back Button */}
      <div className="p-4">
        <button
          className="px-4 py-2 bg-gray-600 text-black rounded-lg hover:bg-gray-700"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="flex flex-grow">
        {/* Left: Cart Component */}
        <Cart />

        {/* Right: Product Categories & Items */}
        <div className="w-2/3 p-4 flex flex-col">
          {/* Category Tabs */}
          <div className="flex space-x-2">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`px-4 py-2 border text-black bg-white rounded-lg ${
                  selectedCategory === category.name
                    ? "font-bold"
                    : "opacity-70"
                }`}
                onClick={() => setSelectedCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {products[selectedCategory]?.map((product) => (
              <button
                key={product.id}
                className="p-3 bg-gray-300 text-black font-bold rounded-lg shadow-md hover:brightness-90"
                onClick={() => addToCart(product)}
              >
                {product.name} - ${product.price}
              </button>
            )) || <p className="text-center mt-4">No products available</p>}
          </div>

          {/* ✅ Save Order Button */}
          <button
            className="mt-6 px-4 py-2 bg-yellow-500 text-black rounded-lg"
            onClick={saveOrder}
          >
            Save Order
          </button>
          {/* Open Payment Overlay */}
          <button
            className="mt-6 px-4 py-2 bg-yellow-500 text-black rounded-lg"
            onClick={() => setShowPayment(true)}
          >
            Complete Order
          </button>
        </div>
      </div>
      {/* Payment Overlay */}
      {showPayment && (
        <PaymentFlow
          totalAmount={totalAmount}
          onClose={() => setShowPayment(false)}
          onComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
