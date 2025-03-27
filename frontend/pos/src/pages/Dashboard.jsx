// Updated Dashboard.jsx with User Management button for admins
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import LogoutButton from "../components/LogoutButton";
import { authService } from "../api/services/authService";
import {
	CurrencyDollarIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	ChartBarIcon,
	CreditCardIcon,
	UserGroupIcon, // Add this import
} from "@heroicons/react/24/outline";
import { HardwareStatus } from "../components/HardwareStatus";

export default function Dashboard() {
	const [userStatus, setUserStatus] = useState({
		authenticated: false,
		username: "",
		is_admin: false,
	});

	useEffect(() => {
		const fetchUserStatus = async () => {
			const status = await authService.checkStatus();
			setUserStatus(status);
		};
		fetchUserStatus();
	}, []);

	const getUserRole = (isAdmin) => {
		return isAdmin ? "Admin" : "Staff";
	};

	// Updated Dashboard with more modern UI
	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			<HardwareStatus />
			{/* Header Section - Updated with cleaner design */}
			<header className="bg-white shadow-sm rounded-xl p-5 flex justify-between items-center mb-8">
				<div className="flex items-center space-x-4">
					<h1 className="text-xl font-bold text-slate-800">Ajeen Bakery POS</h1>
					<span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium flex items-center">
						<span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5"></span>
						Online
					</span>
				</div>
				<div className="flex items-center space-x-4">
					<LogoutButton />
				</div>
			</header>

			{/* Main Content - Enhanced card design */}
			<div className="flex-1 flex items-center justify-center">
				<div className="w-full max-w-4xl">
					<h2 className="text-2xl font-semibold text-slate-800 mb-8 text-center">
						Quick Access
					</h2>

					{/* Navigation Grid - Updated with more modern cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<Link
							to="/pos"
							className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center group"
						>
							<div className="mb-4 p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
								<CurrencyDollarIcon className="w-10 h-10 text-blue-600" />
							</div>
							<h3 className="text-lg font-medium text-slate-800 mb-2">
								Point of Sale
							</h3>
							<p className="text-sm text-slate-500 text-center">
								Access the POS interface for daily transactions
							</p>
						</Link>

						<Link
							to="/products"
							className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center group"
						>
							<div className="mb-4 p-3 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors">
								<ClipboardDocumentListIcon className="w-10 h-10 text-indigo-600" />
							</div>
							<h3 className="text-lg font-medium text-slate-800 mb-2">
								Product Management
							</h3>
							<p className="text-sm text-slate-500 text-center">
								Manage products, categories, and inventory
							</p>
						</Link>

						<Link
							to="/orders"
							className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center group"
						>
							<div className="mb-4 p-3 bg-amber-50 rounded-full group-hover:bg-amber-100 transition-colors">
								<ClockIcon className="w-10 h-10 text-amber-600" />
							</div>
							<h3 className="text-lg font-medium text-slate-800 mb-2">
								Order History
							</h3>
							<p className="text-sm text-slate-500 text-center">
								View and manage order history and receipts
							</p>
						</Link>

						{/* Payment Management Card */}
						<Link
							to="/payments"
							className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center group"
						>
							<div className="mb-4 p-3 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
								<CreditCardIcon className="w-10 h-10 text-green-600" />
							</div>
							<h3 className="text-lg font-medium text-slate-800 mb-2">
								Payment Management
							</h3>
							<p className="text-sm text-slate-500 text-center">
								Track payments and process refunds
							</p>
						</Link>
						{userStatus.is_admin && (
							<Link
								to="/reports"
								className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center group"
							>
								<div className="mb-4 p-3 bg-emerald-50 rounded-full group-hover:bg-emerald-100 transition-colors">
									<ChartBarIcon className="w-10 h-10 text-emerald-600" />
								</div>
								<h3 className="text-lg font-medium text-slate-800 mb-2">
									Reports
								</h3>
								<p className="text-sm text-slate-500 text-center">
									Generate sales reports and analytics
								</p>
							</Link>
						)}

						{/* User Management Card - Only visible to admins */}
						{userStatus.is_admin && (
							<Link
								to="/users"
								className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center group"
							>
								<div className="mb-4 p-3 bg-purple-50 rounded-full group-hover:bg-purple-100 transition-colors">
									<UserGroupIcon className="w-10 h-10 text-purple-600" />
								</div>
								<h3 className="text-lg font-medium text-slate-800 mb-2">
									User Management
								</h3>
								<p className="text-sm text-slate-500 text-center">
									Manage system users and permissions
								</p>
							</Link>
						)}
					</div>
				</div>
			</div>

			{/* Status Bar - Updated with more subtle design */}
			<div className="bg-slate-800 text-white px-5 py-3 rounded-xl flex justify-between text-xs mt-8">
				<span className="flex items-center">
					<span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
					System Status: Operational
				</span>
				<span>Version: 1.0.0</span>
				<span>
					User: {userStatus.username} ({getUserRole(userStatus.is_admin)})
				</span>
			</div>
		</div>
	);
}
