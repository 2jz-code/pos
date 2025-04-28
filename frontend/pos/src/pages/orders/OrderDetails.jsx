import { useState, useEffect } from "react"; // Added React import
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig"; // Original import
import { authService } from "../../api/services/authService"; // Original import
import { resumeOrder, updateOnlineOrderStatus } from "../../utils/orderActions"; // Original import
import { orderService } from "../../api/services/orderService"; // Original import
import { toast } from "react-toastify";
// Icons for UI
import {
	ArrowLeftIcon,
	UserCircleIcon,
	ShoppingBagIcon,
	CreditCardIcon,
	PrinterIcon,
	PlayCircleIcon,
	XCircleIcon,
	CheckCircleIcon,
	ExclamationTriangleIcon,
	ClockIcon,
	InformationCircleIcon,
	HashtagIcon,
	UserIcon,
	EnvelopeIcon,
	CalendarDaysIcon,
	ArrowPathIcon,
	DocumentTextIcon,
	TagIcon,
	ListBulletIcon,
} from "@heroicons/react/24/outline"; // Using outline icons
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Assuming path is correct
import PropTypes from "prop-types";
import { formatPrice } from "../../utils/numberUtils";
/**
 * OrderDetails Component (Logic Preserved from User Provided Code)
 *
 * Displays detailed information about a specific order.
 * UI updated for a modern look and feel; Logic remains unchanged.
 */
