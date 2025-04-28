import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types"; // Import PropTypes
import LogoutButton from "../components/LogoutButton"; // Assuming this is correctly styled
import { authService } from "../api/services/authService";
import {
	BuildingStorefrontIcon, // For POS Title
	CurrencyDollarIcon, // POS Link
	SquaresPlusIcon, // Products Link (Updated from Clipboard)
	ClockIcon, // Orders Link
	ChartBarIcon, // Reports Link
	CreditCardIcon, // Payments Link
	UserGroupIcon, // Users Link
	Cog6ToothIcon, // Settings Link (Updated from CogIcon)
	GiftIcon, // Rewards Link
	TagIcon, // Discounts Link
	SignalIcon, // Online Status
	ChevronRightIcon, // Card link indicator
} from "@heroicons/react/24/outline"; // Using outline icons

// Helper component for Navigation Cards
const NavCard = ({
	to,
	title,
	description,
	icon: Icon,
	iconBgClass,
	iconTextClass,
	isAdminOnly = false,
	currentUserIsAdmin = false,
}) => {
	// Hide admin-only cards if the current user is not an admin
	if (isAdminOnly && !currentUserIsAdmin) {
		return null;
	}

	return (
		<Link
			to={to}
			className="group relative block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
		>
			<div className="flex items-center gap-4">
				{/* Icon */}
				<div
					className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${iconBgClass} ${iconTextClass}`}
				>
					<Icon className="h-6 w-6" />
				</div>
				{/* Text Content */}
				<div>
					<h3 className="text-base font-semibold text-slate-800">{title}</h3>
					<p className="mt-1 text-sm text-slate-600">{description}</p>
				</div>
			</div>
			{/* Optional: Add an arrow or indicator for clickable cards */}
			<span className="absolute top-4 right-4 text-slate-300 transition-transform group-hover:translate-x-1 group-focus:translate-x-1 rtl:group-hover:-translate-x-1 rtl:group-focus:-translate-x-1">
				<ChevronRightIcon className="h-5 w-5" />
			</span>
		</Link>
	);
};

NavCard.propTypes = {
	to: PropTypes.string.isRequired,
	title: PropTypes.string.isRequired,
	description: PropTypes.string.isRequired,
	icon: PropTypes.elementType.isRequired,
	iconBgClass: PropTypes.string.isRequired, // Tailwind background class for icon circle
	iconTextClass: PropTypes.string.isRequired, // Tailwind text color class for icon
	isAdminOnly: PropTypes.bool, // Flag for admin-only links
	currentUserIsAdmin: PropTypes.bool, // Current user's admin status
};

export default function Dashboard() {
	const [userStatus, setUserStatus] = useState({
		authenticated: false,
		username: "User", // Default username
		is_admin: false,
	});
	const [isLoading, setIsLoading] = useState(true); // Add loading state

	// Fetch user status on mount
	useEffect(() => {
		let isMounted = true; // Track mount status
		const fetchUserStatus = async () => {
			setIsLoading(true);
			try {
				const status = await authService.checkStatus();
				if (isMounted) {
					setUserStatus(status);
				}
			} catch (error) {
				console.error("Failed to fetch user status:", error);
				if (isMounted) {
					// Handle error state if needed, maybe redirect to login
					setUserStatus({
						authenticated: false,
						username: "Error",
						is_admin: false,
					});
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};
		fetchUserStatus();
		return () => {
			isMounted = false;
		}; // Cleanup function
	}, []);

	// Define navigation items
	const navItems = [
		{
			to: "/pos",
			title: "Point of Sale",
			description: "Process sales and manage transactions.",
			icon: CurrencyDollarIcon,
			bg: "bg-blue-50",
			text: "text-blue-600",
		},
		{
			to: "/products",
			title: "Product Management",
			description: "Manage products, categories, and stock.",
			icon: SquaresPlusIcon,
			bg: "bg-indigo-50",
			text: "text-indigo-600",
		},
		{
			to: "/orders",
			title: "Order History",
			description: "View past orders and details.",
			icon: ClockIcon,
			bg: "bg-amber-50",
			text: "text-amber-600",
		},
		{
			to: "/payments",
			title: "Payment Management",
			description: "Track payments and process refunds.",
			icon: CreditCardIcon,
			bg: "bg-green-50",
			text: "text-green-600",
		},
		{
			to: "/reports",
			title: "Reports",
			description: "Generate sales and performance reports.",
			icon: ChartBarIcon,
			bg: "bg-emerald-50",
			text: "text-emerald-600",
			adminOnly: true,
		},
		{
			to: "/users",
			title: "User Management",
			description: "Manage staff accounts and permissions.",
			icon: UserGroupIcon,
			bg: "bg-purple-50",
			text: "text-purple-600",
			adminOnly: true,
		},
		{
			to: "/rewards",
			title: "Rewards Program",
			description: "Configure and manage customer rewards.",
			icon: GiftIcon,
			bg: "bg-pink-50",
			text: "text-pink-600",
			adminOnly: true,
		},
		{
			to: "/discounts",
			title: "Discounts",
			description: "Create and manage discounts.",
			icon: TagIcon,
			bg: "bg-orange-50",
			text: "text-orange-600",
			adminOnly: true,
		},
		{
			to: "/settings",
			title: "Settings",
			description: "Configure system and admin settings.",
			icon: Cog6ToothIcon,
			bg: "bg-slate-100",
			text: "text-slate-600",
			adminOnly: true,
		},
	];

	const getUserRole = (isAdmin) => (isAdmin ? "Admin" : "Staff");

	return (
		<div className="flex h-screen w-screen flex-col bg-slate-100">
			{/* Header */}
			<header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-3">
					<BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
					<h1 className="text-lg font-semibold text-slate-800">
						Ajeen POS Dashboard
					</h1>
				</div>
				<div className="flex items-center gap-3">
					<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
						<SignalIcon className="h-3 w-3" /> Online
					</span>
					<LogoutButton /> {/* Assuming LogoutButton is styled */}
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
				<div className="mx-auto max-w-5xl">
					{" "}
					{/* Constrain width */}
					<h2 className="mb-6 text-xl font-semibold text-slate-800 sm:text-2xl">
						Quick Access
					</h2>
					{isLoading ? (
						<div className="flex justify-center pt-10">
							{/* Optional: Add a simple loading indicator */}
							<p className="text-slate-500">Loading dashboard...</p>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 lg:gap-6">
							{navItems.map((item) => (
								<NavCard
									key={item.to}
									to={item.to}
									title={item.title}
									description={item.description}
									icon={item.icon}
									iconBgClass={item.bg}
									iconTextClass={item.text}
									isAdminOnly={item.adminOnly}
									currentUserIsAdmin={userStatus.is_admin}
								/>
							))}
						</div>
					)}
				</div>
			</main>

			{/* Footer Status Bar */}
			<footer className="flex h-10 flex-shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 text-xs text-slate-600 sm:px-6 lg:px-8">
				<span>Version: 1.0.1</span> {/* Example version */}
				<span>
					User:{" "}
					{isLoading
						? "..."
						: `${userStatus.username} (${getUserRole(userStatus.is_admin)})`}
				</span>
			</footer>
		</div>
	);
}
