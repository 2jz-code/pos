// src/pages/users/EditUser.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { userService } from "../../api/services/userService";
import { toast } from "react-toastify";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";

export default function EditUser() {
	const navigate = useNavigate();
	const { userId } = useParams();
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errors, setErrors] = useState({});
	const [formData, setFormData] = useState({
		username: "",
		email: "",
		password: "",
		confirm_password: "",
		role: "",
		is_pos_user: true,
		is_website_user: false,
		first_name: "",
		last_name: "",
	});
	const [currentUserRole, setCurrentUserRole] = useState("");

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const userData = await userService.getUserById(userId);
				setFormData({
					...userData,
					password: "",
					confirm_password: "",
				});
			} catch (error) {
				console.error("Error fetching user:", error);
				toast.error("Failed to load user data");
				navigate("/users");
			} finally {
				setIsLoading(false);
			}
		};
		const fetchCurrentUserRole = async () => {
			try {
				const userData = await userService.getCurrentUser();
				setCurrentUserRole(userData.role);
			} catch (error) {
				console.error("Error fetching current user:", error);
			}
		};

		fetchUser();
		fetchCurrentUserRole();
	}, [userId, navigate]);

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;

		if (type === "checkbox") {
			// Special handling for checkboxes
			if (name === "is_pos_user" && !checked && !formData.is_website_user) {
				// If unchecking POS and website is not checked, don't allow
				toast.warning("User must belong to at least one system");
				return;
			}
			if (name === "is_website_user" && !checked && !formData.is_pos_user) {
				// If unchecking website and POS is not checked, don't allow
				toast.warning("User must belong to at least one system");
				return;
			}

			// Special handling for customer role
			if (name === "is_website_user" && checked) {
				setFormData({
					...formData,
					[name]: checked,
					role: "customer",
				});
				return;
			}

			// Set the value for checkbox
			setFormData({
				...formData,
				[name]: checked,
			});
		} else {
			// For other inputs
			setFormData({
				...formData,
				[name]: value,
			});
		}
	};

	const validateForm = () => {
		const newErrors = {};

		if (!formData.username.trim()) {
			newErrors.username = "Username is required";
		} else if (formData.username.length < 3) {
			newErrors.username = "Username must be at least 3 characters";
		}

		if (!formData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
			newErrors.email = "Email is invalid";
		}

		// Only validate password if it's provided (optional on edit)
		if (formData.password) {
			if (formData.password.length < 8) {
				newErrors.password = "Password must be at least 8 characters";
			}

			if (formData.password !== formData.confirm_password) {
				newErrors.confirm_password = "Passwords do not match";
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsSubmitting(true);

		try {
			// Create a copy of the form data
			const userData = { ...formData };

			// Password update logic
			if (userData.password === "") {
				// If not updating password, remove both password fields
				delete userData.password;
				delete userData.confirm_password;
			} else if (userData.password) {
				// If updating password, ensure confirm_password matches
				if (userData.password !== userData.confirm_password) {
					setErrors({
						...errors,
						confirm_password: "Passwords do not match",
					});
					setIsSubmitting(false);
					return;
				}
				// Both fields are present and match, so we're good to go
			}

			console.log("Sending user update data:", userData); // For debugging

			await userService.updateUser(userId, userData);
			toast.success("User updated successfully");
			navigate("/users");
		} catch (error) {
			console.error("Error updating user:", error);

			// Enhanced error handling
			if (error.response?.data) {
				// If we have a structured error response
				if (typeof error.response.data === "object") {
					// Handle field errors (like confirm_password errors)
					setErrors((prev) => ({
						...prev,
						...error.response.data,
					}));

					// Create a readable error message
					const errorMessages = Object.entries(error.response.data)
						.map(
							([field, msgs]) =>
								`${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`
						)
						.join("; ");

					toast.error(errorMessages || "Validation failed");
				} else {
					// Handle string error messages
					toast.error(error.response.data.message || "Failed to update user");
				}
			} else {
				toast.error("Failed to update user. Please try again.");
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="w-screen h-screen flex items-center justify-center bg-slate-50">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-slate-800">
					Edit User: {formData.username}
				</h1>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
					onClick={() => navigate("/users")}
				>
					<ArrowLeftIcon className="h-5 w-5" />
					Back to Users
				</button>
			</div>

			{/* Form Container */}
			<div className="flex-1 bg-white rounded-xl shadow-sm p-6 overflow-auto">
				<form
					onSubmit={handleSubmit}
					className="max-w-3xl mx-auto"
				>
					{/* Basic Information */}
					<div className="mb-8">
						<h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
							Basic Information
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label
									htmlFor="username"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Username <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="username"
									name="username"
									value={formData.username}
									onChange={handleChange}
									className={`block w-full px-3 py-2 border ${
										errors.username ? "border-red-300" : "border-slate-300"
									} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
									required
								/>
								{errors.username && (
									<p className="mt-1 text-sm text-red-600">{errors.username}</p>
								)}
							</div>

							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Email <span className="text-red-500">*</span>
								</label>
								<input
									type="email"
									id="email"
									name="email"
									value={formData.email}
									onChange={handleChange}
									className={`block w-full px-3 py-2 border ${
										errors.email ? "border-red-300" : "border-slate-300"
									} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
									required
								/>
								{errors.email && (
									<p className="mt-1 text-sm text-red-600">{errors.email}</p>
								)}
							</div>

							<div>
								<label
									htmlFor="first_name"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									First Name
								</label>
								<input
									type="text"
									id="first_name"
									name="first_name"
									value={formData.first_name || ""}
									onChange={handleChange}
									className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>

							<div>
								<label
									htmlFor="last_name"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Last Name
								</label>
								<input
									type="text"
									id="last_name"
									name="last_name"
									value={formData.last_name || ""}
									onChange={handleChange}
									className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
						</div>
					</div>

					{/* Password Section */}
					<div className="mb-8">
						<h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
							Change Password (Optional)
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									New Password
								</label>
								<input
									type="password"
									id="password"
									name="password"
									value={formData.password}
									onChange={handleChange}
									className={`block w-full px-3 py-2 border ${
										errors.password ? "border-red-300" : "border-slate-300"
									} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
								/>
								<p className="mt-1 text-xs text-slate-500">
									Leave blank to keep current password
								</p>
								{errors.password && (
									<p className="mt-1 text-sm text-red-600">{errors.password}</p>
								)}
							</div>

							<div>
								<label
									htmlFor="confirm_password"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Confirm New Password
								</label>
								<input
									type="password"
									id="confirm_password"
									name="confirm_password"
									value={formData.confirm_password}
									onChange={handleChange}
									className={`block w-full px-3 py-2 border ${
										errors.confirm_password
											? "border-red-300"
											: "border-slate-300"
									} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
								/>
								{errors.confirm_password && (
									<p className="mt-1 text-sm text-red-600">
										{errors.confirm_password}
									</p>
								)}
							</div>
						</div>
					</div>

					{/* Role and System Section */}
					<div className="mb-8">
						<h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
							Role and System
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label
									htmlFor="role"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Role <span className="text-red-500">*</span>
								</label>
								<select
									id="role"
									name="role"
									value={formData.role}
									onChange={handleChange}
									className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									required
								>
									{/* Only show owner option if the current user is an owner */}
									{currentUserRole === "owner" && (
										<option value="owner">Owner</option>
									)}
									<option value="admin">Admin</option>
									<option value="manager">Manager</option>
									<option value="cashier">Cashier</option>
									<option value="customer">Customer</option>
								</select>
								<p className="mt-1 text-xs text-slate-500">
									Determines the user&apos;s permissions in the system
								</p>
							</div>

							<div className="flex flex-col space-y-4">
								<div>
									<label className="flex items-center">
										<input
											type="checkbox"
											name="is_pos_user"
											checked={formData.is_pos_user}
											onChange={handleChange}
											className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
										/>
										<span className="ml-2 text-sm text-slate-700">
											POS User
										</span>
									</label>
									<p className="mt-1 text-xs text-slate-500 ml-6">
										Can access the Point of Sale system
									</p>
								</div>

								<div>
									<label className="flex items-center">
										<input
											type="checkbox"
											name="is_website_user"
											checked={formData.is_website_user}
											onChange={handleChange}
											className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
										/>
										<span className="ml-2 text-sm text-slate-700">
											Website User
										</span>
									</label>
									<p className="mt-1 text-xs text-slate-500 ml-6">
										Can access the customer website (will be set as Customer
										role)
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Form Actions */}
					<div className="flex justify-end space-x-4 mt-8 pt-4 border-t border-slate-200">
						<button
							type="button"
							onClick={() => navigate("/users")}
							className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
						>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
