// src/pages/discounts/DiscountList.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { discountService } from "../../api/services/discountService";
import { authService } from "../../api/services/authService";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	TagIcon,
	PlusIcon,
	PencilSquareIcon,
	TrashIcon,
	CalendarIcon,
	ClockIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import ConfirmationModal from "../../components/ConfirmationModal";

export default function DiscountList() {
	const navigate = useNavigate();
	const { execute, isLoading } = useApi();

	const [discounts, setDiscounts] = useState([]);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentDiscount, setCurrentDiscount] = useState(null);
	const [filter, setFilter] = useState("all"); // all, active, inactive, scheduled
	const [isAdmin, setIsAdmin] = useState(false);
	const [userName, setUserName] = useState("");

	// Summary stats
	const [stats, setStats] = useState({
		activeCount: 0,
		upcomingCount: 0,
		expiredCount: 0,
	});

	// Fetch discounts and user status
	useEffect(() => {
		const fetchData = async () => {
			try {
				// Fetch discounts and auth status in parallel
				const [discountsResponse, authResponse] = await Promise.all([
					execute(() => discountService.getDiscounts()),
					execute(() => authService.checkStatus()),
				]);

				const discountData = Array.isArray(discountsResponse)
					? discountsResponse
					: [];
				setDiscounts(discountData);

				// Set user info
				setIsAdmin(authResponse.is_admin);
				setUserName(authResponse.username);

				// Calculate stats
				const now = new Date();
				let active = 0;
				let upcoming = 0;
				let expired = 0;

				discountData.forEach((discount) => {
					if (discount.is_active) {
						const startDate = discount.start_date
							? new Date(discount.start_date)
							: null;
						const endDate = discount.end_date
							? new Date(discount.end_date)
							: null;

						if (startDate && startDate > now) {
							upcoming++;
						} else if (endDate && endDate < now) {
							expired++;
						} else {
							active++;
						}
					}
				});

				setStats({
					activeCount: active,
					upcomingCount: upcoming,
					expiredCount: expired,
				});
			} catch (error) {
				console.error("Error fetching data:", error);
				toast.error("Failed to load discounts");
				setDiscounts([]);
			}
		};

		fetchData();
	}, [execute]);

	const handleDeleteDiscount = (discount) => {
		setCurrentDiscount(discount);
		setShowDeleteModal(true);
	};

	const handleConfirmDelete = async () => {
		if (!currentDiscount) return;

		try {
			await execute(() => discountService.deleteDiscount(currentDiscount.id), {
				successMessage: "Discount deleted successfully",
			});

			setDiscounts(discounts.filter((d) => d.id !== currentDiscount.id));
			setShowDeleteModal(false);
		} catch (error) {
			console.error("Error deleting discount:", error);
		}
	};

	const filteredDiscounts = discounts.filter((discount) => {
		if (filter === "all") return true;
		if (filter === "active") return discount.is_active;
		if (filter === "inactive") return !discount.is_active;
		if (filter === "scheduled") {
			return (
				discount.discount_category === "promotional" &&
				(discount.start_date || discount.end_date)
			);
		}
		if (filter === "permanent") {
			return discount.discount_category === "permanent";
		}

		return true;
	});

	const getDiscountTypeLabel = (discount) => {
		if (discount.apply_to === "order") {
			return "Order-wide";
		} else if (discount.apply_to === "product") {
			return "Product-specific";
		} else if (discount.apply_to === "category") {
			return "Category-wide";
		}
		return "Unknown";
	};

	const formatValue = (discount) => {
		if (discount.discount_type === "percentage") {
			return `${discount.value}%`;
		} else {
			return `$${discount.value.toFixed(2)}`;
		}
	};

	const formatDate = (dateString) => {
		if (!dateString) return "N/A";
		return new Date(dateString).toLocaleDateString();
	};

	const isScheduled = (discount) => {
		return discount.start_date || discount.end_date;
	};

	if (isLoading && discounts.length === 0) {
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
				<h1 className="text-2xl font-bold text-slate-800 flex items-center">
					<TagIcon className="h-6 w-6 text-orange-500 mr-2" />
					Discount Management
				</h1>
				<div className="flex items-center gap-4">
					{isAdmin && (
						<button
							onClick={() => navigate("/discounts/create")}
							className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1.5"
						>
							<PlusIcon className="h-5 w-5" />
							Add Discount
						</button>
					)}
					<button
						className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
						onClick={() => navigate("/dashboard")}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 6h16M4 12h16M4 18h7"
							/>
						</svg>
						Dashboard
					</button>
				</div>
			</div>

			{/* Stats Summary */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-lg shadow-sm p-4">
					<div className="flex items-center">
						<div className="p-2 rounded-full bg-green-100 text-green-600 mr-3">
							<TagIcon className="h-5 w-5" />
						</div>
						<div>
							<p className="text-sm text-gray-500">Active Discounts</p>
							<p className="text-xl font-semibold">{stats.activeCount}</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow-sm p-4">
					<div className="flex items-center">
						<div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
							<CalendarIcon className="h-5 w-5" />
						</div>
						<div>
							<p className="text-sm text-gray-500">Upcoming Discounts</p>
							<p className="text-xl font-semibold">{stats.upcomingCount}</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow-sm p-4">
					<div className="flex items-center">
						<div className="p-2 rounded-full bg-gray-100 text-gray-600 mr-3">
							<ClockIcon className="h-5 w-5" />
						</div>
						<div>
							<p className="text-sm text-gray-500">Expired Discounts</p>
							<p className="text-xl font-semibold">{stats.expiredCount}</p>
						</div>
					</div>
				</div>
			</div>

			{/* Filter Tabs */}
			<div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm">
				<button
					className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
						filter === "all"
							? "bg-orange-600 text-white"
							: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
					}`}
					onClick={() => setFilter("all")}
				>
					All Discounts
				</button>
				<button
					className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
						filter === "permanent"
							? "bg-orange-600 text-white"
							: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
					}`}
					onClick={() => setFilter("permanent")}
				>
					Permanent
				</button>
				<button
					className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
						filter === "scheduled"
							? "bg-orange-600 text-white"
							: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
					}`}
					onClick={() => setFilter("scheduled")}
				>
					Scheduled
				</button>
				<button
					className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
						filter === "active"
							? "bg-orange-600 text-white"
							: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
					}`}
					onClick={() => setFilter("active")}
				>
					Active
				</button>
				<button
					className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
						filter === "inactive"
							? "bg-orange-600 text-white"
							: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
					}`}
					onClick={() => setFilter("inactive")}
				>
					Inactive
				</button>
			</div>

			{/* Discounts List */}
			<div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-200">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Discount Name
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Code
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Type
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Value
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Dates
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-slate-200">
							{filteredDiscounts.length === 0 ? (
								<tr>
									<td
										colSpan="7"
										className="px-6 py-4 text-center text-slate-500"
									>
										No discounts found.
									</td>
								</tr>
							) : (
								filteredDiscounts.map((discount) => (
									<tr
										key={discount.id}
										className="hover:bg-slate-50"
									>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
											{discount.name}
											{isScheduled(discount) && (
												<span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
													<CalendarIcon className="h-3 w-3 mr-1" />
													Scheduled
												</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{discount.code ? (
												<span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">
													{discount.code}
												</span>
											) : (
												<span className="text-slate-400">Auto-applied</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											<span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
												{getDiscountTypeLabel(discount)}
											</span>
											<span className="ml-2 text-xs text-slate-500">
												{discount.discount_type === "percentage"
													? "Percentage"
													: "Fixed Amount"}
											</span>
											{discount.discount_category === "permanent" && (
												<span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600">
													Permanent
												</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
											{formatValue(discount)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
											{discount.start_date && (
												<div className="text-xs">
													<span className="font-medium">Start:</span>{" "}
													{formatDate(discount.start_date)}
												</div>
											)}
											{discount.end_date && (
												<div className="text-xs mt-1">
													<span className="font-medium">End:</span>{" "}
													{formatDate(discount.end_date)}
												</div>
											)}
											{!discount.start_date && !discount.end_date && (
												<span className="text-slate-400">No date limits</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{discount.is_active ? (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
													Active
												</span>
											) : (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
													Inactive
												</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-right">
											<button
												onClick={() =>
													navigate(`/discounts/edit/${discount.id}`)
												}
												className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors mr-2"
											>
												<PencilSquareIcon className="h-4 w-4 inline" />
											</button>
											<button
												onClick={() => handleDeleteDiscount(discount)}
												className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-colors"
											>
												<TrashIcon className="h-4 w-4 inline" />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Status Bar */}
			<div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl flex justify-between text-xs mt-4">
				<span className="flex items-center">
					<span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
					System Operational
				</span>
				<span>Total Discounts: {discounts.length}</span>
				<span>
					User: {userName} ({isAdmin ? "Admin" : "Staff"})
				</span>
			</div>

			{/* Delete Confirmation Modal */}
			{showDeleteModal && currentDiscount && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={handleConfirmDelete}
					title="Delete Discount"
					message={`Are you sure you want to delete the discount "${currentDiscount.name}"? This action cannot be undone.`}
					confirmButtonText="Delete"
					confirmButtonClass="bg-red-600 hover:bg-red-700"
				/>
			)}
		</div>
	);
}
