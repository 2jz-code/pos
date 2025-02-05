import { useState, useEffect } from "react";
import axiosInstance from "../../api/api";
import { useNavigate } from "react-router-dom";
import { checkAuthStatus } from "../../api/auth";
import { resumeOrder, voidOrder } from "../../utils/orderActions";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("saved"); // Default tab
  const [isAdmin, setIsAdmin] = useState(false); // Check admin status
  const navigate = useNavigate();

  // ✅ Fetch orders from backend
  useEffect(() => {
    const fetchOrdersAndUser = async () => {
      try {
        const [ordersResponse, authResponse] = await Promise.all([
          axiosInstance.get("orders/"), // Fetch orders
          checkAuthStatus(), // Fetch user authentication details
        ]);

        setOrders(ordersResponse.data);
        setIsAdmin(authResponse.is_admin); // ✅ Correctly set admin status
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchOrdersAndUser();
  }, []); // ✅ Ensures this runs only once on mount

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString(); // Converts to human-readable format
  };

  // ✅ Categorize Orders
  const filteredOrders = orders.filter((order) => order.status === activeTab);

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-800 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Orders</h1>

      {/* Back Button */}
      <div className="pb-4">
        <button
          className="px-4 py-2 bg-gray-600 text-black rounded-lg hover:bg-gray-700"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* ✅ Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        {["saved", "completed", "voided"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-lg ${
              activeTab === tab ? "bg-yellow-500" : "bg-gray-600"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Orders
          </button>
        ))}
      </div>

      {/* ✅ Orders List */}
      <div className="bg-gray-700 p-4 rounded-lg shadow-md">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="flex justify-between items-center bg-gray-600 p-3 rounded-lg mb-3 shadow cursor-pointer hover:bg-gray-800"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <div>
                <p className="text-lg font-bold">Order #{order.id}</p>
                <p className="text-sm">Total: ${order.total_price}</p>
                <p className="text-xs text-gray-400">
                  Created: {formatDate(order.created_at)}
                </p>
                <p className="text-xs text-gray-400">
                  Last Updated: {formatDate(order.updated_at)}
                </p>
              </div>

              <div className="flex space-x-2">
                {/* ✅ Resume Button (Only for Saved Orders) */}
                {order.status === "saved" && (
                  <button
                    className="px-4 py-2 bg-blue-500 rounded-lg"
                    onClick={() => resumeOrder(order.id, navigate)}
                  >
                    Resume
                  </button>
                )}

                {/* ✅ Void Button (Only for Admins) */}
                {isAdmin && order.status !== "voided" && (
                  <button
                    className="px-4 py-2 bg-red-500 rounded-lg"
                    onClick={() => voidOrder(order.id, navigate)}
                  >
                    Void
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400">No orders available.</p>
        )}
      </div>
    </div>
  );
}
