import { useState, useEffect } from "react"; // Added React import
import { useNavigate, useParams } from "react-router-dom";
import { userService } from "../../api/services/userService"; // Original import
import { toast } from "react-toastify";
// Icons for UI
import {
	ArrowLeftIcon,
	PencilIcon,
	ExclamationTriangleIcon,
	InformationCircleIcon,
	CheckBadgeIcon,
	XCircleIcon,
	CalendarDaysIcon,
	ClockIcon,
	UserIcon,
	EnvelopeIcon,
	BuildingStorefrontIcon,
	GlobeAltIcon,
} from "@heroicons/react/24/outline"; // Use outline icons
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Original import

/**
 * UserDetail Component (Logic Preserved from User Provided Code)
 *
 * Displays details for a single user.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
export default function UserDetail() {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const navigate = useNavigate();
	const { userId } = useParams();
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let isMounted = true;
		const fetchUser = async () => {
			setIsLoading(true); // Set loading true at start
			setError(null);
			try {
				const userData = await userService.getUserById(userId);
				if (isMounted) setUser(userData);
			} catch (err) {
				console.error("Error fetching user:", err);
				if (isMounted)
					setError("Failed to load user details. Please try again.");
				if (isMounted) toast.error("Failed to load user details");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};

		fetchUser();
		return () => {
			isMounted = false;
		}; // Cleanup
	}, [userId]); // Dependency array includes userId

	// Helper to format date/time
	const formatDate = (timestamp) => {
		if (!timestamp) return "N/A";
		try {
			return new Date(timestamp).toLocaleString(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			});
			// eslint-disable-next-line no-unused-vars
		} catch (e) {
			return "Invalid Date";
		}
	};
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	// Loading State - Styled
	if (isLoading) {
		return (
			<div className="w-screen h-screen flex items-center justify-center bg-slate-100">
				<LoadingSpinner size="lg" />
				<p className="text-slate-500 ml-3">Loading user details...</p>
			</div>
		);
	}

	// Error State - Styled
	if (error || !user) {
		return (
			<div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-100 p-6">
				<div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
					<ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<p className="text-red-600 mb-4">{error || "User not found."}</p>
					<button
						className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
						onClick={() => navigate("/users")} // Original handler
					>
						Back to Users List
					</button>
				</div>
			</div>
		);
	}

	// Helper to get role badge color
	const getRoleBadgeClass = (role) => {
		switch (role) {
			case "owner":
				return "bg-amber-100 text-amber-800 border border-amber-200";
			case "admin":
				return "bg-purple-100 text-purple-800 border border-purple-200";
			case "manager":
				return "bg-blue-100 text-blue-800 border border-blue-200";
			case "cashier":
				return "bg-green-100 text-green-800 border border-green-200";
			default:
				return "bg-slate-100 text-slate-700 border border-slate-200"; // Customer or other
		}
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6 overflow-hidden">
			{/* Header Section - Styled */}
			<header className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-slate-200 gap-3 flex-shrink-0">
				<h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate pr-4">
					User Details: <span className="text-blue-600">{user.username}</span>
				</h1>
				{/* Action Buttons */}
				<div className="flex items-center gap-2 sm:gap-3">
					{/* Edit User Button - Styled */}
					<button
						className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center gap-1.5 shadow-sm"
						onClick={() => navigate(`/users/edit/${userId}`)} // Original handler
					>
						<PencilIcon className="h-4 w-4" />
						Edit User
					</button>
					{/* Back Button - Styled */}
					<button
						className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
						onClick={() => navigate("/users")} // Original handler
					>
						<ArrowLeftIcon className="h-4 w-4" />
						Back to Users
					</button>
				</div>
			</header>

			{/* User Details Card - Scrollable */}
			<div className="flex-1 bg-white rounded-lg shadow-sm p-6 overflow-y-auto custom-scrollbar border border-slate-200 min-h-0">
				<div className="max-w-3xl mx-auto">
					{/* Basic Information Section */}
					<div className="mb-6">
						<h2 className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
							<UserIcon className="h-5 w-5 text-slate-400" /> Basic Information
						</h2>
						<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
							<div className="sm:col-span-1">
								<dt className="font-medium text-slate-500">Username</dt>
								<dd className="mt-0.5 text-slate-800">{user.username}</dd>
							</div>
							<div className="sm:col-span-1">
								<dt className="font-medium text-slate-500">Email</dt>
								<dd className="mt-0.5 text-slate-800 flex items-center gap-1">
									<EnvelopeIcon className="h-3.5 w-3.5 text-slate-400" />
									{user.email || (
										<span className="italic text-slate-400">Not Provided</span>
									)}
								</dd>
							</div>
							<div className="sm:col-span-1">
								<dt className="font-medium text-slate-500">First Name</dt>
								<dd className="mt-0.5 text-slate-800">
									{user.first_name || (
										<span className="italic text-slate-400">N/A</span>
									)}
								</dd>
							</div>
							<div className="sm:col-span-1">
								<dt className="font-medium text-slate-500">Last Name</dt>
								<dd className="mt-0.5 text-slate-800">
									{user.last_name || (
										<span className="italic text-slate-400">N/A</span>
									)}
								</dd>
							</div>
						</dl>
					</div>

					{/* Role and System Section */}
					<div className="mb-6">
						<h2 className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
							<CheckBadgeIcon className="h-5 w-5 text-slate-400" /> Role &
							System Access
						</h2>
						<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
							<div className="sm:col-span-1">
								<dt className="font-medium text-slate-500">Role</dt>
								<dd className="mt-1">
									<span
										className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(
											user.role
										)}`}
									>
										{user.role.toUpperCase()}
									</span>
								</dd>
							</div>
							<div className="sm:col-span-1">
								<dt className="font-medium text-slate-500">System Access</dt>
								<dd className="mt-1 flex flex-wrap gap-1.5">
									{user.is_pos_user && (
										<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1">
											<BuildingStorefrontIcon className="h-3 w-3" /> POS
										</span>
									)}
									{user.is_website_user && (
										<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-lime-100 text-lime-800 border border-lime-200 flex items-center gap-1">
											<GlobeAltIcon className="h-3 w-3" /> Website
										</span>
									)}
									{!user.is_pos_user && !user.is_website_user && (
										<span className="italic text-slate-400 text-xs">None</span>
									)}
								</dd>
							</div>
						</dl>
					</div>

					{/* Account Details Section */}
					<div className="mb-6">
						<h2 className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
							<InformationCircleIcon className="h-5 w-5 text-slate-400" />{" "}
							Account Details
						</h2>
						<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
							<div className="sm:col-span-1">
								<dt className="font-medium text-slate-500">Last Login</dt>
								<dd className="mt-0.5 text-slate-800 flex items-center gap-1">
									<ClockIcon className="h-3.5 w-3.5 text-slate-400" />
									{formatDate(user.last_login)}
								</dd>
							</div>
							<div className="sm:col-span-1">
								<dt className="font-medium text-slate-500">Date Joined</dt>
								<dd className="mt-0.5 text-slate-800 flex items-center gap-1">
									<CalendarDaysIcon className="h-3.5 w-3.5 text-slate-400" />
									{formatDate(user.date_joined)}
								</dd>
							</div>
							<div className="sm:col-span-1">
								<dt className="font-medium text-slate-500">Active Status</dt>
								<dd className="mt-1">
									<span
										className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
											user.is_active
												? "bg-green-100 text-green-800 border border-green-200"
												: "bg-red-100 text-red-800 border border-red-200"
										}`}
									>
										{user.is_active ? (
											<CheckBadgeIcon className="h-3 w-3" />
										) : (
											<XCircleIcon className="h-3 w-3" />
										)}
										{user.is_active ? "ACTIVE" : "INACTIVE"}
									</span>
								</dd>
							</div>
						</dl>
					</div>
				</div>
			</div>
		</div>
	);
	// --- END OF UPDATED UI ---
}
