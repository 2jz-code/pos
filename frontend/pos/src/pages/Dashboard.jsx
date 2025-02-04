import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";

export default function Dashboard() {
	return (
		<div className="w-screen h-screen flex flex-col justify-center items-center bg-gray-800">
			<h1 className="text-4xl font-bold mb-4 text-white">Dashboard</h1>
			<p className="text-lg text-white mb-6">Welcome to Ajeen Bakery POS!</p>

			{/* Navigation Buttons */}
			<div className="flex space-x-4">
				<Link
					to="/pos"
					className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700"
				>
					POS
				</Link>
				<Link
					to="/products"
					className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700"
				>
					Products
				</Link>
				<Link
					to="/orders"
					className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-700"
				>
					Orders
				</Link>
				<LogoutButton />
			</div>
		</div>
	);
}
