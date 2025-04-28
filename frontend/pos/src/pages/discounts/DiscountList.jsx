import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types"; // Import PropTypes
import { discountService } from "../../api/services/discountService";
import { authService } from "../../api/services/authService";
import { useApi } from "../../api/hooks/useApi";
import {
	TagIcon,
	PlusIcon,
	PencilSquareIcon,
	TrashIcon,
	CalendarDaysIcon, // Updated icon
	Bars3Icon, // For dashboard button
	BuildingStorefrontIcon, // For permanent discounts
	ExclamationTriangleIcon, // For errors
	ArrowPathIcon, // For retry
	InformationCircleIcon, // For info footer
	CheckCircleIcon, // For active status
	XCircleIcon, // For inactive status
	ArchiveBoxXMarkIcon, // For expired status
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import ConfirmationModal from "../../components/ConfirmationModal"; // Assuming this is styled appropriately

// Helper: Format date string
const formatDate = (dateString) => {
	if (!dateString) return "N/A";
	try {
		// Only show date part
		return new Date(dateString).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch (e) {
		console.warn("Invalid date format:", dateString, e);
		return "Invalid Date";
	}
};

// Helper: Format discount value
const formatValue = (discount) => {
	if (!discount) return "N/A";
	if (discount.discount_type === "percentage") {
		return `${discount.value}%`;
	} else if (discount.discount_type === "fixed") {
		// Use Intl.NumberFormat for currency
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(discount.value);
	}
	return String(discount.value); // Fallback
};

// Helper: Get discount type label
const getDiscountTypeLabel = (discount) => {
	if (!discount) return "Unknown";
	const type =
		discount.discount_type === "percentage" ? "Percentage" : "Fixed Amount";
	let appliesTo = "";
	switch (discount.apply_to) {
		case "order":
			appliesTo = "Order";
			break;
		case "product":
			appliesTo = "Product(s)";
			break;
		case "category":
			appliesTo = "Category(s)";
			break;
		default:
			appliesTo = "Unknown Target";
	}
	return `${type} / ${appliesTo}`;
};

// Helper: Get status pill styling
const getStatusPill = (isActive) => {
	const baseClasses =
		"px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1 border";
	if (isActive) {
		return (
			<span
				className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}
			>
				<CheckCircleIcon className="h-3 w-3" /> ACTIVE
			</span>
		);
	} else {
		return (
			<span
				className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-200`}
			>
				<XCircleIcon className="h-3 w-3" /> INACTIVE
			</span>
		);
	}
};

// Helper: Get category/schedule pill styling
const getCategoryPill = (discount) => {
	const baseClasses =
		"px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 border";
	if (discount.discount_category === "permanent") {
		return (
			<span
				className={`${baseClasses} bg-indigo-50 text-indigo-700 border-indigo-200`}
			>
				<BuildingStorefrontIcon className="h-3 w-3" /> PERMANENT
			</span>
		);
	} else if (discount.start_date || discount.end_date) {
		return (
			<span className={`${baseClasses} bg-sky-50 text-sky-700 border-sky-200`}>
				<CalendarDaysIcon className="h-3 w-3" /> SCHEDULED
			</span>
		);
	}
	// Default promotional without dates (should ideally have dates)
	return (
		<span
			className={`${baseClasses} bg-orange-50 text-orange-700 border-orange-200`}
		>
			<TagIcon className="h-3 w-3" /> PROMOTIONAL
		</span>
	);
};

export default function DiscountList() {
	const navigate = useNavigate();
	// Use isLoading state from useApi for data fetching indication
	// eslint-disable-next-line no-unused-vars
	const { execute, isLoading: isApiLoading, error: apiError } = useApi();

	// State variables
	const [discounts, setDiscounts] = useState([]);
	const [filteredDiscounts, setFilteredDiscounts] = useState([]);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentDiscount, setCurrentDiscount] = useState(null); // Discount selected for deletion
	const [filter, setFilter] = useState("all"); // Filter type: all, active, inactive, scheduled, permanent
	const [isAdmin, setIsAdmin] = useState(false);
	const [userName, setUserName] = useState("");
	const [fetchError, setFetchError] = useState(null); // Specific error state for fetching

	// Summary stats state
	const [stats, setStats] = useState({
		activeCount: 0,
		upcomingCount: 0,
		expiredCount: 0,
		permanentCount: 0,
	});

	// Fetch discounts and user status on component mount
	const fetchData = useCallback(async () => {
		setFetchError(null); // Clear previous fetch errors
		try {
			// Fetch discounts and auth status in parallel
			const [discountsResponse, authResponse] = await Promise.all([
				execute(() => discountService.getDiscounts()),
				execute(() => authService.checkStatus()),
			]);

			const discountData = Array.isArray(discountsResponse)
				? discountsResponse
				: [];
			setDiscounts(discountData); // Store all fetched discounts

			// Set user info
			setIsAdmin(authResponse.is_admin);
			setUserName(authResponse.username);

			// Calculate stats
			const now = new Date();
			let active = 0;
			let upcoming = 0;
			let expired = 0;
			let permanent = 0;

			discountData.forEach((discount) => {
				const startDate = discount.start_date
					? new Date(discount.start_date)
					: null;
				const endDate = discount.end_date ? new Date(discount.end_date) : null;
				const isActiveNow =
					discount.is_active &&
					(!startDate || startDate <= now) &&
					(!endDate || endDate >= now);

				if (discount.discount_category === "permanent" && discount.is_active) {
					permanent++;
					if (isActiveNow) active++; // Permanent active counts towards overall active
				} else if (discount.discount_category === "promotional") {
					if (startDate && startDate > now && discount.is_active) {
						upcoming++;
					} else if (endDate && endDate < now) {
						// Expired discounts might still be marked is_active=true in DB, check date
						expired++;
					} else if (isActiveNow) {
						active++;
					}
				} else if (isActiveNow) {
					// Handle potential other categories if added later
					active++;
				}
			});

			setStats({
				activeCount: active,
				upcomingCount: upcoming,
				expiredCount: expired,
				permanentCount: permanent,
			});
		} catch (error) {
			console.error("Error fetching data:", error);
			setFetchError(
				"Failed to load discounts. Please check connection or try again."
			);
			setDiscounts([]); // Clear discounts on error
			setStats({
				activeCount: 0,
				upcomingCount: 0,
				expiredCount: 0,
				permanentCount: 0,
			}); // Reset stats
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [execute]); // Dependency array includes execute from useApi

	// Initial data fetch
	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Apply filtering whenever discounts or filter type changes
	useEffect(() => {
		const now = new Date();
		const filtered = discounts.filter((discount) => {
			const startDate = discount.start_date
				? new Date(discount.start_date)
				: null;
			const endDate = discount.end_date ? new Date(discount.end_date) : null;
			const isActiveNow =
				discount.is_active &&
				(!startDate || startDate <= now) &&
				(!endDate || endDate >= now);
			const isUpcoming = discount.is_active && startDate && startDate > now;
			const isExpired = endDate && endDate < now;

			switch (filter) {
				case "active":
					return isActiveNow;
				case "inactive":
					return !discount.is_active || isExpired; // Inactive OR Expired
				case "scheduled":
					return (
						discount.discount_category === "promotional" &&
						(startDate || endDate)
					);
				case "permanent":
					return discount.discount_category === "permanent";
				case "upcoming":
					return isUpcoming;
				case "expired":
					return isExpired;
				case "all":
				default:
					return true;
			}
		});
		setFilteredDiscounts(filtered);
	}, [discounts, filter]);

	// Handler to open delete confirmation modal
	const handleDeleteDiscount = (discount) => {
		setCurrentDiscount(discount);
		setShowDeleteModal(true);
	};

	// Handler to confirm deletion
	const handleConfirmDelete = async () => {
		if (!currentDiscount) return;

		try {
			// Use execute from useApi for consistent loading/error handling
			await execute(() => discountService.deleteDiscount(currentDiscount.id), {
				successMessage: `Discount "${currentDiscount.name}" deleted successfully`,
				errorMessage: "Failed to delete discount",
			});

			// Refetch data to update list and stats after successful deletion
			fetchData();
			setShowDeleteModal(false);
			setCurrentDiscount(null);
		} catch (error) {
			// Error handled by useApi, toast might already be shown
			console.error("Error deleting discount:", error);
			// Optionally show a specific error toast here if useApi doesn't cover it
			// toast.error("Could not delete discount. Please try again.");
		} finally {
			setShowDeleteModal(false); // Ensure modal closes even on error
		}
	};

	// --- UI Rendering ---

	// Loading state during initial fetch
	if (isApiLoading && discounts.length === 0 && !fetchError) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-slate-100">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	// Tab button styles
	const tabButtonBase =
		"flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1";
	const tabButtonActive = "bg-orange-600 text-white shadow-sm";
	const tabButtonInactive =
		"bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700";
	// Action button styles
	const actionButtonClass =
		"p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-orange-400";

	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 p-4 text-slate-900 sm:p-6">
			{/* Header Section */}
			<header className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 sm:text-2xl">
					<TagIcon className="h-6 w-6 text-orange-500" />
					Discount Management
				</h1>
				<div className="flex items-center gap-3">
					{isAdmin && (
						<button
							onClick={() => navigate("/discounts/create")}
							className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
						>
							<PlusIcon className="h-4 w-4" />
							Add Discount
						</button>
					)}
					<button
						className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						onClick={() => navigate("/dashboard")}
					>
						<Bars3Icon className="h-4 w-4" />
						<span className="hidden sm:inline">Dashboard</span>
					</button>
				</div>
			</header>

			{/* Stats Summary */}
			<div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
				<StatCard
					title="Active Now"
					value={stats.activeCount}
					icon={CheckCircleIcon}
					color="green"
				/>
				<StatCard
					title="Permanent"
					value={stats.permanentCount}
					icon={BuildingStorefrontIcon}
					color="indigo"
				/>
				<StatCard
					title="Upcoming"
					value={stats.upcomingCount}
					icon={CalendarDaysIcon}
					color="sky"
				/>
				<StatCard
					title="Expired"
					value={stats.expiredCount}
					icon={ArchiveBoxXMarkIcon}
					color="slate"
				/>
			</div>

			{/* Filter Tabs */}
			<div className="mb-4 flex-shrink-0 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
				<div className="flex flex-wrap gap-1.5">
					{[
						{ key: "all", label: "All Discounts" },
						{ key: "active", label: "Active Now" },
						{ key: "permanent", label: "Permanent" },
						{ key: "scheduled", label: "Scheduled" },
						{ key: "upcoming", label: "Upcoming" },
						{ key: "expired", label: "Expired" },
						{ key: "inactive", label: "Inactive" },
					].map((item) => (
						<button
							key={item.key}
							className={`${tabButtonBase} ${
								filter === item.key ? tabButtonActive : tabButtonInactive
							}`}
							onClick={() => setFilter(item.key)}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>

			{/* Discounts List Area */}
			<div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
				{/* Show loading overlay only when actively making API calls (useApi loading state) */}
				{isApiLoading && discounts.length > 0 && (
					<div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
						<LoadingSpinner size="md" />
					</div>
				)}

				{fetchError ? (
					// Error state when fetching fails
					<div className="flex h-full flex-col items-center justify-center p-6 text-center">
						<ExclamationTriangleIcon className="mb-2 h-8 w-8 text-red-400" />
						<p className="mb-3 text-sm text-red-600">{fetchError}</p>
						<button
							onClick={fetchData} // Retry button
							disabled={isApiLoading}
							className="flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
						>
							<ArrowPathIcon className="h-3.5 w-3.5" /> Retry
						</button>
					</div>
				) : (
					// Table display
					<div className="custom-scrollbar h-full overflow-auto">
						<table className="min-w-full divide-y divide-slate-100">
							<thead className="sticky top-0 z-10 bg-slate-50">
								<tr>
									<Th>Name / Category</Th>
									<Th>Code</Th>
									<Th>Type / Applies To</Th>
									<Th>Value</Th>
									<Th>Dates</Th>
									<Th>Status</Th>
									<Th align="right">Actions</Th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 bg-white">
								{filteredDiscounts.length === 0 ? (
									<tr>
										<td
											colSpan="7"
											className="p-8 text-center text-sm text-slate-500"
										>
											No discounts match the current filters.
										</td>
									</tr>
								) : (
									filteredDiscounts.map((discount) => (
										<tr
											key={discount.id}
											className="transition-colors hover:bg-slate-50/50"
										>
											{/* Name & Category */}
											<Td>
												<div className="font-medium text-slate-800">
													{discount.name}
												</div>
												<div className="mt-0.5">
													{getCategoryPill(discount)}
												</div>
											</Td>
											{/* Code */}
											<Td>
												{discount.code ? (
													<span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
														{discount.code}
													</span>
												) : (
													<span className="text-xs italic text-slate-400">
														Auto
													</span>
												)}
											</Td>
											{/* Type / Applies To */}
											<Td>
												<span className="text-xs text-slate-600">
													{getDiscountTypeLabel(discount)}
												</span>
											</Td>
											{/* Value */}
											<Td isHeader>{formatValue(discount)}</Td>
											{/* Dates */}
											<Td>
												{discount.start_date || discount.end_date ? (
													<>
														{discount.start_date && (
															<div className="text-xs">
																Start: {formatDate(discount.start_date)}
															</div>
														)}
														{discount.end_date && (
															<div className="text-xs mt-0.5">
																End: {formatDate(discount.end_date)}
															</div>
														)}
													</>
												) : (
													<span className="text-xs italic text-slate-400">
														Always
													</span>
												)}
											</Td>
											{/* Status */}
											<Td>{getStatusPill(discount.is_active)}</Td>
											{/* Actions */}
											<Td align="right">
												<button
													onClick={() =>
														navigate(`/discounts/edit/${discount.id}`)
													}
													className={`${actionButtonClass} mr-1`}
													title="Edit Discount"
													disabled={isApiLoading} // Disable actions during API calls
												>
													<PencilSquareIcon className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleDeleteDiscount(discount)}
													className={`${actionButtonClass} text-red-500 hover:bg-red-50 hover:text-red-700 focus:ring-red-400`}
													title="Delete Discount"
													disabled={isApiLoading} // Disable actions during API calls
												>
													<TrashIcon className="h-4 w-4" />
												</button>
											</Td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Status Bar */}
			<footer className="mt-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs shadow-sm">
				<span className="flex items-center gap-2 text-slate-600">
					<InformationCircleIcon className="h-3.5 w-3.5 text-slate-400" />
					<span>Showing: {filteredDiscounts.length} discount(s)</span>
				</span>
				<span className="text-slate-500">
					User: <span className="font-medium text-slate-700">{userName}</span> (
					<span className="font-medium text-slate-700">
						{isAdmin ? "Admin" : "Staff"}
					</span>
					)
				</span>
			</footer>

			{/* Delete Confirmation Modal */}
			{showDeleteModal && currentDiscount && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={handleConfirmDelete}
					title="Delete Discount"
					message={`Are you sure you want to delete the discount "${currentDiscount.name}"? This action cannot be undone.`}
					confirmButtonText={isApiLoading ? "Deleting..." : "Delete"} // Show loading state on button
					confirmButtonClass="bg-red-600 hover:bg-red-700 disabled:bg-red-300"
					isConfirmDisabled={isApiLoading} // Disable confirm button during API call
				/>
			)}
		</div>
	);
}

// --- Helper Components ---

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color = "gray" }) => {
	const colors = {
		green: {
			bg: "bg-emerald-50",
			text: "text-emerald-600",
			iconBg: "bg-emerald-100",
		},
		sky: { bg: "bg-sky-50", text: "text-sky-600", iconBg: "bg-sky-100" },
		slate: {
			bg: "bg-slate-50",
			text: "text-slate-600",
			iconBg: "bg-slate-100",
		},
		indigo: {
			bg: "bg-indigo-50",
			text: "text-indigo-600",
			iconBg: "bg-indigo-100",
		},
	};
	const selectedColor = colors[color] || colors.slate;

	return (
		<div
			className={`flex items-center rounded-lg border border-slate-200 ${selectedColor.bg} p-3 shadow-sm`}
		>
			<div
				className={`mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${selectedColor.iconBg} ${selectedColor.text}`}
			>
				<Icon className="h-4 w-4" />
			</div>
			<div>
				<dt className="truncate text-xs font-medium text-slate-500">{title}</dt>
				<dd className="text-xl font-semibold text-slate-800">{value}</dd>
			</div>
		</div>
	);
};
StatCard.propTypes = {
	title: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	icon: PropTypes.elementType.isRequired,
	color: PropTypes.string,
};

// Table Header Cell Component
const Th = ({ children, align = "left" }) => (
	<th
		scope="col"
		className={`whitespace-nowrap px-4 py-2.5 text-${align} text-xs font-semibold uppercase tracking-wider text-slate-500`}
	>
		{children}
	</th>
);
Th.propTypes = { children: PropTypes.node, align: PropTypes.string };

// Table Data Cell Component
const Td = ({ children, align = "left", isHeader = false }) => (
	<td
		className={`px-4 py-2.5 text-${align} text-xs ${
			isHeader ? "font-medium text-slate-800" : "text-slate-600"
		}`}
	>
		{children}
	</td>
);
Td.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	isHeader: PropTypes.bool,
};
