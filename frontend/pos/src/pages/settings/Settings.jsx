// pages/settings/Settings.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../api/services/authService";
import LocationManagement from "./LocationManagement";
import PaymentTerminalSettings from "./PaymentTerminalSettings";
import SecuritySettings from "./SecuritySettings";
import {
	MapPinIcon,
	CreditCardIcon,
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
		payment: <PaymentTerminalSettings />,
		users: (
			<div className="p-6 text-center text-slate-500">
				User management coming soon
			</div>
		),
		security: <SecuritySettings />,
	};

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Top Navigation Bar */}
			<div className="bg-white border-b border-slate-200">
				<div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
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
									d="M4 6h16M4 12h16M4 18h7"
								/>
							</svg>
							Dashboard
						</button>
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex space-x-6">
					{/* Sidebar */}
					<div className="w-64 shrink-0">
						<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
							<div className="bg-slate-800 text-white p-4">
								<h2 className="font-medium text-lg mb-1">Settings Menu</h2>
								<p className="text-xs text-slate-400">Manage system settings</p>
							</div>
							<nav className="p-2">
								<div className="space-y-1">
									<button
										className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
											activeTab === "locations"
												? "bg-blue-50 text-blue-700"
												: "text-slate-700 hover:bg-slate-100"
										}`}
										onClick={() => setActiveTab("locations")}
									>
										<MapPinIcon className="h-5 w-5" />
										<span>Locations</span>
									</button>

									<button
										className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
											activeTab === "payment"
												? "bg-blue-50 text-blue-700"
												: "text-slate-700 hover:bg-slate-100"
										}`}
										onClick={() => setActiveTab("payment")}
									>
										<CreditCardIcon className="h-5 w-5" />
										<span>Payment Terminal</span>
									</button>

									<button
										className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
											activeTab === "security"
												? "bg-blue-50 text-blue-700"
												: "text-slate-700 hover:bg-slate-100"
										}`}
										onClick={() => setActiveTab("security")}
									>
										<ShieldCheckIcon className="h-5 w-5" />
										<span>Security</span>
									</button>
								</div>
							</nav>
							<div className="px-4 py-3 border-t border-slate-200 mt-2">
								<div className="text-xs text-slate-500">
									<p>Logged in as:</p>
									<p className="font-medium text-slate-700">
										{userName} (Admin)
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Content Area */}
					<div className="flex-1">
						<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
							{tabContent[activeTab]}
						</div>
					</div>
				</div>
			</div>

			{/* Status Bar */}
			<div className="bg-slate-800 text-white py-2 fixed bottom-0 w-full">
				<div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-xs">
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
		</div>
	);
}
