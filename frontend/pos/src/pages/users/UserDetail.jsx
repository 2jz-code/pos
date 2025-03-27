// src/pages/users/UserDetail.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { userService } from "../../api/services/userService";
import { toast } from "react-toastify";
import { ArrowLeftIcon, PencilIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";

export default function UserDetail() {
	const navigate = useNavigate();
	const { userId } = useParams();
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const userData = await userService.getUserById(userId);
				setUser(userData);
				setError(null);
			} catch (err) {
				console.error("Error fetching user:", err);
				setError("Failed to load user details. Please try again.");
				toast.error("Failed to load user details");
			} finally {
				setIsLoading(false);
			}
		};

		fetchUser();
	}, [userId]);

	if (isLoading) {
		return (
			<div className="w-screen h-screen flex items-center justify-center bg-slate-50">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (error || !user) {
		return (
			<div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
				<div className="text-red-500 mb-4">{error || "User not found"}</div>
				<button
					className="px-4 py-2 bg-blue-600 text-white rounded-lg"
					onClick={() => navigate("/users")}
				>
					Back to Users
				</button>
			</div>
		);
	}

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-slate-800">User Details</h1>
				<div className="flex space-x-4">
					<button
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
						onClick={() => navigate(`/users/edit/${userId}`)}
					>
						<PencilIcon className="h-5 w-5" />
						Edit User
					</button>
					<button
						className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
						onClick={() => navigate("/users")}
					>
						<ArrowLeftIcon className="h-5 w-5" />
						Back to Users
					</button>
				</div>
			</div>

			{/* User Details */}
			<div className="flex-1 bg-white rounded-xl shadow-sm p-6 overflow-auto">
				<div className="max-w-3xl mx-auto">
					{/* Basic Information */}
					<div className="mb-8">
						<h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
							Basic Information
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<h3 className="text-sm font-medium text-slate-500 mb-1">
									Username
								</h3>
								<p className="text-slate-800">{user.username}</p>
							</div>

							<div>
								<h3 className="text-sm font-medium text-slate-500 mb-1">
									Email
								</h3>
								<p className="text-slate-800">{user.email || "-"}</p>
							</div>

							<div>
								<h3 className="text-sm font-medium text-slate-500 mb-1">
									First Name
								</h3>
								<p className="text-slate-800">{user.first_name || "-"}</p>
							</div>

							<div>
								<h3 className="text-sm font-medium text-slate-500 mb-1">
									Last Name
								</h3>
								<p className="text-slate-800">{user.last_name || "-"}</p>
							</div>
						</div>
					</div>

					{/* Role and System */}
					<div className="mb-8">
						<h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
							Role and System
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<h3 className="text-sm font-medium text-slate-500 mb-1">
									Role
								</h3>
								<span
									className={`px-2 py-1 rounded-full text-xs font-medium ${
										user.role === "admin"
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
							</div>

							<div>
								<h3 className="text-sm font-medium text-slate-500 mb-1">
									System Access
								</h3>
								<div className="flex space-x-2">
									{user.is_pos_user && (
										<span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
											POS
										</span>
									)}
									{user.is_website_user && (
										<span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
											WEBSITE
										</span>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Account Details */}
					<div className="mb-8">
						<h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
							Account Details
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<h3 className="text-sm font-medium text-slate-500 mb-1">
									Last Login
								</h3>
								<p className="text-slate-800">
									{user.last_login
										? new Date(user.last_login).toLocaleString()
										: "Never"}
								</p>
							</div>

							<div>
								<h3 className="text-sm font-medium text-slate-500 mb-1">
									Date Joined
								</h3>
								<p className="text-slate-800">
									{new Date(user.date_joined).toLocaleString()}
								</p>
							</div>

							<div>
								<h3 className="text-sm font-medium text-slate-500 mb-1">
									Active Status
								</h3>
								<span
									className={`px-2 py-1 rounded-full text-xs font-medium ${
										user.is_active
											? "bg-green-100 text-green-800"
											: "bg-red-100 text-red-800"
									}`}
								>
									{user.is_active ? "ACTIVE" : "INACTIVE"}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
