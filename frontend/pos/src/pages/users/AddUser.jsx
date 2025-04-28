import { useState, useEffect } from "react"; // Import React
import { useNavigate } from "react-router-dom";
import { userService } from "../../api/services/userService"; // Original import
import { toast } from "react-toastify";
// Icons for UI
import {
	ArrowLeftIcon,
	PlusCircleIcon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
} from "@heroicons/react/24/outline"; // Use outline icons

/**
 * AddUser Component (Logic Preserved from User Provided Code)
 *
 * Form for adding a new system user.
 * UI updated for a modern look and feel; Logic remains unchanged.
 * Variable definitions checked and corrected.
 */
export default function AddUser() {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		username: "",
		email: "",
		password: "",
		confirm_password: "",
		role: "cashier", // Default role
		is_pos_user: true, // Default system access
		is_website_user: false,
		first_name: "",
		last_name: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errors, setErrors] = useState({});
	const [currentUserRole, setCurrentUserRole] = useState("");
	const [generalError, setGeneralError] = useState(null); // Added state for general API errors

	// Fetch current user role (Original)
	useEffect(() => {
		const fetchCurrentUserRole = async () => {
			try {
				const userData = await userService.getCurrentUser();
				setCurrentUserRole(userData.role);
			} catch (error) {
				console.error("Error fetching current user:", error);
				toast.error("Could not verify user role."); // Notify user
			}
		};
		fetchCurrentUserRole();
	}, []);

	// Handle form changes (Original, with minor adjustments for clarity/robustness)
	const handleChange = (e) => {
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
			// Prevent admin from creating owner/admin
			if (value === "owner" && currentUserRole !== "owner") {
				toast.warning("Only owners can create owner users.");
				return; // Don't update state
			}
			// Allow owner to create admin, but prevent admin from creating admin
			if (value === "admin" && currentUserRole === "admin") {
				toast.warning("Admins cannot create other admin users.");
				return; // Don't update state
			}
			// If role is set to customer, ensure website user is checked
			if (value === "customer") {
				updatedFormData.is_website_user = true;
				updatedFormData.is_pos_user = false; // Customer cannot be POS user
			} else {
				// If role is changed FROM customer, uncheck website user if POS is checked
				if (formData.role === "customer" && formData.is_pos_user) {
					// This case might be redundant if role change handles it, but keep for safety
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

	// Validate form (Original)
	const validateForm = () => {
		const newErrors = {};
		if (!formData.username.trim()) newErrors.username = "Username is required";
		else if (formData.username.length < 3)
			newErrors.username = "Username must be at least 3 characters";
		if (!formData.email.trim()) newErrors.email = "Email is required";
		else if (!/\S+@\S+\.\S+/.test(formData.email))
			newErrors.email = "Email is invalid";
		if (!formData.password) newErrors.password = "Password is required";
		else if (formData.password.length < 8)
			newErrors.password = "Password must be at least 8 characters";
		if (formData.password !== formData.confirm_password)
			newErrors.confirm_password = "Passwords do not match";
		if (!formData.is_pos_user && !formData.is_website_user)
			newErrors.system =
				"User must have access to at least one system (POS or Website)."; // Added validation
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Handle form submission (Original)
	const handleSubmit = async (e) => {
		e.preventDefault();
		setGeneralError(null); // Clear general error on submit attempt
		if (!validateForm()) return;
		setIsSubmitting(true);
		try {
			const userData = { ...formData };
			console.log("Sending user data:", userData);
			await userService.createUser(userData);
			toast.success("User created successfully");
			navigate("/users");
		} catch (error) {
			console.error("Error creating user:", error);
			const apiErrors = error.response?.data;
			if (apiErrors && typeof apiErrors === "object") {
				const formattedErrors = Object.entries(apiErrors).reduce(
					(acc, [key, value]) => {
						// Map backend field names to frontend if necessary
						const frontendKey = key === "detail" ? "_general" : key; // Example mapping
						acc[frontendKey] = Array.isArray(value) ? value.join(" ") : value;
						return acc;
					},
					{}
				);
				setErrors(formattedErrors);
				// Check for a general non-field error message from the backend
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
					"Failed to create user. Please check the details and try again.";
				setGeneralError(errorMessage); // Set general error
				toast.error(errorMessage);
			}
		} finally {
			setIsSubmitting(false);
		}
	};
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	// Input field base class
	const inputBaseClass =
		"block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm disabled:bg-slate-100";
	const inputNormalClass = `${inputBaseClass} border-slate-300 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400`;
	const inputErrorClass = `${inputBaseClass} border-red-400 text-red-800 focus:ring-red-500 focus:border-red-500 placeholder-red-300`;
	const selectClass = `${inputNormalClass} appearance-none bg-white bg-no-repeat bg-right-3`;
	const labelClass = "block text-xs font-medium text-slate-600 mb-1";
	const baseButtonClass =
		"px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
	const primaryButtonClass = `${baseButtonClass} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
	const secondaryButtonClass = `${baseButtonClass} bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 focus:ring-slate-500`;

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6 overflow-hidden">
			{/* Header Section - Styled */}
			<header className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 flex-shrink-0">
				<h1 className="text-xl sm:text-2xl font-bold text-slate-800">
					Add New User
				</h1>
				<button
					className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
					onClick={() => navigate("/users")} // Original handler
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Back to Users
				</button>
			</header>

			{/* Form Container - Scrollable */}
			<div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
				<form
					onSubmit={handleSubmit} // Original handler
					className="max-w-3xl mx-auto bg-white rounded-lg shadow-md border border-slate-200 p-6 sm:p-8"
					noValidate // Prevent browser validation, rely on JS
				>
					{/* General Error Display */}
					{generalError && (
						<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm">
							<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
							<span>{generalError}</span>
						</div>
					)}

					{/* Basic Information Section */}
					<div className="mb-5">
						<h2 className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">
							Basic Information
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
									value={formData.username}
									onChange={handleChange}
									className={
										errors.username ? inputErrorClass : inputNormalClass
									}
									required
								/>
								{errors.username && (
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
									value={formData.email}
									onChange={handleChange}
									className={errors.email ? inputErrorClass : inputNormalClass}
									required
								/>
								{errors.email && (
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
									value={formData.first_name}
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
									value={formData.last_name}
									onChange={handleChange}
									className={inputNormalClass}
								/>
							</div>
						</div>
					</div>

					{/* Password Section */}
					<div className="mb-5">
						<h2 className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">
							Password
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="password"
									className={labelClass}
								>
									Password <span className="text-red-500">*</span>
								</label>
								<input
									type="password"
									id="password"
									name="password"
									value={formData.password}
									onChange={handleChange}
									className={
										errors.password ? inputErrorClass : inputNormalClass
									}
									required
								/>
								{errors.password && (
									<p className="mt-1 text-xs text-red-600">{errors.password}</p>
								)}
							</div>
							<div>
								<label
									htmlFor="confirm_password"
									className={labelClass}
								>
									Confirm Password <span className="text-red-500">*</span>
								</label>
								<input
									type="password"
									id="confirm_password"
									name="confirm_password"
									value={formData.confirm_password}
									onChange={handleChange}
									className={
										errors.confirm_password ? inputErrorClass : inputNormalClass
									}
									required
								/>
								{errors.confirm_password && (
									<p className="mt-1 text-xs text-red-600">
										{errors.confirm_password}
									</p>
								)}
							</div>
						</div>
					</div>

					{/* Role and System Section */}
					<div className="mb-5">
						<h2 className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">
							Role & System Access
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
									value={formData.role}
									onChange={handleChange}
									className={`${selectClass} ${
										formData.is_website_user
											? "disabled:bg-slate-100 disabled:text-slate-500"
											: ""
									}`} // Style disabled state
									required
									disabled={formData.is_website_user} // Disable if website user checked
								>
									{/* Only show owner option if the current user is an owner */}
									{currentUserRole === "owner" && (
										<option value="owner">Owner</option>
									)}
									{/* Allow owner to create admin */}
									{currentUserRole === "owner" && (
										<option value="admin">Admin</option>
									)}
									{/* Always show manager and cashier unless website user is checked */}
									{!formData.is_website_user && (
										<option value="manager">Manager</option>
									)}
									{!formData.is_website_user && (
										<option value="cashier">Cashier</option>
									)}
									<option value="customer">Customer (Website Only)</option>
								</select>
								<p className="mt-1 text-xs text-slate-500">
									Determines user permissions.
								</p>
							</div>
							<div className="space-y-3 pt-1">
								<label className="block text-xs font-medium text-slate-600">
									System Access <span className="text-red-500">*</span>
								</label>
								<div className="flex items-center">
									<input
										id="is_pos_user"
										type="checkbox"
										name="is_pos_user"
										checked={formData.is_pos_user}
										onChange={handleChange}
										className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded disabled:opacity-50"
										disabled={formData.role === "customer"} // Disable if role is customer
									/>
									<label
										htmlFor="is_pos_user"
										className={`ml-2 text-sm ${
											formData.role === "customer"
												? "text-slate-400"
												: "text-slate-700"
										}`}
									>
										POS User
									</label>
								</div>
								<div className="flex items-center">
									<input
										id="is_website_user"
										type="checkbox"
										name="is_website_user"
										checked={formData.is_website_user}
										onChange={handleChange}
										className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded disabled:opacity-50"
										disabled={formData.role === "customer"} // Disable if role is customer
									/>
									<label
										htmlFor="is_website_user"
										className={`ml-2 text-sm ${
											formData.role === "customer"
												? "text-slate-400"
												: "text-slate-700"
										}`}
									>
										Website User (Sets Role to Customer)
									</label>
								</div>
								{errors.system && (
									<p className="mt-1 text-xs text-red-600">{errors.system}</p>
								)}
							</div>
						</div>
					</div>

					{/* Form Actions */}
					<div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
						<button
							type="button"
							onClick={() => navigate("/users")}
							className={secondaryButtonClass}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className={`${primaryButtonClass} flex items-center gap-1.5`}
						>
							{isSubmitting ? (
								<ArrowPathIcon className="h-4 w-4 animate-spin" />
							) : (
								<PlusCircleIcon className="h-5 w-5" />
							)}
							{isSubmitting ? "Creating..." : "Create User"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
	// --- END OF UPDATED UI ---
}
