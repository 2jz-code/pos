import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";

export default function Dashboard() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-100 text-black p-6">
      {/* ✅ Dashboard Header */}
      <div className="bg-white shadow-lg rounded-lg p-8 w-2/3 max-w-3xl text-center">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-lg text-gray-600 mb-6">
          Welcome to Ajeen Bakery POS!
        </p>

        {/* ✅ Navigation Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/pos"
            className="px-6 py-3 text-lg font-medium bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600"
          >
            POS
          </Link>
          <Link
            to="/products"
            className="px-6 py-3 text-lg font-medium bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600"
          >
            Products
          </Link>
          <Link
            to="/orders"
            className="px-6 py-3 text-lg font-medium bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600"
          >
            Orders
          </Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
