// src/pages/PaymentDetails.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { paymentService } from "../../api/services/paymentService";
import { authService } from "../../api/services/authService";
import axiosInstance from "../../api/config/axiosConfig";

export default function PaymentDetails() {
	const { paymentId } = useParams();
	const [payment, setPayment] = useState(null);
	const [order, setOrder] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchPaymentDetails = async () => {
			setIsLoading(true);
			try {
				// Fetch payment details and auth status in parallel
				const [paymentResponse, authResponse] = await Promise.all([
					paymentService.getPaymentById(paymentId),
					authService.checkStatus(),
				]);

				setPayment(paymentResponse);
				setIsAdmin(authResponse.is_admin);

				// Fetch associated order if available
				if (paymentResponse.order_id) {
					try {
						const orderResponse = await axiosInstance.get(
							`orders/${paymentResponse.order_id}/`
						);
						setOrder(orderResponse.data);
					} catch (orderError) {
						console.error("Error fetching order:", orderError);
						// Don't set main error, just log it
					}
				}

				setError(null);
			} catch (error) {
				console.error("Error fetching payment details:", error);
				setError("Failed to load payment details. Please try again.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchPaymentDetails();
	}, [paymentId]);

	// Format currency
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	// Format date
	const formatDate = (timestamp) => new Date(timestamp).toLocaleString();

	// Handle refund
	const handleRefund = async () => {
		if (!confirm("Are you sure you want to process this refund?")) return;

		try {
			const response = await paymentService.processRefund(paymentId);

			if (response.success) {
				setPayment({ ...payment, status: "refunded" });
				alert("Refund processed successfully");
			}
		} catch (error) {
			console.error("Error processing refund:", error);
			alert(
				"Failed to process refund: " +
					(error.response?.data?.message || error.message)
			);
		}
	};

	if (isLoading) {
		return (
			<div className="w-screen h-screen flex items-center justify-center bg-slate-50">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-16 w-16 text-red-500 mb-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<h1 className="text-2xl font-bold text-slate-800 mb-2">
					Error Loading Payment
				</h1>
				<p className="text-slate-600 mb-6">{error}</p>
				<button
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					onClick={() => navigate("/payments")}
				>
					Return to Payments
				</button>
			</div>
		);
	}

	if (!payment) {
		return (
			<div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-16 w-16 text-slate-400 mb-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
					/>
				</svg>
				<h1 className="text-2xl font-bold text-slate-800 mb-2">
					Payment Not Found
				</h1>
				<p className="text-slate-600 mb-6">
					The payment you`&apos`re looking for doesn`&apos`t exist or has been
					removed.
				</p>
				<button
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					onClick={() => navigate("/payments")}
				>
					Return to Payments
				</button>
			</div>
		);
	}

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6 overflow-hidden">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center space-x-4">
					<h1 className="text-2xl font-bold text-slate-800">Payment Details</h1>
					<span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex items-center">
						<span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>#
						{paymentId}
					</span>
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium ${
							payment.status === "completed"
								? "bg-emerald-50 text-emerald-700"
								: payment.status === "refunded"
								? "bg-red-50 text-red-700"
								: payment.status === "failed"
								? "bg-amber-50 text-amber-700"
								: "bg-slate-50 text-slate-700"
						}`}
					>
						{payment.status.toUpperCase()}
					</span>
				</div>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
					onClick={() => navigate("/payments")}
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
					Back to Payments
				</button>
			</div>

			{/* Main Content */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				{/* Payment Summary Card */}
				<div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-6">
					<h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 mr-2 text-slate-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
							/>
						</svg>
						Payment Summary
					</h2>

					<div className="space-y-4">
						<div>
							<label className="text-sm font-medium text-slate-500 mb-1 block">
								Payment ID
							</label>
							<p className="font-medium text-slate-800">{payment.id}</p>
						</div>

						<div>
							<label className="text-sm font-medium text-slate-500 mb-1 block">
								Amount
							</label>
							<p className="text-2xl font-bold text-slate-800">
								{formatCurrency(payment.amount)}
							</p>
						</div>

						<div>
							<label className="text-sm font-medium text-slate-500 mb-1 block">
								Status
							</label>
							<div
								className={`font-medium py-1 px-2 rounded-md inline-block ${
									payment.status === "completed"
										? "bg-emerald-50 text-emerald-700"
										: payment.status === "refunded"
										? "bg-red-50 text-red-700"
										: payment.status === "failed"
										? "bg-amber-50 text-amber-700"
										: "bg-slate-50 text-slate-700"
								}`}
							>
								{payment.status.toUpperCase()}
							</div>
						</div>

						<div>
							<label className="text-sm font-medium text-slate-500 mb-1 block">
								Payment Method
							</label>
							<div
								className={`font-medium py-1 px-2 rounded-md inline-block ${
									payment.is_split_payment
										? "bg-purple-50 text-purple-700"
										: "bg-blue-50 text-blue-700"
								}`}
							>
								{payment.is_split_payment
									? "SPLIT PAYMENT"
									: payment.payment_method
									? payment.payment_method.replace("_", " ").toUpperCase()
									: "N/A"}
							</div>
						</div>

						<div>
							<label className="text-sm font-medium text-slate-500 mb-1 block">
								Date Created
							</label>
							<p className="font-medium text-slate-800">
								{formatDate(payment.created_at)}
							</p>
						</div>

						<div>
							<label className="text-sm font-medium text-slate-500 mb-1 block">
								Last Updated
							</label>
							<p className="font-medium text-slate-800">
								{formatDate(payment.updated_at)}
							</p>
						</div>

						{payment.order_id && (
							<div>
								<label className="text-sm font-medium text-slate-500 mb-1 block">
									Associated Order
								</label>
								<button
									onClick={() => navigate(`/orders/${payment.order_id}`)}
									className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4 mr-1"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
										/>
									</svg>
									Order #{payment.order_id}
								</button>
							</div>
						)}

						{/* Actions */}
						{payment.status === "completed" && isAdmin && (
							<div className="pt-4 mt-4 border-t border-slate-200">
								<button
									onClick={handleRefund}
									className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
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
											d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
										/>
									</svg>
									Process Refund
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Payment Details Card */}
				<div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
					<h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 mr-2 text-slate-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
						Payment Details
					</h2>

					{/* Payment method specific details */}
					{payment.payment_method === "credit_card" && (
						<div className="bg-blue-50 p-4 rounded-lg mb-4">
							<h3 className="font-medium text-blue-700 mb-2">
								Credit Card Details
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{payment.card_details && (
									<>
										<div>
											<label className="text-sm font-medium text-blue-600 mb-1 block">
												Card Type
											</label>
											<p className="font-medium text-slate-800">
												{payment.card_details.brand || "N/A"}
											</p>
										</div>
										<div>
											<label className="text-sm font-medium text-blue-600 mb-1 block">
												Last 4 Digits
											</label>
											<p className="font-medium text-slate-800">
												•••• {payment.card_details.last4 || "****"}
											</p>
										</div>
										{payment.card_details.exp_month &&
											payment.card_details.exp_year && (
												<div>
													<label className="text-sm font-medium text-blue-600 mb-1 block">
														Expiration
													</label>
													<p className="font-medium text-slate-800">
														{payment.card_details.exp_month}/
														{payment.card_details.exp_year}
													</p>
												</div>
											)}
									</>
								)}
								{payment.payment_intent_id && (
									<div className="md:col-span-2">
										<label className="text-sm font-medium text-blue-600 mb-1 block">
											Payment Intent ID
										</label>
										<p className="font-mono text-sm bg-white p-2 rounded border border-blue-100 overflow-x-auto">
											{payment.payment_intent_id}
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Split payment details */}
					{payment.is_split_payment && payment.transactions && (
						<div className="bg-purple-50 p-4 rounded-lg mb-4">
							<h3 className="font-medium text-purple-700 mb-2">
								Split Payment Details
							</h3>
							<div className="overflow-x-auto">
								<table className="min-w-full bg-white rounded-lg overflow-hidden">
									<thead className="bg-purple-100 text-purple-700">
										<tr>
											<th className="py-2 px-4 text-left text-sm font-medium">
												Method
											</th>
											<th className="py-2 px-4 text-left text-sm font-medium">
												Amount
											</th>
											<th className="py-2 px-4 text-left text-sm font-medium">
												Status
											</th>
											<th className="py-2 px-4 text-left text-sm font-medium">
												Date
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-purple-100">
										{payment.transactions.map((transaction, index) => (
											<tr
												key={index}
												className="hover:bg-purple-50"
											>
												<td className="py-2 px-4 text-sm">
													<span
														className={`px-2 py-1 rounded-md text-xs font-medium ${
															transaction.method === "cash"
																? "bg-green-50 text-green-700"
																: "bg-blue-50 text-blue-700"
														}`}
													>
														{transaction.method.replace("_", " ").toUpperCase()}
													</span>
												</td>
												<td className="py-2 px-4 text-sm font-medium">
													{formatCurrency(transaction.amount)}
												</td>
												<td className="py-2 px-4 text-sm">
													<span
														className={`px-2 py-1 rounded-md text-xs font-medium ${
															transaction.status === "completed"
																? "bg-emerald-50 text-emerald-700"
																: transaction.status === "refunded"
																? "bg-red-50 text-red-700"
																: "bg-amber-50 text-amber-700"
														}`}
													>
														{transaction.status?.toUpperCase() || "COMPLETED"}
													</span>
												</td>
												<td className="py-2 px-4 text-sm">
													{formatDate(
														transaction.created_at || payment.created_at
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Cash payment details */}
					{payment.payment_method === "cash" && (
						<div className="bg-green-50 p-4 rounded-lg mb-4">
							<h3 className="font-medium text-green-700 mb-2">
								Cash Payment Details
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{payment.cash_details && (
									<>
										<div>
											<label className="text-sm font-medium text-green-600 mb-1 block">
												Amount Tendered
											</label>
											<p className="font-medium text-slate-800">
												{formatCurrency(
													payment.cash_details.amount_tendered || 0
												)}
											</p>
										</div>
										<div>
											<label className="text-sm font-medium text-green-600 mb-1 block">
												Change Given
											</label>
											<p className="font-medium text-slate-800">
												{formatCurrency(payment.cash_details.change || 0)}
											</p>
										</div>
									</>
								)}
								<div>
									<label className="text-sm font-medium text-green-600 mb-1 block">
										Received By
									</label>
									<p className="font-medium text-slate-800">
										{payment.created_by || "Unknown"}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Associated order summary */}
					{order && (
						<div className="border border-slate-200 rounded-lg overflow-hidden">
							<div className="bg-slate-50 p-4 border-b border-slate-200">
								<h3 className="font-medium text-slate-800">
									Associated Order Summary
								</h3>
							</div>
							<div className="p-4">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
									<div>
										<label className="text-sm font-medium text-slate-500 mb-1 block">
											Order ID
										</label>
										<p className="font-medium text-slate-800">#{order.id}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-slate-500 mb-1 block">
											Order Status
										</label>
										<span
											className={`px-2 py-1 rounded-md text-xs font-medium ${
												order.status === "completed"
													? "bg-emerald-50 text-emerald-700"
													: order.status === "voided" ||
													  order.status === "cancelled"
													? "bg-red-50 text-red-700"
													: "bg-amber-50 text-amber-700"
											}`}
										>
											{order.status.replace("_", " ").toUpperCase()}
										</span>
									</div>
									<div>
										<label className="text-sm font-medium text-slate-500 mb-1 block">
											Order Total
										</label>
										<p className="font-medium text-slate-800">
											{formatCurrency(order.total_price)}
										</p>
									</div>
								</div>

								{/* Order items preview */}
								{order.items && order.items.length > 0 && (
									<div>
										<label className="text-sm font-medium text-slate-500 mb-2 block">
											Order Items
										</label>
										<div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
											{order.items.map((item, index) => (
												<div
													key={index}
													className="p-2 border-b border-slate-200 last:border-b-0 flex justify-between items-center text-sm"
												>
													<div className="flex items-center">
														<span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs mr-2">
															{item.quantity}×
														</span>
														<span className="text-slate-800">
															{item.product.name}
														</span>
													</div>
													<span className="font-medium text-slate-700">
														{formatCurrency(item.quantity * item.product.price)}
													</span>
												</div>
											))}
										</div>
									</div>
								)}

								<div className="mt-4">
									<button
										onClick={() => navigate(`/orders/${order.id}`)}
										className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4 mr-1"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
										View Full Order Details
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Refund history */}
					{payment.refunds && payment.refunds.length > 0 && (
						<div className="mt-6">
							<h3 className="font-medium text-slate-800 mb-2">
								Refund History
							</h3>
							<div className="border border-slate-200 rounded-lg overflow-hidden">
								<table className="min-w-full divide-y divide-slate-200">
									<thead className="bg-slate-50">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
												Refund ID
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
												Amount
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
												Status
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
												Date
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
												Reason
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-slate-200">
										{payment.refunds.map((refund, index) => (
											<tr key={index}>
												<td className="px-4 py-3 text-sm text-slate-800">
													{refund.id}
												</td>
												<td className="px-4 py-3 text-sm font-medium text-slate-800">
													{formatCurrency(refund.amount)}
												</td>
												<td className="px-4 py-3 text-sm">
													<span
														className={`px-2 py-1 rounded-md text-xs font-medium ${
															refund.status === "succeeded"
																? "bg-emerald-50 text-emerald-700"
																: refund.status === "failed"
																? "bg-red-50 text-red-700"
																: "bg-amber-50 text-amber-700"
														}`}
													>
														{refund.status.toUpperCase()}
													</span>
												</td>
												<td className="px-4 py-3 text-sm text-slate-600">
													{formatDate(refund.created_at)}
												</td>
												<td className="px-4 py-3 text-sm text-slate-600">
													{refund.reason || "Not specified"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Logs and Audit Trail */}
			{payment.logs && payment.logs.length > 0 && (
				<div className="bg-white rounded-xl shadow-sm p-6 mb-6">
					<h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 mr-2 text-slate-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
						Payment Audit Trail
					</h2>

					<div className="space-y-4">
						{payment.logs.map((log, index) => (
							<div
								key={index}
								className="flex items-start p-3 border-l-4 border-slate-300 bg-slate-50 rounded-r-lg"
							>
								<div className="mr-4 mt-0.5">
									<div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4 text-slate-600"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
								</div>
								<div className="flex-1">
									<div className="flex justify-between items-center mb-1">
										<span className="font-medium text-slate-800">
											{log.action}
										</span>
										<span className="text-xs text-slate-500">
											{formatDate(log.timestamp)}
										</span>
									</div>
									<p className="text-sm text-slate-600">{log.description}</p>
									{log.user && (
										<p className="text-xs text-slate-500 mt-1">
											By: {log.user}
										</p>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
