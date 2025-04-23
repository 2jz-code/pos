import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";
import { authService } from "../../api/services/authService";
import { resumeOrder, updateOnlineOrderStatus } from "../../utils/orderActions";
import { orderService } from "../../api/services/orderService"; // <<<--- Import orderService
import { toast } from "react-toastify";

export default function OrderDetails() {
	const { orderId } = useParams();
	const [order, setOrder] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isReprinting, setIsReprinting] = useState(false); // <<<--- Add state for loading
	const navigate = useNavigate();

	useEffect(() => {
		const fetchOrderDetails = async () => {
			try {
				const [orderResponse, authResponse] = await Promise.all([
					axiosInstance.get(`orders/${orderId}/`),
					authService.checkStatus(),
				]);

				setOrder(orderResponse.data);
				setIsAdmin(authResponse.is_admin);
			} catch (error) {
				console.error("Error fetching order details:", error);
				// Optionally show an error toast to the user
				toast.error("Could not load order details.");
			}
		};

		fetchOrderDetails();
	}, [orderId]);

	const updateOrderStatus = (newStatus) => {
		// Use the existing utility function, assuming it handles API calls and state updates
		updateOnlineOrderStatus(
			orderId,
			newStatus,
			(updatedOrder) => {
				// Update the local state with the new order data returned from the utility function
				setOrder(updatedOrder);
				toast.success(`Order status updated to ${newStatus.replace("_", " ")}`);
			},
			(error) => {
				// Optional error handling from the utility function
				toast.error(`Failed to update status: ${error.message}`);
			}
		);
	};

	// Format Date Helper
	const formatDate = (timestamp) => new Date(timestamp).toLocaleString();

	// <<<--- Add handler for reprint --- >>>
	const handleReprintReceipt = async () => {
		if (!order || isReprinting) return;

		setIsReprinting(true);
		toast.loading("Sending reprint request..."); // Optional feedback

		try {
			await orderService.reprintReceipt(order.id);
			toast.dismiss(); // Dismiss loading toast
			toast.success("Reprint request sent successfully!");
		} catch (error) {
			toast.dismiss(); // Dismiss loading toast
			console.error("Error reprinting receipt:", error);
			const errorMessage =
				error.response?.data?.error ||
				error.message ||
				"Failed to send reprint request.";
			toast.error(`Reprint Failed: ${errorMessage}`);
		} finally {
			setIsReprinting(false);
		}
	};
	// <<<----------------------------- >>>

	if (!order)
		return (
			<div className="flex justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);

	// Determine available actions based on order source and status
	const getOrderActions = () => {
		const actions = []; // Initialize an array to hold button elements

		// --- POS Actions ---
		if (order.source === "pos") {
			if (order.status === "in_progress" || order.status === "saved") {
				actions.push(
					<button
						key="resume"
						className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
						onClick={() => resumeOrder(order.id, navigate)} // Assuming resumeOrder handles navigation
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
							/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						Resume Order
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
						className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
						onClick={() => updateOrderStatus("voided")}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						Void Order
					</button>
				);
			}
			// Add Reprint Button for Completed POS orders
			if (order.status === "completed") {
				actions.push(
					<button
						key="reprint"
						className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
						onClick={handleReprintReceipt}
						disabled={isReprinting}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
							/>
						</svg>
						{isReprinting ? "Reprinting..." : "Reprint Receipt"}
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
						className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
						onClick={() => updateOrderStatus("preparing")}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
							/>
						</svg>
						Start Preparing
					</button>
				);
			}
			if (order.status === "preparing") {
				actions.push(
					<button
						key="complete"
						className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
						onClick={() => updateOrderStatus("completed")}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Mark as Completed
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
						className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
						onClick={() => updateOrderStatus("cancelled")}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						Cancel Order
					</button>
				);
			}
		}

		return (
			// Render the collected actions
			<div className="flex flex-wrap gap-4 mt-6">{actions}</div>
		);
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6 overflow-hidden">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center space-x-4">
					<h1 className="text-2xl font-bold text-slate-800">Order Details</h1>
					<span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex items-center">
						<span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>#
						{orderId}
					</span>
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
							order.source === "website"
								? "bg-purple-100 text-purple-700"
								: "bg-blue-100 text-blue-700"
						}`}
					>
						{order.source === "website" ? "ONLINE ORDER" : "POS ORDER"}
					</span>
				</div>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
					onClick={() => navigate("/orders")} // Navigate back to the orders list
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
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back to Orders
				</button>
			</div>

			{/* Order Summary Card */}
			<div className="bg-white rounded-xl shadow-sm p-6 mb-6">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
					<div>
						<label className="text-sm font-medium text-slate-500 mb-1 block">
							Status
						</label>
						<div
							className={`
                                font-medium text-slate-800 py-1 px-2 rounded-md inline-block text-xs
                                ${
																	order.status === "completed"
																		? "bg-emerald-100 text-emerald-700"
																		: order.status === "voided" ||
																		  order.status === "cancelled"
																		? "bg-red-100 text-red-700"
																		: order.status === "preparing" ||
																		  order.status === "in_progress"
																		? "bg-blue-100 text-blue-700"
																		: order.status === "pending"
																		? "bg-yellow-100 text-yellow-700"
																		: "bg-amber-100 text-amber-700" // Saved status
																}
                            `}
						>
							{order.status.replace("_", " ").toUpperCase()}
						</div>
					</div>
					<div>
						<label className="text-sm font-medium text-slate-500 mb-1 block">
							Total
						</label>
						<p className="font-medium text-slate-800 text-lg">
							${order.total_price}
						</p>
					</div>
					<div>
						<label className="text-sm font-medium text-slate-500 mb-1 block">
							Created
						</label>
						<p className="text-slate-800 text-sm">
							{formatDate(order.created_at)}
						</p>
					</div>
					<div>
						<label className="text-sm font-medium text-slate-500 mb-1 block">
							Updated
						</label>
						<p className="text-slate-800 text-sm">
							{formatDate(order.updated_at)}
						</p>
					</div>

					{/* Creator information for POS orders */}
					{order.source === "pos" && (
						<div>
							<label className="text-sm font-medium text-slate-500 mb-1 block">
								Created By
							</label>
							<p className="text-slate-800 flex items-center text-sm">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4 mr-1.5 text-slate-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={1.5}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									/>
								</svg>
								{order.created_by || "Unknown"}
							</p>
						</div>
					)}
				</div>

				{/* Render Order Actions */}
				{getOrderActions()}
			</div>

			{/* Customer Details (for website orders) */}
			{order.source === "website" && (
				<div className="bg-white rounded-xl shadow-sm p-6 mb-6">
					<h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 mr-2 text-slate-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
						Customer Information
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="text-sm font-medium text-slate-500 mb-1 block">
								Customer Name
							</label>
							<p className="font-medium text-slate-800">
								{order.guest_first_name && order.guest_last_name
									? `${order.guest_first_name} ${order.guest_last_name}`
									: order.created_by || "Guest Customer"}{" "}
								{/* Fallback to created_by if names are missing */}
							</p>
						</div>

						<div>
							<label className="text-sm font-medium text-slate-500 mb-1 block">
								Email
							</label>
							<p className="font-medium text-slate-800">
								{order.guest_email || "Not provided"}
							</p>
						</div>

						{/* Display Payment Status from Order Model */}
						{order.payment_status && (
							<div>
								<label className="text-sm font-medium text-slate-500 mb-1 block">
									Payment Status
								</label>
								<div
									className={`
                                        font-medium py-1 px-2 rounded-md inline-block text-xs
                                        ${
																					order.payment_status === "paid"
																						? "bg-emerald-100 text-emerald-700"
																						: order.payment_status ===
																						  "refunded"
																						? "bg-red-100 text-red-700"
																						: "bg-amber-100 text-amber-700" // Pending
																				}
                                    `}
								>
									{order.payment_status.toUpperCase()}
								</div>
							</div>
						)}

						<div>
							<label className="text-sm font-medium text-slate-500 mb-1 block">
								Order Source
							</label>
							<p className="font-medium text-purple-700 bg-purple-50 py-1 px-2 rounded-md inline-block text-xs">
								WEBSITE ORDER
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Split Layout Container */}
			<div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 overflow-hidden">
				{/* Order Items (Left Side) */}
				<div className="bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
					<div className="p-4 border-b border-slate-200 flex items-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 mr-2 text-slate-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
							/>
						</svg>
						<h2 className="text-lg font-semibold text-slate-800">
							Order Items ({order.items?.length || 0})
						</h2>
					</div>
					<div className="overflow-y-auto flex-1">
						{order.items && order.items.length > 0 ? (
							order.items.map((item) => (
								<div
									key={item.id}
									className="p-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors"
								>
									<div className="flex justify-between items-center">
										<div>
											<h3 className="font-medium text-slate-800 mb-1">
												{item.product?.name || "Unknown Item"}
											</h3>
											<p className="text-sm text-slate-500 flex items-center">
												<span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded mr-2 text-xs">
													{item.quantity} × ${item.product?.price || "0.00"}
												</span>
												{/* Display discount info if needed */}
											</p>
										</div>
										<p className="font-medium text-slate-800">
											${(item.quantity * (item.product?.price || 0)).toFixed(2)}
										</p>
									</div>
								</div>
							))
						) : (
							<div className="p-6 text-center text-slate-500">
								No items in this order
							</div>
						)}
					</div>
				</div>

				{/* Payment Information (Right Side) */}
				<div className="bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
					<div className="p-4 border-b border-slate-200 flex items-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 mr-2 text-slate-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
							/>
						</svg>
						<h2 className="text-lg font-semibold text-slate-800">
							Payment Information
						</h2>
					</div>
					<div className="p-6 overflow-y-auto flex-1">
						{" "}
						{/* Added padding */}
						{order.payment ? (
							<div className="space-y-4">
								{" "}
								{/* Reduced spacing slightly */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="text-sm font-medium text-slate-500 mb-1 block">
											Payment Method
										</label>
										<p className="font-medium text-slate-800 text-sm">
											{order.payment.is_split_payment
												? "Split Payment"
												: order.payment.payment_method
												? order.payment.payment_method
														.replace("_", " ")
														.toUpperCase()
												: "Not specified"}
										</p>
									</div>

									{/* Use Payment Status from Payment object */}
									<div>
										<label className="text-sm font-medium text-slate-500 mb-1 block">
											Payment Status
										</label>
										<div
											className={`
                                                font-medium py-1 px-2 rounded-md inline-block text-xs
                                                ${
																									order.payment.status ===
																									"completed"
																										? "bg-emerald-100 text-emerald-700"
																										: order.payment.status ===
																												"failed" ||
																										  order.payment.status ===
																												"refunded"
																										? "bg-red-100 text-red-700"
																										: "bg-amber-100 text-amber-700" // Pending or other
																								}
                                            `}
										>
											{order.payment.status.toUpperCase()}
										</div>
									</div>

									<div>
										<label className="text-sm font-medium text-slate-500 mb-1 block">
											Amount Paid
										</label>
										<p className="font-medium text-slate-800 text-sm">
											${order.payment.amount || order.total_price}
										</p>
									</div>

									<div>
										<label className="text-sm font-medium text-slate-500 mb-1 block">
											Payment Date
										</label>
										<p className="font-medium text-slate-800 text-sm">
											{formatDate(
												order.payment.updated_at || order.payment.created_at
											)}
										</p>
									</div>
								</div>
								{/* Discount Details */}
								{order.discount_details && (
									<div className="pt-4 border-t border-slate-100">
										<label className="text-sm font-medium text-slate-500 mb-2 block">
											Discount Applied
										</label>
										<div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1">
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
												${order.discount_details.amount_applied.toFixed(2)}
											</p>
										</div>
									</div>
								)}
								{/* Split Payment Details - Use transactions from payment object */}
								{order.payment.is_split_payment &&
									order.payment.transactions &&
									order.payment.transactions.length > 0 && (
										<div className="pt-4 border-t border-slate-100">
											<label className="text-sm font-medium text-slate-500 mb-2 block">
												Split Payment Details
											</label>
											<div className="bg-slate-50 p-3 rounded-lg">
												<table className="w-full text-sm">
													<thead>
														<tr className="border-b border-slate-200">
															<th className="text-left py-1.5 px-2 font-medium text-slate-600">
																Method
															</th>
															<th className="text-right py-1.5 px-2 font-medium text-slate-600">
																Amount
															</th>
														</tr>
													</thead>
													<tbody>
														{order.payment.transactions.map(
															(transaction, index) => (
																<tr
																	key={transaction.id || index} // Use transaction ID if available
																	className="border-b border-slate-100 last:border-0"
																>
																	<td className="py-1.5 px-2 text-slate-700">
																		{transaction.payment_method
																			?.replace("_", " ")
																			.toUpperCase() || // Use correct field name
																			"Unknown"}
																	</td>
																	<td className="py-1.5 px-2 text-right text-slate-700">
																		${transaction.amount || "0.00"}
																	</td>
																</tr>
															)
														)}
													</tbody>
												</table>
											</div>
										</div>
									)}
								{/* Payment Intent ID (for credit card payments) */}
								{order.payment.payment_intent_id && (
									<div className="pt-4 border-t border-slate-100">
										<label className="text-sm font-medium text-slate-500 mb-1 block">
											Payment Reference
										</label>
										<p className="text-xs bg-slate-50 p-2 rounded font-mono text-slate-600 break-all">
											{" "}
											{/* Allow breaking long IDs */}
											{order.payment.payment_intent_id}
										</p>
									</div>
								)}
							</div>
						) : (
							<div className="flex flex-col items-center justify-center h-full text-center p-6">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-12 w-12 text-slate-300 mb-3"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
									/>
								</svg>
								<p className="text-slate-500">
									No payment information available for this order.
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
