// src/pages/users/Users.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "../../api/services/userService";
import { toast } from "react-toastify";
import { PlusIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import UserConfirmationModal from "./UserConfirmationModal";

export default function Users() {
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [userToDelete, setUserToDelete] = useState(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentUserRole, setCurrentUserRole] = useState("");
	const [currentUserId, setCurrentUserId] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		fetchUsers();

		// Get the current user's role and ID
		const fetchCurrentUser = async () => {
			try {
				const userData = await userService.getCurrentUser();
				setCurrentUserRole(userData.role);
				setCurrentUserId(userData.id);
			} catch (error) {
				console.error("Error fetching current user:", error);
			}
		};

		fetchCurrentUser();
	}, []);

	const fetchUsers = async () => {
		setIsLoading(true);
		try {
			const data = await userService.getUsers();
			setUsers(data);
			setError(null);
		} catch (err) {
			console.error("Error fetching users:", err);
			setError("Failed to load users. Please try again.");
			toast.error("Failed to load users");
		} finally {
			setIsLoading(false);
		}
	};

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
			setShowDeleteModal(false);
			setUserToDelete(null);
		} catch (err) {
			console.error("Error deleting user:", err);
			toast.error(
				`Failed to delete user: ${err.response?.data?.message || err.message}`
			);
		}
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-slate-800">User Management</h1>
				<div className="flex space-x-4">
					<button
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
						onClick={() => navigate("/users/add")}
					>
						<PlusIcon className="h-5 w-5" />
						Add User
					</button>
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
			{currentUserRole === "admin" && (
				<div className="px-6 py-2 bg-blue-50 text-blue-800 text-sm border-b border-slate-200">
					<p>
						<strong>Note:</strong> As an admin, you can only edit your own
						account and non-admin users. Only owners can edit other admins.
					</p>
				</div>
			)}
			{/* Main Content */}
			<div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
				{isLoading ? (
					<div className="flex items-center justify-center h-full">
						<LoadingSpinner size="lg" />
					</div>
				) : error ? (
					<div className="flex flex-col items-center justify-center h-full p-6 text-center">
						<div className="text-red-500 mb-4">{error}</div>
						<button
							className="px-4 py-2 bg-blue-600 text-white rounded-lg"
							onClick={fetchUsers}
						>
							Try Again
						</button>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
										Username
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
										Email
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
										Role
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
										System
									</th>
									<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-200">
								{users.length === 0 ? (
									<tr>
										<td
											colSpan="5"
											className="px-6 py-4 text-center text-slate-500"
										>
											No users found
										</td>
									</tr>
								) : (
									users.map((user) => (
										<tr
											key={user.id}
											className={`hover:bg-slate-50 ${
												user.role === "owner"
													? "bg-amber-50"
													: user.role === "admin" &&
													  currentUserRole === "admin" &&
													  user.id !== currentUserId
													? "bg-purple-50"
													: ""
											}`}
										>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
												{user.username}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
												{user.email || "-"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium ${
														user.role === "owner"
															? "bg-amber-100 text-amber-800"
															: user.role === "admin"
															? "bg-purple-100 text-purple-800"
															: user.role === "manager"
															? "bg-blue-100 text-blue-800"
															: user.role === "cashier"
															? "bg-green-100 text-green-800"
															: "bg-amber-100 text-amber-800"
													}`}
												>
													{user.role.toUpperCase()}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium ${
														user.is_pos_user
															? "bg-blue-100 text-blue-800"
															: "bg-emerald-100 text-emerald-800"
													}`}
												>
													{user.is_pos_user ? "POS" : "WEBSITE"}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right">
												<button
													onClick={() => handleView(user.id)}
													className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs hover:bg-slate-100 transition-colors mr-2"
												>
													View
												</button>
												<button
													onClick={() => handleEdit(user.id)}
													className={`px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors mr-2 ${
														(user.role === "owner" &&
															currentUserRole !== "owner") ||
														(user.role === "admin" &&
															currentUserRole === "admin" &&
															user.id !== currentUserId)
															? "opacity-50 cursor-not-allowed"
															: ""
													}`}
													disabled={
														(user.role === "owner" &&
															currentUserRole !== "owner") ||
														(user.role === "admin" &&
															currentUserRole === "admin" &&
															user.id !== currentUserId)
													}
												>
													Edit
												</button>
												<button
													onClick={() => handleDelete(user)}
													className={`px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-colors ${
														(user.role === "owner" &&
															currentUserRole !== "owner") ||
														(user.role === "admin" &&
															currentUserRole === "admin" &&
															user.id !== currentUserId)
															? "opacity-50 cursor-not-allowed"
															: ""
													}`}
													disabled={
														(user.role === "owner" &&
															currentUserRole !== "owner") ||
														(user.role === "admin" &&
															currentUserRole === "admin" &&
															user.id !== currentUserId)
													}
												>
													Delete
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Delete Confirmation Modal */}
			{showDeleteModal && (
				<UserConfirmationModal
					isOpen={showDeleteModal}
					onClose={() => {
						setShowDeleteModal(false);
						setUserToDelete(null);
					}}
					onConfirm={confirmDelete}
					title="Delete User"
					message={`Are you sure you want to delete ${userToDelete?.username}? This action cannot be undone.`}
					confirmButtonText="Delete"
					confirmButtonClass="bg-red-600 hover:bg-red-700"
				/>
			)}
		</div>
	);
}
