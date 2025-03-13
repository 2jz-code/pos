// pages/settings/Settings.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../api/services/authService";
import LocationManagement from "./LocationManagement";
import {
	MapPinIcon,
	CreditCardIcon,
	UserGroupIcon,
	ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export default function Settings() {
	const [isAdmin, setIsAdmin] = useState(false);
	const [userName, setUserName] = useState("");
	const [activeTab, setActiveTab] = useState("locations");
	const navigate = useNavigate();

	useEffect(() => {
		const checkAdminStatus = async () => {
			try {
				const authResponse = await authService.checkStatus();
				setIsAdmin(authResponse.is_admin);
				setUserName(authResponse.username);

				// Redirect non-admin users
				if (!authResponse.is_admin) {
					navigate("/dashboard");
				}
			} catch (error) {
				console.error("Error checking admin status:", error);
				navigate("/dashboard");
			}
		};

		checkAdminStatus();
	}, [navigate]);

	// Tab content mapping
	const tabContent = {
		locations: <LocationManagement />,
		payment: (
			<div className="p-6 text-center text-slate-500">
				Payment settings coming soon
			</div>
		),
		users: (
			<div className="p-6 text-center text-slate-500">
				User management coming soon
			</div>
		),
		security: (
			<div className="p-6 text-center text-slate-500">
				Security settings coming soon
			</div>
		),
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center space-x-4">
					<h1 className="text-2xl font-bold text-slate-800">Settings</h1>
					<span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium flex items-center">
						<span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5"></span>
						Online
					</span>
				</div>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
					onClick={() => navigate("/dashboard")}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back to Dashboard
				</button>
			</div>

			{/* Settings Layout */}
			<div className="flex flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
				{/* Sidebar */}
				<div className="w-64 bg-slate-800 text-white p-4">
					<h2 className="text-lg font-medium mb-6 px-2 text-slate-300">
						Settings Menu
					</h2>
					<nav className="space-y-1">
						<button
							className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
								activeTab === "locations"
									? "bg-blue-600 text-white"
									: "text-slate-300 hover:bg-slate-700"
							}`}
							onClick={() => setActiveTab("locations")}
						>
							<MapPinIcon className="h-5 w-5" />
							<span>Locations</span>
						</button>

						<button
							className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
								activeTab === "payment"
									? "bg-blue-600 text-white"
									: "text-slate-300 hover:bg-slate-700"
							}`}
							onClick={() => setActiveTab("payment")}
						>
							<CreditCardIcon className="h-5 w-5" />
							<span>Payment Terminal</span>
						</button>

						<button
							className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
								activeTab === "users"
									? "bg-blue-600 text-white"
									: "text-slate-300 hover:bg-slate-700"
							}`}
							onClick={() => setActiveTab("users")}
						>
							<UserGroupIcon className="h-5 w-5" />
							<span>User Management</span>
						</button>

						<button
							className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
								activeTab === "security"
									? "bg-blue-600 text-white"
									: "text-slate-300 hover:bg-slate-700"
							}`}
							onClick={() => setActiveTab("security")}
						>
							<ShieldCheckIcon className="h-5 w-5" />
							<span>Security</span>
						</button>
					</nav>

					<div className="pt-6 border-t border-slate-700 mt-6">
						<div className="text-xs text-slate-400 px-3">
							<p>Logged in as:</p>
							<p className="font-medium text-slate-300">{userName} (Admin)</p>
						</div>
					</div>
				</div>

				{/* Content Area */}
				<div className="flex-1 overflow-auto">{tabContent[activeTab]}</div>
			</div>

			{/* Status Bar */}
			<div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl flex justify-between text-xs mt-4">
				<span className="flex items-center">
					<span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
					System Operational
				</span>
				<span>Settings Version: 1.0.0</span>
				<span>
					User: {userName} ({isAdmin ? "admin" : "staff"})
				</span>
			</div>
		</div>
	);
}
