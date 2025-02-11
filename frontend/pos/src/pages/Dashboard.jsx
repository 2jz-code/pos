import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";

export default function Dashboard() {
	return (
		<div className="w-screen h-screen flex flex-col bg-gray-100 text-black p-6">
			{/* Header Section */}
			<header className="bg-white shadow-sm p-4 flex justify-between items-center mb-8 rounded-lg">
				<div className="flex items-center space-x-4">
					<h1 className="text-xl font-bold">Ajeen Bakery POS</h1>
					<span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
						● Online
					</span>
				</div>
				<div className="flex items-center space-x-4">
					<LogoutButton />
				</div>
			</header>

			{/* Main Content */}
			<div className="flex-1 flex items-center justify-center">
				<div className="w-full max-w-4xl">
					<h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
						Quick Access
					</h2>

					{/* Navigation Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Link
							to="/pos"
							className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col items-center"
						>
							<div className="text-4xl mb-3">💸</div>
							<h3 className="text-lg font-medium text-gray-800">
								Point of Sale
							</h3>
							<p className="text-sm text-gray-600 text-center mt-2">
								Access the POS interface for daily transactions
							</p>
						</Link>

						<Link
							to="/products"
							className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col items-center"
						>
							<div className="text-4xl mb-3">🍞</div>
							<h3 className="text-lg font-medium text-gray-800">
								Product Management
							</h3>
							<p className="text-sm text-gray-600 text-center mt-2">
								Manage products, categories, and inventory
							</p>
						</Link>

						<Link
							to="/orders"
							className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col items-center"
						>
							<div className="text-4xl mb-3">📦</div>
							<h3 className="text-lg font-medium text-gray-800">
								Order History
							</h3>
							<p className="text-sm text-gray-600 text-center mt-2">
								View and manage order history and receipts
							</p>
						</Link>

						<Link
							to="/reports"
							className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col items-center"
						>
							<div className="text-4xl mb-3">📊</div>
							<h3 className="text-lg font-medium text-gray-800">Reports</h3>
							<p className="text-sm text-gray-600 text-center mt-2">
								Generate sales reports and analytics
							</p>
						</Link>
					</div>
				</div>
			</div>

			{/* Status Bar */}
			<div className="bg-gray-800 text-white px-4 py-2 rounded-lg flex justify-between text-sm">
				<span>System Status: Operational</span>
				<span>Version: 1.0.0</span>
				<span>User: Admin</span>
			</div>
		</div>
	);
}
