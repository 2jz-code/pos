import { useState, useEffect, useCallback } from "react"; // Added React import and useCallback
import { useNavigate, useParams } from "react-router-dom";
import { userService } from "../../api/services/userService"; // Original import
import { toast } from "react-toastify";
// Icons for UI
import {
	ArrowLeftIcon,
	CheckIcon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
	UserCircleIcon, // Added for header
} from "@heroicons/react/24/outline"; // Use outline icons
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Original import

/**
 * EditUser Component
 * Form for editing an existing system user. Includes fix for TypeError.
 */
export default function EditUser() {
	const navigate = useNavigate();
	const { userId } = useParams(); // Get userId from URL params
	const [isLoading, setIsLoading] = useState(true); // Loading state for initial data fetch
	const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for form submission
	const [errors, setErrors] = useState({}); // Form validation errors
	const [formData, setFormData] = useState(null); // Initialize formData as null initially
	const [currentUserRole, setCurrentUserRole] = useState("");
	const [currentUserId, setCurrentUserId] = useState(null); // Store current user's ID
	const [targetUserRole, setTargetUserRole] = useState(""); // Store the role of the user being edited
	const [generalError, setGeneralError] = useState(null); // State for general API/fetch errors

	// Fetch user data and current user role/ID
	const fetchInitialData = useCallback(async () => {
		setIsLoading(true);
		setGeneralError(null); // Clear previous errors
		setErrors({}); // Clear form errors
		setFormData(null); // Reset form data while loading

		try {
			const [userDataResponse, currentUserData] = await Promise.all([
				userService.getUserById(userId),
				userService.getCurrentUser(),
			]);

			// *** FIX: Check if userDataResponse is valid before setting state ***
			if (
				userDataResponse &&
				typeof userDataResponse === "object" &&
				currentUserData
			) {
				setFormData({
					...userDataResponse, // Spread fetched user data
					password: "", // Clear password fields on load
					confirm_password: "",
				});
				setTargetUserRole(userDataResponse.role);
				setCurrentUserRole(currentUserData.role);
				setCurrentUserId(currentUserData.id);
			} else {
				// Handle case where user data is not found or invalid
				throw new Error("User data could not be loaded or is invalid.");
			}
		} catch (error) {
			console.error("Error fetching initial data:", error);
			const message =
				error.message ||
				"Failed to load user data. Please try again or go back.";
			setGeneralError(message); // Set general error to display
			toast.error(message);
			// Keep formData null to prevent rendering the form
		} finally {
			setIsLoading(false);
		}
	}, [userId]); // Dependency array

	useEffect(() => {
		fetchInitialData();
	}, [fetchInitialData]); // Run fetch on mount and if function identity changes

	// Handle form changes (Original logic with role/system constraints)
	const handleChange = (e) => {
		// Prevent updates if formData is null (shouldn't happen if loading state is handled)
		if (!formData) return;

		const { name, value, type, checked } = e.target;
		let updatedFormData = { ...formData };

		if (type === "checkbox") {
			// Prevent unchecking both system access types
			if (name === "is_pos_user" && !checked && !formData.is_website_user) {
				toast.warning(
					"User must belong to at least one system (POS or Website)."
				);
				return;
			}
			if (name === "is_website_user" && !checked && !formData.is_pos_user) {
				toast.warning(
					"User must belong to at least one system (POS or Website)."
				);
				return;
			}

			updatedFormData = { ...updatedFormData, [name]: checked };

			// If website user is checked, force role to customer
			if (name === "is_website_user" && checked) {
				updatedFormData.role = "customer";
			}
			// If website user is unchecked, revert role if it was customer
			else if (
				name === "is_website_user" &&
				!checked &&
				formData.role === "customer"
			) {
				updatedFormData.role = "cashier"; // Revert to default non-customer role
			}
		} else if (name === "role") {
			// Prevent non-owners from promoting to owner
			if (value === "owner" && currentUserRole !== "owner") {
				toast.warning("Only owners can assign the owner role.");
				return; // Don't update state
			}
			// Prevent admin from editing other admins/owners (unless editing self)
			const editingSelf = parseInt(userId) === currentUserId;
			if (
				currentUserRole === "admin" &&
				!editingSelf &&
				(targetUserRole === "admin" || targetUserRole === "owner")
			) {
				toast.warning(
					"Admins cannot change the role of owners or other admins."
				);
				return;
			}
			// Prevent admin from promoting others to admin
			if (value === "admin" && currentUserRole === "admin" && !editingSelf) {
				toast.warning("Admins cannot promote other users to admin.");
				return;
			}

			// If role is set to customer, ensure website user is checked
			if (value === "customer") {
				updatedFormData.is_website_user = true;
				updatedFormData.is_pos_user = false; // Customer cannot be POS user
			} else {
				// If role is changed FROM customer, uncheck website user if POS is checked
				if (formData.role === "customer" && formData.is_pos_user) {
					updatedFormData.is_website_user = false;
				}
			}
			updatedFormData = { ...updatedFormData, [name]: value };
		} else {
			// Handle normal inputs
			updatedFormData = { ...updatedFormData, [name]: value };
		}

		setFormData(updatedFormData);
		// Clear related error when input changes
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: null }));
		}
		if (name === "password" && errors.confirm_password) {
			setErrors((prev) => ({ ...prev, confirm_password: null }));
		}
		if (name === "confirm_password" && errors.confirm_password) {
			setErrors((prev) => ({ ...prev, confirm_password: null }));
		}
		setGeneralError(null); // Clear general error on any change
	};

	// Validate form (Original logic)
	const validateForm = () => {
		// Cannot validate if formData is null
		if (!formData) return false;

		const newErrors = {};
		if (!formData.username?.trim()) newErrors.username = "Username is required";
		else if (formData.username.length < 3)
			newErrors.username = "Username must be at least 3 characters";
		if (!formData.email?.trim()) newErrors.email = "Email is required";
		else if (!/\S+@\S+\.\S+/.test(formData.email))
			newErrors.email = "Email is invalid";
		// Only validate password if it's provided
		if (formData.password) {
			if (formData.password.length < 8)
				newErrors.password = "Password must be at least 8 characters";
			if (formData.password !== formData.confirm_password)
				newErrors.confirm_password = "Passwords do not match";
		} else if (formData.confirm_password && !formData.password) {
			newErrors.password = "Please enter the new password as well.";
		}
		if (!formData.is_pos_user && !formData.is_website_user)
			newErrors.system =
				"User must have access to at least one system (POS or Website).";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Handle form submission (Original logic)
	const handleSubmit = async (e) => {
		e.preventDefault();
		// Cannot submit if formData is null
		if (!formData) return;

		setGeneralError(null); // Clear general error on submit attempt
		if (!validateForm()) return;
		setIsSubmitting(true);
		try {
			const userData = { ...formData };
			// Remove password fields if they are empty
			if (!userData.password) {
				delete userData.password;
				delete userData.confirm_password;
			} else {
				delete userData.confirm_password; // Only send 'password' if set
			}

			console.log("Sending user update data:", userData);
			await userService.updateUser(userId, userData);
			toast.success("User updated successfully");
			navigate("/users");
		} catch (error) {
			console.error("Error updating user:", error);
			const apiErrors = error.response?.data;
			if (apiErrors && typeof apiErrors === "object") {
				const formattedErrors = Object.entries(apiErrors).reduce(
					(acc, [key, value]) => {
						const frontendKey = key === "detail" ? "_general" : key;
						acc[frontendKey] = Array.isArray(value)
							? value.join(" ")
							: String(value); // Ensure value is string
						return acc;
					},
					{}
				);
				setErrors(formattedErrors);
				if (formattedErrors._general) {
					setGeneralError(formattedErrors._general);
					toast.error(formattedErrors._general);
				} else {
					toast.error("Please fix the errors highlighted below.");
				}
			} else {
				const errorMessage =
					apiErrors?.message ||
					apiErrors?.detail ||
					"Failed to update user. Please check the details and try again.";
				setGeneralError(errorMessage);
				toast.error(errorMessage);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- UI Rendering ---
	const inputBaseClass =
		"block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:ring-slate-200";
	const inputNormalClass = `${inputBaseClass} ring-slate-300`;
	const inputErrorClass = `${inputBaseClass} ring-red-500 focus:ring-red-600 text-red-800 placeholder-red-300`;
	const selectClass = `${inputNormalClass} appearance-none bg-white bg-no-repeat bg-right-3`; // Customize arrow if needed
	const labelClass = "block text-xs font-medium text-slate-600 mb-1";
	const baseButtonClass =
		"inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
	const primaryButtonClass = `${baseButtonClass} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
	const secondaryButtonClass = `${baseButtonClass} bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500`;

	// Determine if the form fields related to role/system should be disabled
	const isRoleSystemDisabled =
		(currentUserRole === "admin" && targetUserRole === "owner") ||
		(currentUserRole === "admin" &&
			targetUserRole === "admin" &&
			parseInt(userId) !== currentUserId);

	// --- Loading and Error States ---
	if (isLoading) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-slate-100">
				<LoadingSpinner size="lg" />
				<p className="ml-3 text-slate-500">Loading user data...</p>
			</div>
		);
	}

	if (generalError && !formData) {
		// Show general error if data loading failed completely
		return (
			<div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-100 p-6 text-center">
				<ExclamationTriangleIcon className="mb-4 h-12 w-12 text-red-400" />
				<h1 className="mb-2 text-xl font-semibold text-slate-800">
					Error Loading User
				</h1>
				<p className="mb-6 text-slate-600">{generalError}</p>
				<button
					className={secondaryButtonClass}
					onClick={() => navigate("/users")}
				>
					<ArrowLeftIcon className="h-4 w-4 mr-1.5" />
					Back to Users List
				</button>
			</div>
		);
	}

	// If formData is still null after loading and no general error, it's unexpected
	if (!formData) {
		return (
			<div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-100 p-6 text-center">
				<ExclamationTriangleIcon className="mb-4 h-12 w-12 text-red-400" />
				<h1 className="mb-2 text-xl font-semibold text-slate-800">Error</h1>
				<p className="mb-6 text-slate-600">
					Could not load user data. Please try again later.
				</p>
				<button
					className={secondaryButtonClass}
					onClick={() => navigate("/users")}
				>
					<ArrowLeftIcon className="h-4 w-4 mr-1.5" />
					Back to Users List
				</button>
			</div>
		);
	}

	// --- Render Form ---
	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 p-4 text-slate-900 sm:p-6">
			{/* Header */}
			<header className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 sm:text-2xl">
					<UserCircleIcon className="h-6 w-6 text-blue-600" />
					Edit User:{" "}
					<span className="text-blue-700">
						{formData?.username ?? "..."}
					</span>{" "}
					{/* FIX: Optional chaining */}
				</h1>
				<button
					className={secondaryButtonClass}
					onClick={() => navigate("/users")}
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Back to Users
				</button>
			</header>

			{/* Form Container - Scrollable */}
			<div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
				<form
					onSubmit={handleSubmit}
					className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-md sm:p-8"
					noValidate
				>
					{/* General Error Display within form */}
					{generalError && (
						<div
							role="alert"
							className="mb-5 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm"
						>
							<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
							<span>{generalError}</span>
						</div>
					)}

					{/* Basic Information Section */}
					<section
						aria-labelledby="basic-info-heading"
						className="mb-6"
					>
						<h2
							id="basic-info-heading"
							className="mb-4 border-b border-slate-100 pb-2 text-base font-semibold text-slate-700"
						>
							Basic Information
						</h2>
						<div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
							<div>
								<label
									htmlFor="username"
									className={labelClass}
								>
									Username <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="username"
									name="username"
									required
									value={formData.username}
									onChange={handleChange}
									className={
										errors?.username ? inputErrorClass : inputNormalClass
									}
								/>
								{errors?.username && (
									<p className="mt-1 text-xs text-red-600">{errors.username}</p>
								)}
							</div>
							<div>
								<label
									htmlFor="email"
									className={labelClass}
								>
									Email <span className="text-red-500">*</span>
								</label>
								<input
									type="email"
									id="email"
									name="email"
									required
									value={formData.email}
									onChange={handleChange}
									className={errors?.email ? inputErrorClass : inputNormalClass}
								/>
								{errors?.email && (
									<p className="mt-1 text-xs text-red-600">{errors.email}</p>
								)}
							</div>
							<div>
								<label
									htmlFor="first_name"
									className={labelClass}
								>
									First Name
								</label>
								<input
									type="text"
									id="first_name"
									name="first_name"
									value={formData.first_name || ""}
									onChange={handleChange}
									className={inputNormalClass}
								/>
							</div>
							<div>
								<label
									htmlFor="last_name"
									className={labelClass}
								>
									Last Name
								</label>
								<input
									type="text"
									id="last_name"
									name="last_name"
									value={formData.last_name || ""}
									onChange={handleChange}
									className={inputNormalClass}
								/>
							</div>
						</div>
					</section>

					{/* Password Section */}
					<section
						aria-labelledby="password-heading"
						className="mb-6"
					>
						<h2
							id="password-heading"
							className="mb-4 border-b border-slate-100 pb-2 text-base font-semibold text-slate-700"
						>
							Change Password (Optional)
						</h2>
						<div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
							<div>
								<label
									htmlFor="password"
									className={labelClass}
								>
									New Password
								</label>
								<input
									type="password"
									id="password"
									name="password"
									value={formData.password}
									onChange={handleChange}
									placeholder="Leave blank to keep current"
									className={
										errors?.password ? inputErrorClass : inputNormalClass
									}
								/>
								{errors?.password && (
									<p className="mt-1 text-xs text-red-600">{errors.password}</p>
								)}
							</div>
							<div>
								<label
									htmlFor="confirm_password"
									className={labelClass}
								>
									Confirm New Password
								</label>
								<input
									type="password"
									id="confirm_password"
									name="confirm_password"
									value={formData.confirm_password}
									onChange={handleChange}
									placeholder="Confirm new password"
									className={
										errors?.confirm_password
											? inputErrorClass
											: inputNormalClass
									}
								/>
								{errors?.confirm_password && (
									<p className="mt-1 text-xs text-red-600">
										{errors.confirm_password}
									</p>
								)}
							</div>
						</div>
						<p className="mt-2 text-xs text-slate-500">
							Leave both fields blank to keep the current password.
						</p>
					</section>

					{/* Role and System Section */}
					<section aria-labelledby="role-access-heading">
						<h2
							id="role-access-heading"
							className="mb-4 border-b border-slate-100 pb-2 text-base font-semibold text-slate-700"
						>
							Role & System Access
						</h2>
						<div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
							<div>
								<label
									htmlFor="role"
									className={labelClass}
								>
									Role <span className="text-red-500">*</span>
								</label>
								<select
									id="role"
									name="role"
									required
									value={formData.role}
									onChange={handleChange}
									disabled={isRoleSystemDisabled || formData.is_website_user}
									className={`${selectClass} ${
										isRoleSystemDisabled || formData.is_website_user
											? "disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
											: ""
									}`}
								>
									{/* Dynamically render options based on permissions */}
									{currentUserRole === "owner" && (
										<option value="owner">Owner</option>
									)}
									{(currentUserRole === "owner" ||
										(currentUserRole === "admin" &&
											parseInt(userId) === currentUserId)) && (
										<option value="admin">Admin</option>
									)}
									<option value="manager">Manager</option>
									<option value="cashier">Cashier</option>
									<option value="customer">Customer (Website Only)</option>
								</select>
								{isRoleSystemDisabled && (
									<p className="mt-1 text-xs text-amber-600">
										Role cannot be changed for this user by your account.
									</p>
								)}
							</div>
							<fieldset className="space-y-2 pt-1">
								<legend className="block text-xs font-medium text-slate-600 mb-1">
									System Access <span className="text-red-500">*</span>
								</legend>
								<div className="relative flex items-start">
									<div className="flex h-6 items-center">
										<input
											id="is_pos_user"
											name="is_pos_user"
											type="checkbox"
											checked={formData.is_pos_user}
											onChange={handleChange}
											disabled={
												isRoleSystemDisabled || formData.role === "customer"
											}
											className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
										/>
									</div>
									<div className="ml-3 text-sm leading-6">
										<label
											htmlFor="is_pos_user"
											className={`font-medium ${
												isRoleSystemDisabled || formData.role === "customer"
													? "text-slate-400"
													: "text-slate-700"
											}`}
										>
											POS User
										</label>
									</div>
								</div>
								<div className="relative flex items-start">
									<div className="flex h-6 items-center">
										<input
											id="is_website_user"
											name="is_website_user"
											type="checkbox"
											checked={formData.is_website_user}
											onChange={handleChange}
											disabled={
												isRoleSystemDisabled || formData.role === "customer"
											}
											className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
										/>
									</div>
									<div className="ml-3 text-sm leading-6">
										<label
											htmlFor="is_website_user"
											className={`font-medium ${
												isRoleSystemDisabled || formData.role === "customer"
													? "text-slate-400"
													: "text-slate-700"
											}`}
										>
											Website User
										</label>
										<p className="text-xs text-slate-500">
											(Sets Role to Customer)
										</p>
									</div>
								</div>
								{errors?.system && (
									<p className="mt-1 text-xs text-red-600">{errors.system}</p>
								)}
							</fieldset>
						</div>
					</section>

					{/* Form Actions */}
					<div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5">
						<button
							type="button"
							onClick={() => navigate("/users")}
							className={secondaryButtonClass}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || isLoading}
							className={primaryButtonClass}
						>
							{isSubmitting ? (
								<ArrowPathIcon className="h-4 w-4 animate-spin" />
							) : (
								<CheckIcon className="h-5 w-5" />
							)}
							{isSubmitting ? "Saving..." : "Save Changes"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
