// pages/settings/LocationManagement.jsx
import { useState, useEffect } from "react";
import axiosInstance from "../../api/config/axiosConfig";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/solid";
import { MapPinIcon, PlusCircleIcon } from "@heroicons/react/24/outline";

export default function LocationManagement() {
	const [locations, setLocations] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isAddingLocation, setIsAddingLocation] = useState(false);
	const [editingLocation, setEditingLocation] = useState(null);

	// Form states
	const [formData, setFormData] = useState({
		display_name: "",
		address_line1: "",
		address_line2: "",
		city: "",
		state: "",
		country: "US",
		postal_code: "",
	});

	// Fetch locations on component mount
	useEffect(() => {
		fetchLocations();
	}, []);

	const fetchLocations = async () => {
		setIsLoading(true);
		try {
			const response = await axiosInstance.get("payments/terminal/locations/");
			setLocations(response.data);
			setError(null);
		} catch (err) {
			console.error("Error fetching locations:", err);
			setError("Failed to load locations. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			if (editingLocation) {
				// Update existing location
				await axiosInstance.put(
					`/terminal/locations/${editingLocation.id}/`,
					formData
				);
			} else {
				// Create new location
				await axiosInstance.post("payments/terminal/locations/", formData);
			}

			// Reset form and refresh locations
			resetForm();
			fetchLocations();
		} catch (err) {
			console.error("Error saving location:", err);
			setError(
				err.response?.data?.error ||
					"Failed to save location. Please try again."
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleEdit = (location) => {
		setEditingLocation(location);
		setFormData({
			display_name: location.display_name,
			address_line1: location.address.line1,
			address_line2: location.address.line2 || "",
			city: location.address.city,
			state: location.address.state,
			country: location.address.country,
			postal_code: location.address.postal_code,
		});
		setIsAddingLocation(true);
	};

	const handleDelete = async (locationId) => {
		if (!window.confirm("Are you sure you want to delete this location?")) {
			return;
		}

		setIsLoading(true);
		try {
			await axiosInstance.delete(`payments/terminal/locations/${locationId}/`);
			fetchLocations();
		} catch (err) {
			console.error("Error deleting location:", err);
			setError(
				"Failed to delete location. It may be in use by a terminal reader."
			);
		} finally {
			setIsLoading(false);
		}
	};

	const resetForm = () => {
		setFormData({
			display_name: "",
			address_line1: "",
			address_line2: "",
			city: "",
			state: "",
			country: "US",
			postal_code: "",
		});
		setEditingLocation(null);
		setIsAddingLocation(false);
	};

	return (
		<div className="p-6 h-full flex flex-col">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-xl font-semibold text-slate-800 flex items-center">
					<MapPinIcon className="h-6 w-6 mr-2 text-blue-600" />
					Location Management
				</h2>

				<button
					onClick={() => setIsAddingLocation(true)}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
					disabled={isAddingLocation}
				>
					<PlusCircleIcon className="h-5 w-5" />
					Add Location
				</button>
			</div>

			{error && (
				<div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 mr-2"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					{error}
				</div>
			)}

			{isAddingLocation ? (
				<div className="bg-white rounded-lg border border-slate-200 p-6">
					<h3 className="text-lg font-medium mb-4 text-slate-800">
						{editingLocation ? "Edit Location" : "Add New Location"}
					</h3>

					<form
						onSubmit={handleSubmit}
						className="space-y-4"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Location Name *
								</label>
								<input
									type="text"
									name="display_name"
									value={formData.display_name}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									required
									placeholder="Store Location Name"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Country *
								</label>
								<select
									name="country"
									value={formData.country}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									required
								>
									<option value="US">United States</option>
									<option value="CA">Canada</option>
									<option value="MX">Mexico</option>
									{/* Add more countries as needed */}
								</select>
							</div>

							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Address Line 1 *
								</label>
								<input
									type="text"
									name="address_line1"
									value={formData.address_line1}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									required
									placeholder="Street address"
								/>
							</div>

							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Address Line 2
								</label>
								<input
									type="text"
									name="address_line2"
									value={formData.address_line2}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									placeholder="Apt, suite, unit, etc. (optional)"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									City *
								</label>
								<input
									type="text"
									name="city"
									value={formData.city}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									required
									placeholder="City"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									State/Province *
								</label>
								<input
									type="text"
									name="state"
									value={formData.state}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									required
									placeholder="State/Province"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">
									Postal Code *
								</label>
								<input
									type="text"
									name="postal_code"
									value={formData.postal_code}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									required
									placeholder="ZIP/Postal code"
								/>
							</div>
						</div>

						<div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 mt-6">
							<button
								type="button"
								onClick={resetForm}
								className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								disabled={isLoading}
							>
								{isLoading
									? "Saving..."
									: editingLocation
									? "Update Location"
									: "Save Location"}
							</button>
						</div>
					</form>
				</div>
			) : (
				<div className="flex-1 overflow-auto bg-white rounded-lg border border-slate-200">
					{isLoading ? (
						<div className="p-8 text-center text-slate-500">
							Loading locations...
						</div>
					) : locations.length > 0 ? (
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50">
								<tr>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Location Name
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Address
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										City
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										State/Province
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-200">
								{locations.map((location) => (
									<tr
										key={location.id}
										className="hover:bg-slate-50"
									>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
											{location.display_name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{location.address.line1}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{location.address.city}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{location.address.state}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
											<button
												onClick={() => handleEdit(location)}
												className="text-blue-600 hover:text-blue-800 mr-3"
											>
												<PencilSquareIcon className="h-5 w-5" />
											</button>
											<button
												onClick={() => handleDelete(location.id)}
												className="text-red-600 hover:text-red-800"
											>
												<TrashIcon className="h-5 w-5" />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<div className="p-8 text-center text-slate-500">
							No locations found. Add your first location to use with Stripe
							Terminal.
						</div>
					)}
				</div>
			)}
		</div>
	);
}
