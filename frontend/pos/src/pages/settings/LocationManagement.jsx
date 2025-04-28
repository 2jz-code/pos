import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { settingsService } from "../../api/services/settingsService";
import { toast } from "react-toastify";
import {
	TrashIcon,
	PencilSquareIcon,
	MapPinIcon, // Section Icon
	PlusIcon, // Add Button Icon
	ArrowPathIcon, // Sync Button Icon
	CheckIcon, // Save Button Icon
	ExclamationTriangleIcon, // Error Icon
	CheckCircleIcon, // Success Icon
	InformationCircleIcon, // Help Text Icon
} from "@heroicons/react/24/outline"; // Use outline for consistency
import ConfirmationModal from "../../components/ConfirmationModal"; // Assuming this exists and is styled

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
			className="mb-1 block text-sm font-medium text-slate-700"
		>
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
		className={`whitespace-nowrap px-4 py-2.5 text-${align} text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`}
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
		className={`px-4 py-2.5 text-${align} text-sm text-slate-600 ${className}`}
	>
		{children}
	</td>
);
Td.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	className: PropTypes.string,
};

export default function LocationManagement() {
	const [locations, setLocations] = useState([]);
	const [isLoading, setIsLoading] = useState(true); // For fetching/deleting
	const [isSyncing, setIsSyncing] = useState(false);
	const [isSaving, setIsSaving] = useState(false); // For add/edit form submission
	const [error, setError] = useState(null); // General/fetch error
	const [formError, setFormError] = useState(null); // Specific form error
	const [successMessage, setSuccessMessage] = useState(null);
	const [showForm, setShowForm] = useState(false); // Toggle add/edit form visibility
	const [editingLocation, setEditingLocation] = useState(null); // Store location being edited
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [locationToDelete, setLocationToDelete] = useState(null);

	// Initial form state
	const initialFormData = {
		display_name: "",
		address_line1: "",
		address_line2: "",
		city: "",
		state: "",
		country: "US",
		postal_code: "",
	};
	const [formData, setFormData] = useState(initialFormData);

	// Fetch locations on component mount
	const fetchLocations = useCallback(async (showLoading = true) => {
		if (showLoading) setIsLoading(true);
		setError(null);
		try {
			const data = await settingsService.getLocations();
			setLocations(Array.isArray(data) ? data : []);
		} catch (err) {
			console.error("Error fetching locations:", err);
			setError("Failed to load locations. Please try refreshing.");
			setLocations([]); // Ensure it's an array on error
		} finally {
			if (showLoading) setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchLocations();
	}, [fetchLocations]);

	// Sync locations with Stripe
	const syncWithStripe = async () => {
		setIsSyncing(true);
		setError(null);
		setSuccessMessage(null);
		try {
			const result = await settingsService.syncLocations();
			setSuccessMessage(
				result.message || "Locations synced with Stripe successfully!"
			);
			toast.success(result.message || "Locations synced successfully!");
			await fetchLocations(false); // Refresh list without main loading indicator
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

	// Handle form input changes
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData({ ...formData, [name]: value });
		// Clear general form error when user types
		if (formError) setFormError(null);
	};

	// Reset form and hide it
	const resetAndHideForm = () => {
		setFormData(initialFormData);
		setEditingLocation(null);
		setShowForm(false);
		setFormError(null); // Clear form errors on cancel/close
	};

	// Handle opening the form for editing
	const handleEdit = (location) => {
		setEditingLocation(location);
		setFormData({
			display_name: location.display_name || "",
			address_line1: location.address?.line1 || "",
			address_line2: location.address?.line2 || "",
			city: location.address?.city || "",
			state: location.address?.state || "",
			country: location.address?.country || "US",
			postal_code: location.address?.postal_code || "",
		});
		setShowForm(true); // Show the form
		setFormError(null);
	};

	// Handle opening the form for adding
	const handleAdd = () => {
		// resetForm();
		setEditingLocation(null); // Ensure not in edit mode
		setShowForm(true);
	};

	// Handle form submission (Add or Edit)
	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSaving(true);
		setFormError(null);
		setSuccessMessage(null); // Clear previous success messages

		// Basic validation
		if (
			!formData.display_name ||
			!formData.address_line1 ||
			!formData.city ||
			!formData.state ||
			!formData.postal_code ||
			!formData.country
		) {
			setFormError("Please fill in all required fields marked with *");
			setIsSaving(false);
			return;
		}

		try {
			let message = "";
			if (editingLocation) {
				await settingsService.updateLocation(editingLocation.id, formData);
				message = `Location "${formData.display_name}" updated successfully!`;
			} else {
				await settingsService.createLocation(formData);
				message = `Location "${formData.display_name}" created successfully!`;
			}
			setSuccessMessage(message);
			toast.success(message);
			resetAndHideForm();
			await fetchLocations(false); // Refresh list without main loading indicator
		} catch (err) {
			console.error("Error saving location:", err);
			const message =
				err.response?.data?.error ||
				"Failed to save location. Please check the details and try again.";
			setFormError(message); // Set form-specific error
			toast.error(message);
		} finally {
			setIsSaving(false);
		}
	};

	// Handle initiating delete
	const handleDeleteClick = (location) => {
		setLocationToDelete(location);
		setShowDeleteModal(true);
	};

	// Handle confirming delete
	const handleConfirmDelete = async () => {
		if (!locationToDelete) return;

		// Use setIsLoading for delete operation indication
		setIsLoading(true);
		setError(null); // Clear general errors
		setShowDeleteModal(false);

		try {
			await settingsService.deleteLocation(locationToDelete.id);
			toast.success(`Location "${locationToDelete.display_name}" deleted.`);
			setLocationToDelete(null);
			await fetchLocations(false); // Refresh list
		} catch (err) {
			console.error("Error deleting location:", err);
			const message =
				err.response?.data?.error ||
				"Failed to delete location. It might be linked to a terminal.";
			setError(message); // Show error in the main error display
			toast.error(message);
		} finally {
			setIsLoading(false);
		}
	};

	// --- Render Logic ---
	return (
		<div className="p-4 sm:p-6">
			{/* Section Header */}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
				<h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
					<MapPinIcon className="h-5 w-5 text-blue-600" />
					Location Management
				</h2>
				<div className="flex flex-shrink-0 gap-2">
					<button
						onClick={syncWithStripe}
						className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isSyncing || isLoading || isSaving}
					>
						<ArrowPathIcon
							className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
						/>
						{isSyncing ? "Syncing..." : "Sync with Stripe"}
					</button>
					<button
						onClick={handleAdd}
						className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={showForm || isSyncing || isLoading || isSaving} // Disable if form is already open
					>
						<PlusIcon className="h-4 w-4" />
						Add Location
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
			{successMessage &&
				!formError && ( // Show general success only if no form error
					<div
						role="alert"
						className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700"
					>
						<CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
						<span>{successMessage}</span>
					</div>
				)}

			{/* Add/Edit Form */}
			{showForm && (
				<div className="mb-6 rounded-lg border border-slate-300 bg-slate-50 p-4">
					<h3 className="mb-4 text-base font-medium text-slate-800">
						{editingLocation ? "Edit Location" : "Add New Location"}
					</h3>
					{formError && ( // Display form-specific errors here
						<div
							role="alert"
							className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
						>
							<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
							<span>{formError}</span>
						</div>
					)}
					<form
						onSubmit={handleSubmit}
						className="space-y-4"
					>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								label="Location Name"
								id="display_name"
								required
								className="sm:col-span-2"
							>
								<input
									type="text"
									name="display_name"
									id="display_name"
									required
									value={formData.display_name}
									onChange={handleInputChange}
									placeholder="e.g., Downtown Branch"
									className="block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
								/>
							</FormField>
							<FormField
								label="Address Line 1"
								id="address_line1"
								required
								className="sm:col-span-2"
							>
								<input
									type="text"
									name="address_line1"
									id="address_line1"
									required
									value={formData.address_line1}
									onChange={handleInputChange}
									placeholder="123 Main St"
									className="block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
								/>
							</FormField>
							<FormField
								label="Address Line 2"
								id="address_line2"
								helpText="Optional (Apt, Suite, etc.)"
								className="sm:col-span-2"
							>
								<input
									type="text"
									name="address_line2"
									id="address_line2"
									value={formData.address_line2}
									onChange={handleInputChange}
									className="block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
								/>
							</FormField>
							<FormField
								label="City"
								id="city"
								required
							>
								<input
									type="text"
									name="city"
									id="city"
									required
									value={formData.city}
									onChange={handleInputChange}
									className="block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
								/>
							</FormField>
							<FormField
								label="State / Province"
								id="state"
								required
							>
								<input
									type="text"
									name="state"
									id="state"
									required
									value={formData.state}
									onChange={handleInputChange}
									placeholder="e.g., CA or Ontario"
									className="block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
								/>
							</FormField>
							<FormField
								label="Postal Code"
								id="postal_code"
								required
							>
								<input
									type="text"
									name="postal_code"
									id="postal_code"
									required
									value={formData.postal_code}
									onChange={handleInputChange}
									placeholder="e.g., 90210"
									className="block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
								/>
							</FormField>
							<FormField
								label="Country"
								id="country"
								required
							>
								<select
									name="country"
									id="country"
									required
									value={formData.country}
									onChange={handleInputChange}
									className="block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
								>
									<option value="US">United States</option>
									<option value="CA">Canada</option>
									{/* Add other countries if needed */}
								</select>
							</FormField>
						</div>
						<div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
							<button
								type="button"
								onClick={resetAndHideForm}
								disabled={isSaving}
								className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSaving || isLoading}
								className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-blue-400"
							>
								{isSaving ? (
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
										Saving...
									</>
								) : editingLocation ? (
									<>
										<PencilSquareIcon className="-ml-0.5 mr-1 h-4 w-4" />
										Update Location
									</>
								) : (
									<>
										<CheckIcon className="-ml-0.5 mr-1 h-4 w-4" />
										Save Location
									</>
								)}
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Locations List Table */}
			<div className="overflow-x-auto">
				{
					isLoading && locations.length === 0 ? (
						<div className="py-10 text-center text-sm text-slate-500">
							Loading locations...
						</div>
					) : !isLoading && locations.length === 0 && !error ? (
						<div className="py-10 text-center text-sm text-slate-500">
							No locations found. Add one above or sync with Stripe.
						</div>
					) : locations.length > 0 ? (
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50">
								<tr>
									<Th>Location Name</Th>
									<Th>Address</Th>
									<Th>City</Th>
									<Th>State/Province</Th>
									<Th>Postal Code</Th>
									<Th align="right">Actions</Th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 bg-white">
								{locations.map((location) => (
									<tr
										key={location.id}
										className="hover:bg-slate-50/50"
									>
										<Td className="font-medium text-slate-800">
											{location.display_name}
										</Td>
										<Td>
											{location.address?.line1}
											{location.address?.line2
												? `, ${location.address.line2}`
												: ""}
										</Td>
										<Td>{location.address?.city}</Td>
										<Td>{location.address?.state}</Td>
										<Td>{location.address?.postal_code}</Td>
										<Td
											align="right"
											className="whitespace-nowrap"
										>
											<button
												onClick={() => handleEdit(location)}
												className="mr-1 rounded p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
												title="Edit Location"
												disabled={isLoading || isSaving || isSyncing}
											>
												<PencilSquareIcon className="h-4 w-4" />
											</button>
											<button
												onClick={() => handleDeleteClick(location)}
												className="rounded p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-50"
												title="Delete Location"
												disabled={isLoading || isSaving || isSyncing}
											>
												<TrashIcon className="h-4 w-4" />
											</button>
										</Td>
									</tr>
								))}
							</tbody>
						</table>
					) : null /* Error case handled above */
				}
			</div>

			{/* Delete Confirmation */}
			{showDeleteModal && locationToDelete && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={handleConfirmDelete}
					title="Delete Location"
					message={`Are you sure you want to delete the location "${locationToDelete.display_name}"? This might affect associated terminal readers.`}
					confirmButtonText={isLoading ? "Deleting..." : "Delete"}
					confirmButtonClass="bg-red-600 hover:bg-red-700 disabled:bg-red-300"
					isConfirmDisabled={isLoading} // Disable confirm while delete is in progress
				/>
			)}
		</div>
	);
}
