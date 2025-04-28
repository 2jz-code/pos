import { useState, useEffect, useCallback } from "react";
import PropTypes from 'prop-types';
import { settingsService } from "../../api/services/settingsService";
import { toast } from "react-toastify";
import {
	KeyIcon,
	LockClosedIcon,
	ShieldCheckIcon, // Section Icon
	CheckCircleIcon, // Success Icon
	ExclamationTriangleIcon, // Error Icon
	InformationCircleIcon, // Help Text Icon
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Assuming spinner exists

// Helper component for form fields
const FormField = ({ label, id, children, helpText = null, error = null, className = "" }) => (
	<div className={className}>
		<label htmlFor={id} className="block text-sm font-medium text-slate-700">
			{label}
		</label>
		<div className="mt-1">{children}</div>
		{helpText && !error && (
			<p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
				<InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
				{helpText}
			</p>
		)}
		{error && (
			<p className="mt-1 flex items-center gap-1 text-xs text-red-600">
				<ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
				{error}
			</p>
		)}
	</div>
);
FormField.propTypes = {
	label: PropTypes.string.isRequired,
	id: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
	helpText: PropTypes.string,
	error: PropTypes.string,
    className: PropTypes.string,
};

// Helper component for Toggle Switch
const ToggleSwitch = ({ id, name, checked, onChange, label, description }) => (
	<div className="flex items-center justify-between gap-4 py-3">
		<div className="flex flex-col">
			<label htmlFor={id} className="text-sm font-medium text-slate-700 cursor-pointer">
				{label}
			</label>
			{description && <p className="text-xs text-slate-500">{description}</p>}
		</div>
		<label htmlFor={id} className="relative inline-flex cursor-pointer items-center">
			<input
				type="checkbox"
				id={id}
				name={name}
				checked={checked}
				onChange={onChange}
				className="peer sr-only"
			/>
			<div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-1 dark:border-slate-600 dark:bg-slate-700"></div>
		</label>
	</div>
);
ToggleSwitch.propTypes = {
	id: PropTypes.string.isRequired,
	name: PropTypes.string.isRequired,
	checked: PropTypes.bool.isRequired,
	onChange: PropTypes.func.isRequired,
	label: PropTypes.string.isRequired,
	description: PropTypes.string,
};

// Helper component for section headings
const SectionHeading = ({ icon: Icon, title }) => (
	<h3 className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-2 text-base font-semibold text-slate-800">
		<Icon className="h-5 w-5 text-blue-600" />
		{title}
	</h3>
);
SectionHeading.propTypes = {
	icon: PropTypes.elementType.isRequired,
	title: PropTypes.string.isRequired,
};


export default function SecuritySettings() {
	// Default settings structure
	const defaultSettings = {
		two_factor_auth: false,
		session_timeout: 30,
		password_expiry_days: 90,
		ip_restriction_enabled: false,
		allowed_ips: "",
	};

	const [settings, setSettings] = useState(defaultSettings);
	const [isLoading, setIsLoading] = useState(true); // For initial fetch
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState(null); // General/fetch error
	const [formErrors, setFormErrors] = useState({}); // Form validation errors
	const [successMessage, setSuccessMessage] = useState(null);

	// Fetch current security settings
	const fetchSecuritySettings = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		setSuccessMessage(null); // Clear success message on fetch
		try {
			const data = await settingsService.getSecuritySettings();
			// Merge fetched data with defaults to ensure all keys exist
			setSettings({ ...defaultSettings, ...data });
		} catch (err) {
			console.error("Error fetching security settings:", err);
			setError("Failed to load security settings. Displaying default values.");
			setSettings(defaultSettings); // Reset to defaults on error
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSecuritySettings();
	}, [fetchSecuritySettings]);

	// Handle input changes
	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		const newValue = type === "checkbox" ? checked : value;

		setSettings(prev => ({ ...prev, [name]: newValue }));

		// Clear specific form error when input changes
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
        // Clear general error/success messages on interaction
        if (error) setError(null);
        if (successMessage) setSuccessMessage(null);
	};

	// Frontend validation
	const validateForm = () => {
		const errors = {};
		const timeout = Number(settings.session_timeout);
		const expiry = Number(settings.password_expiry_days);
		const ips = settings.allowed_ips.trim();

		if (isNaN(timeout) || timeout < 5 || timeout > 480) { // Example range: 5 mins to 8 hours
            errors.session_timeout = "Session timeout must be between 5 and 480 minutes.";
        }
		if (isNaN(expiry) || expiry < 0 || expiry > 365) { // 0 means disabled
            errors.password_expiry_days = "Password expiry must be between 0 (disabled) and 365 days.";
        }
		if (settings.ip_restriction_enabled && !ips) {
			errors.allowed_ips = "Please enter at least one allowed IP address or range when restriction is enabled.";
		} else if (settings.ip_restriction_enabled && ips) {
			// Basic validation: check if lines are not empty (more complex CIDR/IP validation could be added)
			const ipLines = ips.split('\n').map(ip => ip.trim()).filter(ip => ip);
			if (ipLines.length === 0) {
				errors.allowed_ips = "Allowed IPs cannot be empty when restriction is enabled.";
			}
			// Example: rudimentary check for invalid characters (very basic)
			if (ipLines.some(ip => !/^[0-9a-fA-F.:/]+$/.test(ip))) {
				errors.allowed_ips = "Contains invalid characters. Enter valid IPs or CIDR ranges per line.";
			}
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	// Handle saving settings
	const handleSaveSettings = async (e) => {
		e.preventDefault();
		if (!validateForm()) {
			toast.warn("Please fix the errors in the form.");
			return;
		}

		setIsSaving(true);
		setError(null);
		setSuccessMessage(null);

		// Prepare payload (ensure numbers are numbers)
		const payload = {
			...settings,
			session_timeout: Number(settings.session_timeout),
			password_expiry_days: Number(settings.password_expiry_days),
			// Ensure allowed_ips is trimmed, send null if empty and restriction disabled? (depends on backend)
            allowed_ips: settings.ip_restriction_enabled ? settings.allowed_ips.trim() : "",
		};

		try {
			await settingsService.updateSecuritySettings(payload);
			const message = "Security settings updated successfully!";
			setSuccessMessage(message);
			toast.success(message);
		} catch (err) {
			console.error("Error saving security settings:", err);
			const message = err.response?.data?.error || "Failed to save security settings.";
			setError(message); // Show error in the general error display
			toast.error(message);
		} finally {
			setIsSaving(false);
		}
	};

	// --- Render Logic ---
	return (
		<div className="p-4 sm:p-6">
			{/* Section Header */}
			<div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
				<h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
					<ShieldCheckIcon className="h-5 w-5 text-blue-600" />
					Security Settings
				</h2>
				{/* Optional: Add a refresh button if needed */}
			</div>

			{/* General Error/Success Messages */}
			{error && (
				<div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
					<span>{error}</span>
				</div>
			)}
			{successMessage && (
				<div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
					<CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
					<span>{successMessage}</span>
				</div>
			)}

			{isLoading ? (
				<div className="flex items-center justify-center py-10">
					<LoadingSpinner size="md" />
				</div>
			) : (
				<form onSubmit={handleSaveSettings} className="space-y-8">
					{/* Authentication Section */}
					<section>
						<SectionHeading icon={LockClosedIcon} title="Authentication Settings" />
						<div className="space-y-4 divide-y divide-slate-100">
							<ToggleSwitch
								id="two_factor_auth"
								name="two_factor_auth"
								checked={settings.two_factor_auth}
								onChange={handleInputChange}
								label="Two-Factor Authentication (2FA)"
								description="Require 2FA for all administrator accounts."
							/>

							<FormField label="Session Timeout (minutes)" id="session_timeout" className="pt-4" error={formErrors.session_timeout}>
								<input
									type="number" id="session_timeout" name="session_timeout"
									value={settings.session_timeout} onChange={handleInputChange}
									min="5" max="480" step="1"
									className={`block w-full max-w-xs rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${formErrors.session_timeout ? 'ring-red-500 focus:ring-red-600' : 'ring-slate-300 focus:ring-blue-600'} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
								/>
							</FormField>

							<FormField label="Password Expiry (days)" id="password_expiry_days" className="pt-4" helpText="Set to 0 to disable password expiration." error={formErrors.password_expiry_days}>
								<input
									type="number" id="password_expiry_days" name="password_expiry_days"
									value={settings.password_expiry_days} onChange={handleInputChange}
									min="0" max="365" step="1"
									className={`block w-full max-w-xs rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ${formErrors.password_expiry_days ? 'ring-red-500 focus:ring-red-600' : 'ring-slate-300 focus:ring-blue-600'} placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
								/>
							</FormField>
						</div>
					</section>

					{/* Access Restrictions Section */}
					<section>
						<SectionHeading icon={KeyIcon} title="Access Restrictions" />
						<div className="space-y-4 divide-y divide-slate-100">
							<ToggleSwitch
								id="ip_restriction_enabled"
								name="ip_restriction_enabled"
								checked={settings.ip_restriction_enabled}
								onChange={handleInputChange}
								label="Enable IP Address Restrictions"
								description="Limit POS terminal and admin access to specific IP addresses."
							/>

							{settings.ip_restriction_enabled && (
								<FormField label="Allowed IP Addresses / Ranges" id="allowed_ips" className="pt-4" helpText="Enter one IP address or CIDR range per line (e.g., 192.168.1.100 or 10.0.0.0/24)." error={formErrors.allowed_ips}>
									<textarea
										id="allowed_ips" name="allowed_ips" rows="4"
										value={settings.allowed_ips} onChange={handleInputChange}
										placeholder="192.168.1.1&#10;10.0.0.0/24"
										className={`block w-full rounded-md border-0 px-3 py-1.5 font-mono text-sm text-slate-900 shadow-sm ring-1 ring-inset ${formErrors.allowed_ips ? 'ring-red-500 focus:ring-red-600' : 'ring-slate-300 focus:ring-blue-600'} placeholder:text-slate-400 placeholder:font-sans focus:ring-2 focus:ring-inset sm:leading-6`}
									/>
								</FormField>
							)}
						</div>
					</section>

					{/* Save Button */}
					<div className="flex justify-end border-t border-slate-200 pt-5">
						<button
							type="submit"
							className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
							disabled={isSaving || isLoading}
						>
							{isSaving ? (
								<>
									<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
									Saving...
								</>
							) : "Save Security Settings"}
						</button>
					</div>
				</form>
			)}
		</div>
	);
}
