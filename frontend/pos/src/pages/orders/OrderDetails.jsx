import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/api";
import { checkAuthStatus } from "../../api/auth";
import { resumeOrder, voidOrder } from "../../utils/orderActions";

export default function OrderDetails() {
  const { orderId } = useParams(); // ✅ Get Order ID from URL
  const [order, setOrder] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const [orderResponse, authResponse] = await Promise.all([
          axiosInstance.get(`orders/${orderId}/`), // Fetch order details
          checkAuthStatus(), // Check if user is admin
        ]);

        setOrder(orderResponse.data);
        setIsAdmin(authResponse.is_admin); // ✅ Set admin status
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // ✅ Format Date Helper
  const formatDate = (timestamp) => new Date(timestamp).toLocaleString();

  if (!order)
    return (
      <p className="text-white text-center mt-6">Loading order details...</p>
    );

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-800 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Order #{order.id} Details</h1>

      {/* ✅ Back Button */}
      <button
        className="px-4 py-2 bg-gray-600 text-black rounded-lg hover:bg-gray-700 mb-4"
        onClick={() => navigate("/orders")}
      >
        ← Back to Orders
      </button>

      {/* ✅ Order Details */}
      <div className="bg-gray-700 p-4 rounded-lg shadow-md">
        <p className="text-lg font-bold">Status: {order.status}</p>
        <p className="text-sm">Total: ${order.total_price}</p>
        <p className="text-xs text-gray-400">
          Created: {formatDate(order.created_at)}
        </p>
        <p className="text-xs text-gray-400">
          Last Updated: {formatDate(order.updated_at)}
        </p>
      </div>

      {/* ✅ Order Items */}
      <h2 className="text-xl font-bold mt-4 mb-2">Items</h2>
      <div className="bg-gray-700 p-4 rounded-lg shadow-md">
        {order.items.length > 0 ? (
          order.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center bg-gray-600 p-3 rounded-lg mb-2"
            >
              <p>
                {item.product.name} - ${item.product.price} x {item.quantity}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No items in this order.</p>
        )}
      </div>

      {/* ✅ Action Buttons */}
      <div className="flex space-x-4 mt-6">
        {/* Resume Button (Only for Saved Orders) */}
        {order.status === "saved" && (
          <button
            className="px-4 py-2 bg-blue-500 rounded-lg"
            onClick={() => resumeOrder(order.id, navigate)}
          >
            Resume Order
          </button>
        )}

        {/* Void Button (Only for Admins) */}
        {isAdmin && order.status !== "voided" && (
          <button
            className="px-4 py-2 bg-red-500 rounded-lg"
            onClick={() => voidOrder(order.id, navigate)}
          >
            Void Order
          </button>
        )}
      </div>
    </div>
  );
}