export default function OrderDetails() {
	// --- ORIGINAL LOGIC (UNCHANGED from user provided code) ---
	const { orderId } = useParams();
	const [order, setOrder] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isReprinting, setIsReprinting] = useState(false);
	const [loading, setLoading] = useState(true); // Added loading state
	const [error, setError] = useState(null); // Added error state
	const navigate = useNavigate();

	useEffect(() => {
		let isMounted = true; // Prevent state update on unmounted component
		setLoading(true);
		setError(null);

		const fetchOrderDetails = async () => {
			try {
				const [orderResponse, authResponse] = await Promise.all([
					axiosInstance.get(`orders/${orderId}/`),
					authService.checkStatus(),
				]);
				if (isMounted) {
					setOrder(orderResponse.data);
					setIsAdmin(authResponse.is_admin);
				}
			} catch (error) {
				console.error("Error fetching order details:", error);
				if (isMounted) {
					setError("Could not load order details.");
					toast.error("Could not load order details.");
				}
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		fetchOrderDetails();
		return () => {
			isMounted = false;
		}; // Cleanup
	}, [orderId]); // Removed navigate from dependency array as it's stable

	const updateOrderStatus = (newStatus) => {
		updateOnlineOrderStatus(
			orderId,
			newStatus,
			(updatedOrder) => {
				setOrder(updatedOrder); // Update local state
				toast.success(`Order status updated to ${newStatus.replace("_", " ")}`);
			},
			(error) => {
				toast.error(`Failed to update status: ${error.message}`);
			}
		);
	};

	const formatDate = (timestamp) => {
		if (!timestamp) return "N/A";
		try {
			return new Date(timestamp).toLocaleString(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			});
			// eslint-disable-next-line no-unused-vars
		} catch (e) {
			return "Invalid Date";
		}
	};

	const handleReprintReceipt = async () => {
		if (!order || isReprinting) return;
		setIsReprinting(true);
		const toastId = toast.loading("Sending reprint request...");
		try {
			await orderService.reprintReceipt(order.id);
			toast.update(toastId, {
				render: "Reprint request sent successfully!",
				type: "success",
				isLoading: false,
				autoClose: 3000,
			});
		} catch (error) {
			console.error("Error reprinting receipt:", error);
			const errorMessage =
				error.response?.data?.error ||
				error.message ||
				"Failed to send reprint request.";
			toast.update(toastId, {
				render: `Reprint Failed: ${errorMessage}`,
				type: "error",
				isLoading: false,
				autoClose: 5000,
			});
		} finally {
			setIsReprinting(false);
		}
	};

	// Function to generate action buttons based on order state (Original logic)
	const getOrderActions = () => {
		const actions = [];
		const buttonBaseStyle =
			"px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm border"; // Compact buttons
		const primaryButtonStyle = `${buttonBaseStyle} bg-blue-600 text-white border-blue-700 hover:bg-blue-700 active:bg-blue-800`;
		const secondaryButtonStyle = `${buttonBaseStyle} bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 active:bg-slate-300`;
		const dangerButtonStyle = `${buttonBaseStyle} bg-red-600 text-white border-red-700 hover:bg-red-700 active:bg-red-800`;
		const successButtonStyle = `${buttonBaseStyle} bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 active:bg-emerald-800`;
		const warningButtonStyle = `${buttonBaseStyle} bg-amber-500 text-white border-amber-600 hover:bg-amber-600 active:bg-amber-700`;

		if (!order) return null; // Should not happen if loading/error handled

		// --- POS Actions ---
		if (order.source === "pos") {
			if (order.status === "in_progress" || order.status === "saved") {
				actions.push(
					<button
						key="resume"
						className={primaryButtonStyle}
						onClick={() => resumeOrder(order.id, navigate)}
					>
						<PlayCircleIcon className="h-4 w-4" /> Resume
					</button>
				);
			}
			if (
				isAdmin &&
				order.status !== "voided" &&
				order.status !== "completed"
			) {
				actions.push(
					<button
						key="void"
						className={dangerButtonStyle}
						onClick={() => updateOrderStatus("voided")}
					>
						<XCircleIcon className="h-4 w-4" /> Void
					</button>
				);
			}
			if (order.status === "completed") {
				actions.push(
					<button
						key="reprint"
						className={secondaryButtonStyle}
						onClick={handleReprintReceipt}
						disabled={isReprinting}
					>
						{isReprinting ? (
							<ArrowPathIcon className="h-4 w-4 animate-spin" />
						) : (
							<PrinterIcon className="h-4 w-4" />
						)}
						{isReprinting ? "Printing..." : "Reprint"}
					</button>
				);
			}
		}
		// --- Website Actions ---
		else {
			if (order.status === "pending") {
				actions.push(
					<button
						key="prepare"
						className={warningButtonStyle}
						onClick={() => updateOrderStatus("preparing")}
					>
						<ClockIcon className="h-4 w-4" /> Prepare
					</button>
				);
			}
			if (order.status === "preparing") {
				actions.push(
					<button
						key="complete"
						className={successButtonStyle}
						onClick={() => updateOrderStatus("completed")}
					>
						<CheckCircleIcon className="h-4 w-4" /> Complete
					</button>
				);
			}
			if (
				isAdmin &&
				order.status !== "cancelled" &&
				order.status !== "completed"
			) {
				actions.push(
					<button
						key="cancel"
						className={dangerButtonStyle}
						onClick={() => updateOrderStatus("cancelled")}
					>
						<XCircleIcon className="h-4 w-4" /> Cancel
					</button>
				);
			}
		}

		if (actions.length > 0) {
			return (
				<div className="flex flex-wrap gap-2 mt-4 border-t border-slate-100 pt-4">
					{actions}
				</div>
			);
		}
		return null; // No actions available
	};
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI (JSX Structure and Styling Only) ---
	// Loading State
	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-slate-100">
				<LoadingSpinner size="lg" />
				<p className="text-slate-500 ml-3">Loading order details...</p>
			</div>
		);
	}

	// Error State
	if (error || !order) {
		// Check for !order as well
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-6">
				<div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
					<ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<p className="text-red-600 mb-4">{error || "Order not found."}</p>
					<button
						className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
						onClick={() => navigate("/orders")} // Original handler
					>
						Back to Orders List
					</button>
				</div>
			</div>
		);
	}

	// Helper to get status badge color
	const getStatusBadgeClass = (status) => {
		switch (status) {
			case "completed":
				return "bg-emerald-100 text-emerald-700 border border-emerald-200";
			case "paid":
				return "bg-emerald-100 text-emerald-700 border border-emerald-200"; // Added for payment status
			case "voided":
			case "cancelled":
			case "refunded":
				return "bg-red-100 text-red-700 border border-red-200";
			case "preparing":
			case "in_progress":
				return "bg-blue-100 text-blue-700 border border-blue-200";
			case "pending":
				return "bg-yellow-100 text-yellow-700 border border-yellow-200";
			case "saved":
				return "bg-amber-100 text-amber-700 border border-amber-200";
			default:
				return "bg-slate-100 text-slate-700 border border-slate-200";
		}
	};

	// Helper for detail item display
	const DetailItem = ({ label, value, icon: IconComponent }) => (
		<div>
			<dt className="text-xs font-medium text-slate-500 mb-0.5 flex items-center gap-1">
				{IconComponent && (
					<IconComponent className="h-3.5 w-3.5 text-slate-400" />
				)}
				{label}
			</dt>
			<dd className="text-sm text-slate-800">
				{value || <span className="italic text-slate-400">N/A</span>}
			</dd>
		</div>
	);
	DetailItem.propTypes = {
		label: PropTypes.string,
		value: PropTypes.node,
		icon: PropTypes.elementType,
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6 overflow-hidden">
			{/* Header Section - Styled */}
			<header className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-slate-200 gap-3 flex-shrink-0">
				<div className="flex items-center space-x-3">
					<h1 className="text-xl sm:text-2xl font-bold text-slate-800">
						Order Details
					</h1>
					{/* Order ID Badge */}
					<span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-medium flex items-center">
						<HashtagIcon className="w-3 h-3 mr-1" />
						{orderId}
					</span>
					{/* Source Badge */}
					<span
						className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center ${
							order.source === "website"
								? "bg-purple-100 text-purple-700"
								: "bg-cyan-100 text-cyan-700" // Different color for POS
						}`}
					>
						{order.source === "website" ? "ONLINE" : "POS"}
					</span>
				</div>
				{/* Back Button */}
				<button
					className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
					onClick={() => navigate("/orders")} // Original handler
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Back to Orders
				</button>
			</header>

			{/* Main Content Area - Scrollable */}
			<div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 overflow-y-auto custom-scrollbar pb-6 min-h-0">
				{/* Left Column: Order Summary & Customer Info */}
				<div className="lg:col-span-1 space-y-4 sm:space-y-6">
					{/* Order Summary Card - Styled */}
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5">
						<h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
							<InformationCircleIcon className="w-5 h-5 text-slate-400" /> Order
							Summary
						</h2>
						<dl className="space-y-2.5 text-sm">
							{" "}
							{/* Use definition list */}
							<div className="flex justify-between items-center">
								<dt className="font-medium text-slate-500">Status:</dt>
								<dd>
									<span
										className={`font-semibold px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(
											order.status
										)}`}
									>
										{order.status.replace("_", " ").toUpperCase()}
									</span>
								</dd>
							</div>
							<DetailItem
								label="Total"
								value={
									<span className="font-semibold text-base">
										{formatPrice(order.total_price)}
									</span>
								}
							/>
							<DetailItem
								label="Created"
								value={formatDate(order.created_at)}
								icon={CalendarDaysIcon}
							/>
							<DetailItem
								label="Last Updated"
								value={formatDate(order.updated_at)}
								icon={ClockIcon}
							/>
							{order.source === "pos" && (
								<DetailItem
									label="Created By"
									value={order.created_by}
									icon={UserIcon}
								/>
							)}
						</dl>
						{/* Order Actions */}
						{getOrderActions()}
					</div>

					{/* Customer Details (Website Orders) - Styled */}
					{order.source === "website" && (
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5">
							<h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
								<UserCircleIcon className="w-5 h-5 text-slate-400" /> Customer
								Information
							</h3>
							<dl className="space-y-2.5 text-sm">
								<DetailItem
									label="Name"
									value={
										order.guest_first_name && order.guest_last_name
											? `${order.guest_first_name} ${order.guest_last_name}`
											: order.created_by || "Guest"
									}
								/>
								<DetailItem
									label="Email"
									value={order.guest_email}
									icon={EnvelopeIcon}
								/>
								{order.payment_status && (
									<div className="flex justify-between items-center">
										<dt className="font-medium text-slate-500">Payment:</dt>
										<dd>
											<span
												className={`font-semibold px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(
													order.payment_status
												)}`}
											>
												{order.payment_status.toUpperCase()}
											</span>
										</dd>
									</div>
								)}
							</dl>
						</div>
					)}
				</div>

				{/* Right Column: Order Items & Payment Info */}
				<div className="lg:col-span-2 space-y-4 sm:space-y-6">
					{/* Order Items Card - Styled */}
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col max-h-[calc(50vh-3rem)]">
						{" "}
						{/* Limit height */}
						<div className="p-4 border-b border-slate-200 flex items-center gap-2 flex-shrink-0">
							<ShoppingBagIcon className="w-5 h-5 text-slate-400" />
							<h2 className="text-base font-semibold text-slate-700">
								Order Items ({order.items?.length || 0})
							</h2>
						</div>
						<div className="overflow-y-auto custom-scrollbar flex-grow">
							{order.items && order.items.length > 0 ? (
								<ul className="divide-y divide-slate-100">
									{order.items.map((item) => (
										<li
											key={item.id}
											className="px-4 py-2.5 flex justify-between items-center text-sm hover:bg-slate-50"
										>
											<div>
												<span className="font-medium text-slate-800">
													{item.product?.name || "Unknown Item"}
												</span>
												<span className="text-slate-500 ml-2 text-xs">
													({item.quantity} ×{" "}
													{formatPrice(item.product?.price || 0)})
												</span>
												{item.discount > 0 && (
													<span className="ml-2 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
														-{item.discount}%
													</span>
												)}
											</div>
											<span className="font-medium text-slate-700">
												{formatPrice(
													item.quantity *
														(item.product?.price || 0) *
														(1 - (item.discount || 0) / 100)
												)}
											</span>
										</li>
									))}
								</ul>
							) : (
								<div className="p-6 text-center text-slate-500 text-sm">
									No items found.
								</div>
							)}
						</div>
					</div>

					{/* Payment Information Card - Styled */}
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col max-h-[calc(50vh-3rem)]">
						{" "}
						{/* Limit height */}
						<div className="p-4 border-b border-slate-200 flex items-center gap-2 flex-shrink-0">
							<CreditCardIcon className="w-5 h-5 text-slate-400" />
							<h2 className="text-base font-semibold text-slate-700">
								Payment Information
							</h2>
						</div>
						<div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-grow">
							{order.payment ? (
								<div className="space-y-4 text-sm">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
										<DetailItem
											label="Method"
											value={
												<span className="font-semibold">
													{order.payment.is_split_payment
														? "Split Payment"
														: order.payment.payment_method
														? order.payment.payment_method
																.replace("_", " ")
																.toUpperCase()
														: "N/A"}
												</span>
											}
										/>
										<div>
											<dt className="text-xs font-medium text-slate-500 mb-0.5">
												Status
											</dt>
											<dd>
												<span
													className={`font-semibold px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(
														order.payment.status
													)}`}
												>
													{order.payment.status.toUpperCase()}
												</span>
											</dd>
										</div>
										<DetailItem
											label="Amount Paid"
											value={
												<span className="font-semibold">
													{formatPrice(
														order.payment.amount || order.total_price
													)}
												</span>
											}
										/>
										<DetailItem
											label="Date"
											value={formatDate(
												order.payment.updated_at || order.payment.created_at
											)}
											icon={CalendarDaysIcon}
										/>
									</div>

									{/* Discount Details */}
									{order.discount_details && (
										<div className="pt-3 border-t border-slate-100">
											<label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
												<TagIcon className="h-3.5 w-3.5" /> Discount Applied
											</label>
											<div className="bg-slate-50 p-2 rounded-md text-xs space-y-0.5 border border-slate-200">
												<p>
													<span className="font-medium text-slate-700">
														Name:
													</span>{" "}
													{order.discount_details.name}
												</p>
												<p>
													<span className="font-medium text-slate-700">
														Code:
													</span>{" "}
													{order.discount_details.code}
												</p>
												<p>
													<span className="font-medium text-slate-700">
														Amount:
													</span>{" "}
													-{formatPrice(order.discount_details.amount_applied)}
												</p>
											</div>
										</div>
									)}

									{/* Split Payment Details */}
									{order.payment.is_split_payment &&
										order.payment.transactions?.length > 0 && (
											<div className="pt-3 border-t border-slate-100">
												<label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
													<ListBulletIcon className="h-3.5 w-3.5" /> Split
													Transactions
												</label>
												<div className="bg-slate-50 p-2 rounded-md max-h-32 overflow-y-auto custom-scrollbar border border-slate-200">
													<table className="w-full text-xs">
														<thead>
															<tr className="border-b border-slate-200">
																<th className="text-left py-1 px-1 font-semibold text-slate-600">
																	Method
																</th>
																<th className="text-right py-1 px-1 font-semibold text-slate-600">
																	Amount
																</th>
															</tr>
														</thead>
														<tbody className="divide-y divide-slate-100">
															{order.payment.transactions.map((tx, index) => (
																<tr key={tx.id || index}>
																	<td className="py-1 px-1 text-slate-700">
																		{tx.payment_method
																			?.replace("_", " ")
																			.toUpperCase() || "N/A"}
																	</td>
																	<td className="py-1 px-1 text-right text-slate-700">
																		{formatPrice(tx.amount)}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											</div>
										)}

									{/* Payment Intent ID */}
									{order.payment.payment_intent_id && (
										<div className="pt-3 border-t border-slate-100">
											<label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
												<DocumentTextIcon className="h-3.5 w-3.5" /> Payment
												Reference
											</label>
											<p className="text-[11px] bg-slate-50 p-2 rounded font-mono text-slate-600 break-all border border-slate-200">
												{order.payment.payment_intent_id}
											</p>
										</div>
									)}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center text-center p-6 h-full">
									<CreditCardIcon className="h-10 w-10 text-slate-300 mb-2" />
									<p className="text-sm text-slate-500">
										No payment information recorded.
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
	// --- END OF UPDATED UI ---
}
