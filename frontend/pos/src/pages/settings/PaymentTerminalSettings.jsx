import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { settingsService } from "../../api/services/settingsService";
import { toast } from "react-toastify";
import {
	DeviceTabletIcon, // Section Icon
	ArrowPathIcon, // Sync Icon
	PlusIcon, // Register Button Icon
	CheckCircleIcon, // Online Status / Success
	XCircleIcon, // Offline Status / Error
	ExclamationTriangleIcon, // Error Icon
	InformationCircleIcon, // Help Text Icon
} from "@heroicons/react/24/outline";

// Helper component for form fields
const FormField = ({
	label,
	id,
	children,
	required = false,
	helpText = null,
	error = null,
	className = "",
}) => (
	<div className={className}>
		<label
			htmlFor={id}
			className="mb-1 block text-xs font-medium text-slate-700"
		>
			{" "}
			{/* Adjusted label size */}
			{label} {required && <span className="text-red-500">*</span>}
		</label>
		{children}
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
	required: PropTypes.bool,
	helpText: PropTypes.string,
	error: PropTypes.string,
	className: PropTypes.string,
};

// Helper components for table styling
const Th = ({ children, align = "left", className = "" }) => (
	<th
		scope="col"
		className={`whitespace-nowrap px-4 py-2 text-${align} text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`}
	>
		{children}
	</th>
);
Th.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	className: PropTypes.string,
};

const Td = ({ children, align = "left", className = "" }) => (
	<td
		className={`px-4 py-2.5 text-${align} text-xs text-slate-600 ${className}`}
	>
		{" "}
		{/* Adjusted padding/size */}
		{children}
	</td>
);
Td.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	className: PropTypes.string,
};

// Helper: Format date string
const formatDate = (dateString) => {
	if (!dateString) return "Never";
	try {
		return new Date(dateString).toLocaleString(undefined, {
			dateStyle: "short",
			timeStyle: "short",
		});
	} catch {
		return "Invalid Date";
	}
};

// Helper: Get status pill styling
const getStatusPill = (status) => {
	const lowerStatus = status?.toLowerCase();
	const baseClasses =
		"px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1 border";
	if (lowerStatus === "online") {
		return (
			<span
				className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}
			>
				<CheckCircleIcon className="h-3 w-3" /> ONLINE
			</span>
		);
	} else {
		// offline or unknown
		return (
			<span
				className={`${baseClasses} bg-slate-100 text-slate-600 border-slate-200`}
			>
				<XCircleIcon className="h-3 w-3" />{" "}
				{String(status || "OFFLINE").toUpperCase()}
			</span>
		);
	}
};

