import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types"; // Import PropTypes
import { authService } from "../../api/services/authService";
import LocationManagement from "./LocationManagement";
import PaymentTerminalSettings from "./PaymentTerminalSettings";
import SecuritySettings from "./SecuritySettings";
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Assuming LoadingSpinner exists
import {
	MapPinIcon,
	CreditCardIcon,
	ShieldCheckIcon,
	Cog6ToothIcon, // For main settings title
	ArrowLeftStartOnRectangleIcon, // For dashboard button
	UserCircleIcon, // For user info
	SignalIcon, // For online status
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";

// Helper component for sidebar navigation items
const NavItem = ({ icon: Icon, label, isActive, onClick }) => (
	<button
		className={`group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
			isActive
				? "bg-blue-50 text-blue-700" // Active state
				: "text-slate-700 hover:bg-slate-100 hover:text-slate-900" // Inactive state
		}`}
		onClick={onClick}
		aria-current={isActive ? "page" : undefined}
	>
		<Icon
			className={`h-5 w-5 flex-shrink-0 ${
				isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500"
			}`}
		/>
		<span>{label}</span>
	</button>
);

NavItem.propTypes = {
	icon: PropTypes.elementType.isRequired,
	label: PropTypes.string.isRequired,
	isActive: PropTypes.bool.isRequired,
	onClick: PropTypes.func.isRequired,
};

export default function Settings() {
	const [isAdmin, setIsAdmin] = useState(false);
	const [userName, setUserName] = useState("");
	const [activeTab, setActiveTab] = useState("locations"); // Default tab
	const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Loading state for auth check
	const navigate = useNavigate();

	// Check admin status on mount
	useEffect(() => {
		const checkAdminStatus = async () => {
			setIsLoadingAuth(true);
			try {
				const authResponse = await authService.checkStatus();
				if (!authResponse.is_admin) {
					console.warn("Non-admin user redirected from settings.");
					navigate("/dashboard"); // Redirect if not admin
				} else {
					setIsAdmin(true);
					setUserName(authResponse.username || "Admin User");
				}
			} catch (error) {
				console.error("Error checking admin status:", error);
				toast.error("Authentication error. Redirecting..."); // Use toast if available
				navigate("/dashboard"); // Redirect on error
			} finally {
				setIsLoadingAuth(false);
			}
		};
		checkAdminStatus();
	}, [navigate]);

	// Mapping of tab keys to components
	const tabContent = {
		locations: <LocationManagement />,
		payment: <PaymentTerminalSettings />,
		// Add other settings components here if needed
		// users: <UserManagement />,
		security: <SecuritySettings />,
	};

	// Define navigation items
	const navItems = [
		{ key: "locations", label: "Locations", icon: MapPinIcon },
		{ key: "payment", label: "Payment Terminals", icon: CreditCardIcon },
		{ key: "security", label: "Security", icon: ShieldCheckIcon },
		// Add more items as needed
		// { key: "users", label: "User Management", icon: UsersIcon },
	];

	// Show loading spinner while checking auth
	if (isLoadingAuth) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-slate-100">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	// If somehow a non-admin reaches this point (though redirect should happen)
	if (!isAdmin) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-slate-100 p-6 text-center">
				<p className="text-red-600">
					Access Denied. You must be an administrator to view settings.
				</p>
				{/* Optional: Add a button to go back */}
			</div>
		);
	}

	return (
		<div className="flex h-screen w-screen flex-col bg-slate-100">
			{/* Top Header Bar */}
			<header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-3">
					<Cog6ToothIcon className="h-6 w-6 text-slate-600" />
					<h1 className="text-lg font-semibold text-slate-800">Settings</h1>
				</div>
				<div className="flex items-center gap-3">
					<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
						<SignalIcon className="h-3 w-3" /> Online
					</span>
					<button
						className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
						onClick={() => navigate("/dashboard")}
						title="Back to Dashboard"
					>
						<ArrowLeftStartOnRectangleIcon className="h-4 w-4" />
						<span className="hidden sm:inline">Dashboard</span>
					</button>
				</div>
			</header>

			{/* Main Content Area with Sidebar */}
			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
					<nav className="flex-1 space-y-1">
						{navItems.map((item) => (
							<NavItem
								key={item.key}
								icon={item.icon}
								label={item.label}
								isActive={activeTab === item.key}
								onClick={() => setActiveTab(item.key)}
							/>
						))}
					</nav>
					{/* User Info Footer */}
					<div className="mt-auto flex-shrink-0 border-t border-slate-200 pt-4">
						<div className="flex items-center gap-2">
							<UserCircleIcon className="h-6 w-6 text-slate-400" />
							<div>
								<p className="text-xs font-medium text-slate-700">{userName}</p>
								<p className="text-xs text-slate-500">Administrator</p>
							</div>
						</div>
					</div>
				</aside>

				{/* Mobile Navigation (Dropdown or Tabs - Example using simple buttons for now) */}
				<div className="mb-4 border-b border-slate-200 bg-white p-2 md:hidden">
					<label
						htmlFor="settings-tab-mobile"
						className="sr-only"
					>
						Select a setting category
					</label>
					<select
						id="settings-tab-mobile"
						name="settings-tab-mobile"
						className="block w-full rounded-md border-slate-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
						value={activeTab}
						onChange={(e) => setActiveTab(e.target.value)}
					>
						{navItems.map((item) => (
							<option
								key={item.key}
								value={item.key}
							>
								{item.label}
							</option>
						))}
					</select>
				</div>

				{/* Main Content Pane */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
					{/* Render the active tab's content */}
					<div className="rounded-lg border border-slate-200 bg-white shadow-sm">
						{tabContent[activeTab]}
					</div>
				</main>
			</div>
		</div>
	);
}
