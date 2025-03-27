// pages/settings/PaymentTerminalSettings.jsx
import { useState, useEffect } from "react";
import { settingsService } from "../../api/services/settingsService";
import { DeviceTabletIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

export default function PaymentTerminalSettings() {
	const [terminals, setTerminals] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [error, setError] = useState(null);
	const [successMessage, setSuccessMessage] = useState(null);
	const [selectedLocation, setSelectedLocation] = useState("");
	const [registrationCode, setRegistrationCode] = useState("");
	const [readerLabel, setReaderLabel] = useState("");
	const [locations, setLocations] = useState([]);
	const [isRegistering, setIsRegistering] = useState(false);
	const [showRegisterForm, setShowRegisterForm] = useState(false);

	useEffect(() => {
		fetchLocations();
		fetchTerminals();
	}, []);

	const fetchLocations = async (syncWithStripe = false) => {
		try {
			const data = await settingsService.getLocations(syncWithStripe);
			setLocations(data);
		} catch (err) {
			console.error("Error fetching locations:", err);
		}
	};

	const fetchTerminals = async (syncWithStripe = false) => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await settingsService.getTerminalReaders(syncWithStripe);
			setTerminals(data);
		} catch (err) {
			console.error("Error fetching terminals:", err);
			setError("Failed to load terminal readers. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const syncWithStripe = async () => {
		setIsSyncing(true);
		setError(null);
		setSuccessMessage(null);

		try {
			// Sync both locations and readers
			await settingsService.syncLocations();
			const result = await settingsService.syncReaders();
			setSuccessMessage(result.message);

			// Fetch the updated lists
			await fetchLocations();
			await fetchTerminals();
		} catch (err) {
			console.error("Error syncing with Stripe:", err);
			setError(
				err.response?.data?.error ||
					"Failed to sync with Stripe. Please try again."
			);
		} finally {
			setIsSyncing(false);
		}
	};

	const registerNewTerminal = async () => {
		if (!selectedLocation) {
			setError("Please select a location for the new terminal");
			return;
		}

		if (!readerLabel) {
			setError("Please enter a name for the terminal");
			return;
		}

		if (!registrationCode) {
			setError("Please enter the registration code");
			return;
		}

		setIsRegistering(true);
		setError(null);
		setSuccessMessage(null);

		try {
			await settingsService.registerTerminalReader({
				location: selectedLocation,
				label: readerLabel,
				registration_code: registrationCode,
			});

			// Clear form fields
			setSelectedLocation("");
			setReaderLabel("");
			setRegistrationCode("");
			setShowRegisterForm(false);

			// Show success message
			setSuccessMessage("Terminal reader registered successfully!");

			// Refresh terminal list
			fetchTerminals();
		} catch (err) {
			console.error("Error registering terminal:", err);
			setError(
				err.response?.data?.error ||
					"Failed to register terminal. Please try again."
			);
		} finally {
			setIsRegistering(false);
		}
	};

	const handleLocationChange = (e) => {
		setSelectedLocation(e.target.value);
	};

	const handleLabelChange = (e) => {
		setReaderLabel(e.target.value);
	};

	const handleRegistrationCodeChange = (e) => {
		setRegistrationCode(e.target.value);
	};

	return (
		<div className="p-6">
			{/* Page header with action buttons */}
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold text-slate-800">
					Payment Terminal Management
				</h2>

				<div className="flex space-x-3">
					<button
						onClick={() => setShowRegisterForm(!showRegisterForm)}
						className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
					>
						<DeviceTabletIcon className="h-4 w-4" />
						{showRegisterForm ? "Cancel" : "Register Terminal"}
					</button>
					<button
						onClick={syncWithStripe}
						className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
						disabled={isSyncing || isLoading}
					>
						<ArrowPathIcon
							className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
						/>
						{isSyncing ? "Syncing..." : "Sync with Stripe"}
					</button>
				</div>
			</div>

			{error && (
				<div className="mb-3 p-2 bg-red-50 text-red-700 rounded-lg flex items-center text-sm">
					<XCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
					{error}
				</div>
			)}

			{successMessage && (
				<div className="mb-3 p-2 bg-green-50 text-green-700 rounded-lg flex items-center text-sm">
					<CheckCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
					{successMessage}
				</div>
			)}

			{/* Collapsible Registration Form */}
			{showRegisterForm && (
				<div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
					<div className="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div className="md:col-span-4">
							<label className="block text-xs font-medium text-slate-700 mb-1">
								Location *
							</label>
							<select
								value={selectedLocation}
								onChange={handleLocationChange}
								className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
								required
							>
								<option value="">Select a location</option>
								{locations.map((location) => (
									<option
										key={location.id}
										value={location.id}
									>
										{location.display_name}
									</option>
								))}
							</select>
						</div>

						<div className="md:col-span-3">
							<label className="block text-xs font-medium text-slate-700 mb-1">
								Terminal Name *
							</label>
							<input
								type="text"
								value={readerLabel}
								onChange={handleLabelChange}
								className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
								placeholder="e.g., Front Counter"
								required
							/>
						</div>

						<div className="md:col-span-3">
							<label className="block text-xs font-medium text-slate-700 mb-1">
								Registration Code *
							</label>
							<input
								type="text"
								value={registrationCode}
								onChange={handleRegistrationCodeChange}
								className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
								placeholder="e.g., simulated-wpe"
								required
							/>
						</div>

						<div className="md:col-span-2 flex items-end">
							<button
								onClick={registerNewTerminal}
								className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
								disabled={
									isRegistering ||
									!selectedLocation ||
									!readerLabel ||
									!registrationCode
								}
							>
								{isRegistering ? "Registering..." : "Register"}
							</button>
						</div>
					</div>
					<p className="text-xs text-slate-500 mt-2">
						For testing, use registration code: &quot;simulated-wpe&quot;
					</p>
				</div>
			)}

			{/* Terminals List */}
			<div className="flex-1 overflow-auto bg-white rounded-lg border border-slate-200">
				<div className="flex justify-between items-center p-3 border-b border-slate-200">
					<h3 className="text-base font-medium text-slate-800">
						Terminal Readers
					</h3>
					<span className="text-xs text-slate-500">
						{terminals.length}{" "}
						{terminals.length === 1 ? "terminal" : "terminals"}
					</span>
				</div>

				{isLoading ? (
					<div className="p-6 text-center text-slate-500">
						Loading terminals...
					</div>
				) : terminals.length > 0 ? (
					<div className="overflow-x-auto max-h-[calc(100vh-280px)]">
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50 sticky top-0">
								<tr>
									<th
										scope="col"
										className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Device ID
									</th>
									<th
										scope="col"
										className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Name
									</th>
									<th
										scope="col"
										className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Location
									</th>
									<th
										scope="col"
										className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Status
									</th>
									<th
										scope="col"
										className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Device Type
									</th>
									<th
										scope="col"
										className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Last Seen
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-200">
								{terminals.map((terminal) => (
									<tr
										key={terminal.id}
										className="hover:bg-slate-50"
									>
										<td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-slate-800">
											{terminal.stripe_reader_id || terminal.id}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
											{terminal.label}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
											{terminal.location_display || "Unknown"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-xs">
											<span
												className={`px-2 py-0.5 rounded-full text-xs font-medium ${
													terminal.status === "online"
														? "bg-green-50 text-green-700"
														: "bg-yellow-50 text-yellow-700"
												}`}
											>
												{terminal.status || "offline"}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
											{terminal.device_type || "Unknown"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
											{terminal.last_seen
												? new Date(terminal.last_seen).toLocaleString()
												: "Never"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="p-6 text-center text-slate-500">
						No terminal readers found. Register a terminal to get started with
						in-person payments.
					</div>
				)}
			</div>
		</div>
	);
}