export default function PaymentTerminalSettings() {
	const [terminals, setTerminals] = useState([]);
	const [locations, setLocations] = useState([]);
	const [isLoading, setIsLoading] = useState(true); // For fetching terminals/locations
	const [isSyncing, setIsSyncing] = useState(false);
	const [isRegistering, setIsRegistering] = useState(false);
	const [error, setError] = useState(null); // General/fetch error
	const [formError, setFormError] = useState(null); // Registration form error
	const [successMessage, setSuccessMessage] = useState(null);
	const [showRegisterForm, setShowRegisterForm] = useState(false);

	// Registration form state
	const [selectedLocation, setSelectedLocation] = useState("");
	const [registrationCode, setRegistrationCode] = useState("");
	const [readerLabel, setReaderLabel] = useState("");

	// Fetch initial data
	const fetchData = useCallback(async (showLoading = true) => {
		if (showLoading) setIsLoading(true);
		setError(null);
		try {
			const [locationsData, terminalsData] = await Promise.all([
				settingsService.getLocations(),
				settingsService.getTerminalReaders(),
			]);
			setLocations(Array.isArray(locationsData) ? locationsData : []);
			setTerminals(Array.isArray(terminalsData) ? terminalsData : []);
		} catch (err) {
			console.error("Error fetching settings data:", err);
			setError("Failed to load locations or terminals. Please try refreshing.");
			setLocations([]);
			setTerminals([]);
		} finally {
			if (showLoading) setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Sync locations and terminals with Stripe
	const syncWithStripe = async () => {
		setIsSyncing(true);
		setError(null);
		setSuccessMessage(null);
		try {
			// Sync both locations and readers sequentially or in parallel if API allows
			await settingsService.syncLocations(); // Sync locations first
			const result = await settingsService.syncReaders(); // Then sync readers
			const message =
				result.message ||
				"Locations and Terminals synced with Stripe successfully!";
			setSuccessMessage(message);
			toast.success(message);
			await fetchData(false); // Refresh lists without main loading indicator
		} catch (err) {
			console.error("Error syncing with Stripe:", err);
			const message =
				err.response?.data?.error || "Failed to sync with Stripe.";
			setError(message);
			toast.error(message);
		} finally {
			setIsSyncing(false);
		}
	};

	// Handle registration form submission
	const registerNewTerminal = async (e) => {
		e.preventDefault(); // Prevent default form submission
		setFormError(null); // Clear previous form errors
		setSuccessMessage(null);

		if (!selectedLocation || !readerLabel || !registrationCode) {
			setFormError("Please fill in all required fields for registration.");
			return;
		}

		setIsRegistering(true);
		try {
			await settingsService.registerTerminalReader({
				location: selectedLocation, // Send ID
				label: readerLabel.trim(),
				registration_code: registrationCode.trim(),
			});
			const message = `Terminal "${readerLabel.trim()}" registered successfully!`;
			setSuccessMessage(message);
			toast.success(message);
			// Reset form and hide
			setSelectedLocation("");
			setReaderLabel("");
			setRegistrationCode("");
			setShowRegisterForm(false);
			await fetchData(false); // Refresh terminal list
		} catch (err) {
			console.error("Error registering terminal:", err);
			const message =
				err.response?.data?.error || "Failed to register terminal.";
			setFormError(message); // Show error specific to the form
			toast.error(message);
		} finally {
			setIsRegistering(false);
		}
	};

	// --- Render Logic ---
	return (
		<div className="p-4 sm:p-6">
			{/* Section Header */}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
				<h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
					<DeviceTabletIcon className="h-5 w-5 text-blue-600" />
					Payment Terminal Management
				</h2>
				<div className="flex flex-shrink-0 gap-2">
					<button
						onClick={() => setShowRegisterForm(!showRegisterForm)}
						className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isSyncing || isLoading || isRegistering}
					>
						{showRegisterForm ? (
							<XCircleIcon className="h-4 w-4" /> // Show Cancel icon when form is open
						) : (
							<PlusIcon className="h-4 w-4" /> // Show Add icon when form is closed
						)}
						{showRegisterForm ? "Cancel Registration" : "Register Terminal"}
					</button>
					<button
						onClick={syncWithStripe}
						className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isSyncing || isLoading || isRegistering}
					>
						<ArrowPathIcon
							className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
						/>
						{isSyncing ? "Syncing..." : "Sync with Stripe"}
					</button>
				</div>
			</div>

			{/* Error/Success Messages */}
			{error && (
				<div
					role="alert"
					className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
				>
					<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
					<span>{error}</span>
				</div>
			)}
			{successMessage && (
				<div
					role="alert"
					className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700"
				>
					<CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
					<span>{successMessage}</span>
				</div>
			)}

			{/* Collapsible Registration Form */}
			{showRegisterForm && (
				<form
					onSubmit={registerNewTerminal}
					className="mb-6 rounded-lg border border-slate-300 bg-slate-50 p-4"
				>
					<h3 className="mb-3 text-base font-medium text-slate-800">
						Register New Terminal
					</h3>
					{formError && ( // Display form-specific errors here
						<div
							role="alert"
							className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700"
						>
							<ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
							<span>{formError}</span>
						</div>
					)}
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
						<FormField
							label="Location"
							id="location"
							required
							className="md:col-span-1 lg:col-span-1"
						>
							<select
								id="location"
								value={selectedLocation}
								onChange={(e) => setSelectedLocation(e.target.value)}
								required
								className="block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
							>
								<option
									value=""
									disabled
								>
									Select location...
								</option>
								{locations.map((loc) => (
									<option
										key={loc.id}
										value={loc.id}
									>
										{loc.display_name}
									</option>
								))}
							</select>
						</FormField>
						<FormField
							label="Terminal Name"
							id="readerLabel"
							required
							className="md:col-span-1 lg:col-span-1"
						>
							<input
								type="text"
								id="readerLabel"
								value={readerLabel}
								onChange={(e) => setReaderLabel(e.target.value)}
								required
								placeholder="e.g., Front Counter"
								className="block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
							/>
						</FormField>
						<FormField
							label="Registration Code"
							id="registrationCode"
							required
							helpText="Find this on the terminal screen during setup."
							className="md:col-span-1 lg:col-span-1"
						>
							<input
								type="text"
								id="registrationCode"
								value={registrationCode}
								onChange={(e) => setRegistrationCode(e.target.value)}
								required
								placeholder="e.g., cool-cactus-choice"
								className="block w-full rounded-md border-0 px-3 py-1.5 font-mono text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 placeholder:normal-case placeholder:font-sans focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:leading-6"
							/>
						</FormField>
						<div className="flex items-end md:col-span-3 lg:col-span-1">
							<button
								type="submit"
								disabled={
									isRegistering ||
									!selectedLocation ||
									!readerLabel ||
									!registrationCode
								}
								className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-blue-400"
							>
								{isRegistering ? (
									<>
										<svg
											className="animate-spin -ml-0.5 mr-1.5 h-4 w-4 text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Registering...
									</>
								) : (
									"Register"
								)}
							</button>
						</div>
					</div>
				</form>
			)}

			{/* Terminals List Table */}
			<div className="overflow-x-auto">
				{
					isLoading && terminals.length === 0 ? (
						<div className="py-10 text-center text-sm text-slate-500">
							Loading terminals...
						</div>
					) : !isLoading && terminals.length === 0 && !error ? (
						<div className="py-10 text-center text-sm text-slate-500">
							No terminal readers found. Register one above or sync with Stripe.
						</div>
					) : terminals.length > 0 ? (
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50">
								<tr>
									<Th>Name</Th>
									<Th>Device ID</Th>
									<Th>Location</Th>
									<Th>Status</Th>
									<Th>Device Type</Th>
									<Th>Last Seen</Th>
									{/* Add Actions column if needed (e.g., delete) */}
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 bg-white">
								{terminals.map((terminal) => (
									<tr
										key={terminal.id}
										className="hover:bg-slate-50/50"
									>
										<Td className="font-medium text-slate-800">
											{terminal.label}
										</Td>
										<Td className="font-mono text-xs">
											{terminal.stripe_reader_id || terminal.id}
										</Td>
										<Td>
											{terminal.location_display || (
												<span className="italic text-slate-400">Unknown</span>
											)}
										</Td>
										<Td>{getStatusPill(terminal.status)}</Td>
										<Td>
											{terminal.device_type || (
												<span className="italic text-slate-400">Unknown</span>
											)}
										</Td>
										<Td>{formatDate(terminal.last_seen)}</Td>
										{/* Add action buttons here if delete/edit functionality exists */}
									</tr>
								))}
							</tbody>
						</table>
					) : null /* Error case handled above */
				}
			</div>
		</div>
	);
}
