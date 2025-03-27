// pages/settings/SecuritySettings.jsx
import { useState, useEffect } from "react";
import { settingsService } from "../../api/services/settingsService";
import { KeyIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import {
	CheckCircleIcon,
	ExclamationCircleIcon,
} from "@heroicons/react/24/solid";

export default function SecuritySettings() {
	const [settings, setSettings] = useState({
		two_factor_auth: false,
		session_timeout: 30,
		password_expiry_days: 90,
		ip_restriction_enabled: false,
		allowed_ips: "",
	});

	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState(null);
	const [successMessage, setSuccessMessage] = useState(null);

	// Fetch current security settings
	useEffect(() => {
		const fetchSecuritySettings = async () => {
			setIsLoading(true);
			try {
				const data = await settingsService.getSecuritySettings();
				setSettings(data);
				setError(null);
			} catch (err) {
				console.error("Error fetching security settings:", err);
				setError("Failed to load security settings. Using defaults.");
				// Use default settings if API fails
			} finally {
				setIsLoading(false);
			}
		};

		fetchSecuritySettings();
	}, []);

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setSettings({
			...settings,
			[name]: type === "checkbox" ? checked : value,
		});
	};

	const handleSaveSettings = async (e) => {
		e.preventDefault();
		setIsSaving(true);
		setError(null);
		setSuccessMessage(null);

		try {
			await settingsService.updateSecuritySettings(settings);
			setSuccessMessage("Security settings updated successfully!");
		} catch (err) {
			console.error("Error saving security settings:", err);
			setError(
				err.response?.data?.error ||
					"Failed to save security settings. Please try again."
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="p-6">
			{/* Page header */}
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-xl font-semibold text-slate-800">
					Security Settings
				</h2>
			</div>

			{error && (
				<div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
					<ExclamationCircleIcon className="h-5 w-5 mr-2" />
					{error}
				</div>
			)}

			{successMessage && (
				<div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center">
					<CheckCircleIcon className="h-5 w-5 mr-2" />
					{successMessage}
				</div>
			)}

			{isLoading ? (
				<div className="flex-1 flex items-center justify-center">
					<div className="text-slate-500">Loading security settings...</div>
				</div>
			) : (
				<form
					onSubmit={handleSaveSettings}
					className="space-y-6 bg-white rounded-lg border border-slate-200 p-6"
				>
					<div className="border-b border-slate-200 pb-6">
						<h3 className="text-lg font-medium mb-4 text-slate-800 flex items-center">
							<LockClosedIcon className="h-5 w-5 mr-2 text-blue-600" />
							Authentication Settings
						</h3>

						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<label className="block text-sm font-medium text-slate-700">
										Two-Factor Authentication
									</label>
									<p className="text-sm text-slate-500">
										Require two-factor authentication for all admin users
									</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										name="two_factor_auth"
										checked={settings.two_factor_auth}
										onChange={handleInputChange}
										className="sr-only peer"
									/>
									<div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
								</label>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Session Timeout (minutes)
								</label>
								<input
									type="number"
									name="session_timeout"
									value={settings.session_timeout}
									onChange={handleInputChange}
									min="5"
									max="240"
									className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Password Expiry (days)
								</label>
								<input
									type="number"
									name="password_expiry_days"
									value={settings.password_expiry_days}
									onChange={handleInputChange}
									min="0"
									max="365"
									className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p className="text-xs text-slate-500 mt-1">
									Set to 0 to disable password expiration
								</p>
							</div>
						</div>
					</div>

					<div>
						<h3 className="text-lg font-medium mb-4 text-slate-800 flex items-center">
							<KeyIcon className="h-5 w-5 mr-2 text-blue-600" />
							Access Restrictions
						</h3>

						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<label className="block text-sm font-medium text-slate-700">
										IP Address Restrictions
									</label>
									<p className="text-sm text-slate-500">
										Limit admin access to specific IP addresses
									</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										name="ip_restriction_enabled"
										checked={settings.ip_restriction_enabled}
										onChange={handleInputChange}
										className="sr-only peer"
									/>
									<div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
								</label>
							</div>

							{settings.ip_restriction_enabled && (
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-1">
										Allowed IP Addresses
									</label>
									<textarea
										name="allowed_ips"
										value={settings.allowed_ips}
										onChange={handleInputChange}
										rows="3"
										placeholder="Enter IP addresses, one per line"
										className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									></textarea>
									<p className="text-xs text-slate-500 mt-1">
										Enter one IP address or CIDR range per line (e.g.,
										192.168.1.1 or 10.0.0.0/24)
									</p>
								</div>
							)}
						</div>
					</div>

					<div className="flex justify-end pt-4 border-t border-slate-200">
						<button
							type="submit"
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							disabled={isSaving}
						>
							{isSaving ? "Saving..." : "Save Security Settings"}
						</button>
					</div>
				</form>
			)}
		</div>
	);
}
