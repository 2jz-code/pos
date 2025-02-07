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
      <p className="text-gray-700 text-center mt-6">Loading order details...</p>
    );

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 text-black p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">
        Order #{order.id} Details
      </h1>

      {/* ✅ Back Button */}
      <button
        className="px-5 py-3 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 transition-all mb-4 max-w-[200px]"
        onClick={() => navigate("/orders")}
      >
        ← Back to Orders
      </button>

      {/* ✅ Order Details */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
        <p className="text-lg font-bold text-gray-900">
          Status: {order.status}
        </p>
        <p className="text-md text-gray-700">Total: ${order.total_price}</p>
        <p className="text-sm text-gray-600">
          Created: {formatDate(order.created_at)}
        </p>
        <p className="text-sm text-gray-600">
          Last Updated: {formatDate(order.updated_at)}
        </p>
      </div>

      {/* ✅ Order Items */}
      <h2 className="text-2xl font-bold mt-6 mb-2 text-gray-800">Items</h2>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
        {order.items.length > 0 ? (
          order.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center bg-gray-200 p-3 rounded-lg mb-2 shadow-sm"
            >
              <p className="text-gray-900">
                {item.product.name} - ${item.product.price} x {item.quantity}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No items in this order.</p>
        )}
      </div>

      {/* ✅ Action Buttons */}
      <div className="flex space-x-4 mt-6">
        {/* Resume Button (Only for Saved Orders) */}
        {order.status === "saved" && (
          <button
            className="px-5 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-all"
            onClick={() => resumeOrder(order.id, navigate)}
          >
            Resume Order
          </button>
        )}

        {/* Void Button (Only for Admins) */}
        {isAdmin && order.status !== "voided" && (
          <button
            className="px-5 py-3 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-all"
            onClick={() => voidOrder(order.id, navigate)}
          >
            Void Order
          </button>
        )}
      </div>
    </div>
  );
}
