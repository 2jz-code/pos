import { useState, useEffect, useCallback } from "react"; // Added React import
import { useNavigate } from "react-router-dom";
import { userService } from "../../api/services/userService"; // Original import
import { toast } from "react-toastify";
// Icons for UI
import {
	PlusIcon,
	Bars3Icon,
	EyeIcon,
	PencilSquareIcon,
	TrashIcon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
	UserCircleIcon,
	InformationCircleIcon,
} from "@heroicons/react/24/outline"; // Using outline for consistency
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Original import
import UserConfirmationModal from "./UserConfirmationModal"; // Original import

/**
 * Users Component (Logic Preserved from User Provided Code)
 *
 * Displays a list of users with actions like add, edit, delete, view.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
export default function Users() {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [userToDelete, setUserToDelete] = useState(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentUserRole, setCurrentUserRole] = useState("");
	const [currentUserId, setCurrentUserId] = useState(null);
	const navigate = useNavigate();

	const fetchUsers = useCallback(async () => {
		// Wrap in useCallback
		setIsLoading(true);
		setError(null); // Clear previous errors
		try {
			const data = await userService.getUsers();
			setUsers(data);
		} catch (err) {
			console.error("Error fetching users:", err);
			const errorMsg = "Failed to load users. Please try again.";
			setError(errorMsg);
			toast.error(errorMsg);
		} finally {
			setIsLoading(false);
		}
	}, []); // Empty dependency array for useCallback

	useEffect(() => {
		fetchUsers();

		const fetchCurrentUser = async () => {
			try {
				const userData = await userService.getCurrentUser();
				setCurrentUserRole(userData.role);
				setCurrentUserId(userData.id);
			} catch (error) {
				console.error("Error fetching current user:", error);
				// Optionally set an error state here too
			}
		};
		fetchCurrentUser();
	}, [fetchUsers]); // Add fetchUsers to dependency array

	const handleView = (userId) => {
		navigate(`/users/${userId}`);
	};

	const handleEdit = (userId) => {
		navigate(`/users/edit/${userId}`);
	};

	const handleDelete = (user) => {
		setUserToDelete(user);
		setShowDeleteModal(true);
	};

	const confirmDelete = async () => {
		if (!userToDelete) return;
		try {
			await userService.deleteUser(userToDelete.id);
			setUsers(users.filter((user) => user.id !== userToDelete.id));
			toast.success(`User ${userToDelete.username} deleted successfully`);
		} catch (err) {
			console.error("Error deleting user:", err);
			toast.error(
				`Failed to delete user: ${err.response?.data?.message || err.message}`
			);
		} finally {
			setShowDeleteModal(false);
			setUserToDelete(null);
		}
	};

	// Helper to determine if actions should be disabled based on roles
	const isActionDisabled = (targetUser) => {
		if (!currentUserRole || !currentUserId) return true; // Disable if current user info not loaded

		// Owner can do anything
		if (currentUserRole === "owner") return false;

		// Admin cannot edit/delete owner
		if (targetUser.role === "owner") return true;

		// Admin cannot edit/delete other admins (except themselves)
		if (
			targetUser.role === "admin" &&
			currentUserRole === "admin" &&
			targetUser.id !== currentUserId
		)
			return true;

		// Otherwise, action is allowed
		return false;
	};

	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	// Loading State - Styled
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen bg-slate-100">
				<LoadingSpinner size="lg" />
				<p className="text-slate-500 ml-3">Loading users...</p>
			</div>
		);
	}

	return (
		// Main container
		<div className="w-screen h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6 overflow-hidden">
			{/* Header Section - Styled */}
			<header className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-slate-200 gap-3 flex-shrink-0">
				<h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
					<UserCircleIcon className="h-6 w-6 text-slate-600" /> User Management
				</h1>
				{/* Header Buttons */}
				<div className="flex items-center gap-2 sm:gap-3">
					{/* Add User Button - Styled */}
					<button
						className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center gap-1.5 shadow-sm"
						onClick={() => navigate("/users/add")} // Original handler
					>
						<PlusIcon className="h-4 w-4" />
						Add User
					</button>
					{/* Dashboard Button - Styled */}
					<button
						className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
						onClick={() => navigate("/dashboard")} // Original handler
					>
						<Bars3Icon className="h-4 w-4" />
						<span className="hidden sm:inline">Dashboard</span>
					</button>
				</div>
			</header>

			{/* Admin Note - Styled */}
			{currentUserRole === "admin" && (
				<div className="mb-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-200 flex items-center gap-2 flex-shrink-0">
					<InformationCircleIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
					<span>
						<strong>Note:</strong> As an admin, you can only edit your own
						account and non-admin users. Only owners can edit other admins or
						owners.
					</span>
				</div>
			)}

			{/* Error Display - Styled */}
			{error && !isLoading && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm flex-shrink-0">
					<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
					<span>{error}</span>
					<button
						onClick={fetchUsers}
						className="ml-auto px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded text-xs hover:bg-red-200"
					>
						<ArrowPathIcon className="h-3 w-3 inline mr-1" /> Retry
					</button>
				</div>
			)}

			{/* Main Content Table Area - Flex Grow and Overflow */}
			<div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200 min-h-0">
				<div className="overflow-auto h-full custom-scrollbar">
					<table className="min-w-full divide-y divide-slate-200">
						<thead className="bg-slate-50 sticky top-0 z-10">
							{" "}
							{/* Sticky header */}
							<tr>
								<th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
									Username
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
									Email
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
									Role
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
									System
								</th>
								<th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-slate-100">
							{users.length === 0 && !isLoading ? (
								<tr>
									<td
										colSpan="5"
										className="px-6 py-10 text-center text-slate-500"
									>
										No users found.
									</td>
								</tr>
							) : (
								users.map((user) => {
									const disabled = isActionDisabled(user); // Check if actions are disabled for this user
									return (
										<tr
											key={user.id}
											className={`hover:bg-slate-50 transition-colors ${
												disabled && currentUserRole !== "owner"
													? "opacity-70"
													: ""
											}`}
										>
											{" "}
											{/* Dim row slightly if actions disabled */}
											<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800">
												{user.username}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
												{user.email || "-"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm">
												{/* Role Badge */}
												<span
													className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
														user.role === "owner"
															? "bg-amber-100 text-amber-800 border border-amber-200"
															: user.role === "admin"
															? "bg-purple-100 text-purple-800 border border-purple-200"
															: user.role === "manager"
															? "bg-blue-100 text-blue-800 border border-blue-200"
															: user.role === "cashier"
															? "bg-green-100 text-green-800 border border-green-200"
															: "bg-slate-100 text-slate-700 border border-slate-200" // Customer or other
													}`}
												>
													{user.role.toUpperCase()}
												</span>
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm space-x-1">
												{/* System Badges */}
												{user.is_pos_user && (
													<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 border border-cyan-200">
														POS
													</span>
												)}
												{user.is_website_user && (
													<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-800 border border-lime-200">
														WEB
													</span>
												)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-right space-x-1.5">
												{" "}
												{/* Action Buttons */}
												<button
													onClick={() => handleView(user.id)}
													className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
													title="View Details"
												>
													<EyeIcon className="h-3.5 w-3.5" />
												</button>
												<button
													onClick={() => handleEdit(user.id)}
													className={`p-1.5 rounded transition-colors ${
														disabled
															? "bg-slate-100 text-slate-400 cursor-not-allowed"
															: "bg-blue-50 text-blue-700 hover:bg-blue-100"
													}`}
													disabled={disabled}
													title={
														disabled ? "Cannot edit this user" : "Edit User"
													}
												>
													<PencilSquareIcon className="h-3.5 w-3.5" />
												</button>
												<button
													onClick={() => handleDelete(user)}
													className={`p-1.5 rounded transition-colors ${
														disabled
															? "bg-slate-100 text-slate-400 cursor-not-allowed"
															: "bg-red-50 text-red-700 hover:bg-red-100"
													}`}
													disabled={disabled}
													title={
														disabled ? "Cannot delete this user" : "Delete User"
													}
												>
													<TrashIcon className="h-3.5 w-3.5" />
												</button>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Delete Confirmation Modal - Uses updated component */}
			<UserConfirmationModal
				isOpen={showDeleteModal} // Original state
				onClose={() => {
					setShowDeleteModal(false);
					setUserToDelete(null);
				}} // Original handler
				onConfirm={confirmDelete} // Original handler
				title="Delete User"
				message={`Are you sure you want to delete user "${userToDelete?.username}"? This action cannot be undone.`} // Dynamic message
				confirmButtonText="Delete"
				// Pass confirm button style directly if modal accepts it
				// confirmButtonClass="bg-red-600 hover:bg-red-700"
			/>
		</div>
	);
	// --- END OF UPDATED UI ---
}
