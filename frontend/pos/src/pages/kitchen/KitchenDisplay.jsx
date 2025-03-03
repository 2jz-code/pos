// src/pages/kitchen/KitchenDisplay.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useKitchenWebSocket } from "./hooks/useKitchenWebSocket";
import OrderList from "./components/OrderList";
import { toast } from "react-toastify";
import { format } from "date-fns";

const KitchenDisplay = () => {
	const navigate = useNavigate();
	const location = useLocation();

	// Extract highlightedOrderId from URL query parameters
	const searchParams = new URLSearchParams(location.search);
	const highlightedOrderId = searchParams.get("highlight");

	const {
		orders,
		loading,
		error,
		isConnected,
		lastUpdate,
		markOrderPreparing,
		markOrderCompleted,
		refreshOrders,
	} = useKitchenWebSocket();

	const [isFullscreen, setIsFullscreen] = useState(false);

	// Handle errors from WebSocket
	useEffect(() => {
		if (error) {
			toast.error(`Kitchen Display Error: ${error}`);
		}
	}, [error]);

	// Highlight specific order if provided in URL
	useEffect(() => {
		if (highlightedOrderId && !loading && orders.length > 0) {
			setTimeout(() => {
				// Find the order element by ID
				const orderElement = document.getElementById(
					`order-${highlightedOrderId}`
				);
				if (orderElement) {
					// Scroll to the element
					orderElement.scrollIntoView({ behavior: "smooth", block: "center" });

					// Add a highlight effect
					orderElement.classList.add(
						"ring-4",
						"ring-blue-500",
						"ring-opacity-50",
						"animate-pulse"
					);

					// Remove highlight after a few seconds
					setTimeout(() => {
						orderElement.classList.remove(
							"ring-4",
							"ring-blue-500",
							"ring-opacity-50",
							"animate-pulse"
						);
					}, 3000);
				}
			}, 500); // Small delay to ensure DOM is updated
		}
	}, [highlightedOrderId, loading, orders]);

	// Handle fullscreen mode
	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch((err) => {
				toast.error(`Error attempting to enable fullscreen: ${err.message}`);
			});
			setIsFullscreen(true);
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
				setIsFullscreen(false);
			}
		}
	};

	// Handle preparing an order
	const handlePrepareOrder = (orderId) => {
		markOrderPreparing(orderId);
		toast.success(`Order #${orderId} marked as preparing`);
	};

	// Handle completing an order
	const handleCompleteOrder = (orderId) => {
		markOrderCompleted(orderId);
		toast.success(`Order #${orderId} completed`);
	};

	// Format the last update timestamp
	const formattedLastUpdate = lastUpdate
		? format(lastUpdate, "h:mm:ss a")
		: "Never";

	// Handle manual refresh
	const handleRefresh = () => {
		toast.info("Refreshing kitchen display...");
		refreshOrders();
	};

	const posOrders = orders.filter((o) => o.source === "pos").length;
	const onlineOrders = orders.filter((o) => o.source === "website").length;
	return (
		<div className="min-h-screen bg-gray-100">
			{/* Header */}
			<header className="bg-slate-800 text-white p-4 shadow-md">
				<div className="container mx-auto flex justify-between items-center">
					<div>
						<h1 className="text-2xl font-bold">Kitchen Display System</h1>
						<p className="text-slate-300 text-sm">Real-time order management</p>
					</div>

					<div className="flex items-center gap-4">
						{/* Connection status */}
						<div className="flex items-center">
							<div
								className={`w-3 h-3 rounded-full mr-2 ${
									isConnected ? "bg-green-500" : "bg-red-500"
								}`}
							></div>
							<span className="text-sm">
								{isConnected ? "Connected" : "Disconnected"}
							</span>
						</div>
						{/* Last update */}
						<div className="text-sm text-slate-300">
							Last updated: {formattedLastUpdate}
						</div>
						{/* Action buttons */}
						<button
							onClick={handleRefresh}
							disabled={loading}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
								loading
									? "bg-gray-500 cursor-not-allowed"
									: "bg-blue-600 hover:bg-blue-700 text-white"
							}`}
						>
							{loading ? (
								<>
									<svg
										className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
									Loading...
								</>
							) : (
								<>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4 mr-1.5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
											clipRule="evenodd"
										/>
									</svg>
									Refresh
								</>
							)}
						</button>
						<button
							onClick={toggleFullscreen}
							className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
						>
							{isFullscreen ? (
								<>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4 mr-1.5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M5 10a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H6a1 1 0 01-1-1v-3zm7-1a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 00-1-1h-3z"
											clipRule="evenodd"
										/>
									</svg>
									Exit Fullscreen
								</>
							) : (
								<>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4 mr-1.5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z"
											clipRule="evenodd"
										/>
									</svg>
									Fullscreen
								</>
							)}
						</button>
						<button
							onClick={() => navigate("/orders")}
							className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
						>
							Back to Orders
						</button>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="container mx-auto py-6 px-4">
				{/* Loading state */}
				{loading && (
					<div className="w-full flex justify-center items-center mb-6">
						<div className="flex flex-col items-center">
							<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-3"></div>
							<p className="text-gray-600">Loading orders...</p>
						</div>
					</div>
				)}

				{/* Error state */}
				{error && !loading && (
					<div className="w-full bg-red-50 border-l-4 border-red-500 p-4 mb-6">
						<div className="flex">
							<div className="flex-shrink-0">
								<svg
									className="h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div className="ml-3">
								<p className="text-sm text-red-700">{error}</p>
							</div>
							<div className="ml-auto pl-3">
								<div className="-mx-1.5 -my-1.5">
									<button
										onClick={refreshOrders}
										className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
									>
										<span className="sr-only">Retry</span>
										<svg
											className="h-5 w-5"
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
												clipRule="evenodd"
											/>
										</svg>
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Order statistics */}
				{!loading && !error && (
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
						<div className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
							<div>
								<h3 className="text-gray-500 text-sm font-medium">
									Total Orders
								</h3>
								<p className="text-2xl font-bold">{orders.length}</p>
							</div>
							<div className="bg-blue-100 p-3 rounded-full">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-blue-600"
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
							</div>
						</div>
						<div className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
							<div>
								<h3 className="text-gray-500 text-sm font-medium">
									POS Orders
								</h3>
								<p className="text-2xl font-bold text-blue-600">{posOrders}</p>
							</div>
							<div className="bg-blue-100 p-3 rounded-full">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-blue-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
									/>
								</svg>
							</div>
						</div>

						<div className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
							<div>
								<h3 className="text-gray-500 text-sm font-medium">
									Online Orders
								</h3>
								<p className="text-2xl font-bold text-purple-600">
									{onlineOrders}
								</p>
							</div>
							<div className="bg-purple-100 p-3 rounded-full">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-purple-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
									/>
								</svg>
							</div>
						</div>
						<div className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
							<div>
								<h3 className="text-gray-500 text-sm font-medium">Pending</h3>
								<p className="text-2xl font-bold text-yellow-600">
									{orders.filter((o) => o.status === "pending").length}
								</p>
							</div>
							<div className="bg-yellow-100 p-3 rounded-full">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-yellow-600"
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

						<div className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
							<div>
								<h3 className="text-gray-500 text-sm font-medium">Preparing</h3>
								<p className="text-2xl font-bold text-blue-600">
									{orders.filter((o) => o.status === "preparing").length}
								</p>
							</div>
							<div className="bg-blue-100 p-3 rounded-full">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-blue-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
									/>
								</svg>
							</div>
						</div>

						<div className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
							<div>
								<h3 className="text-gray-500 text-sm font-medium">
									Completed Today
								</h3>
								<p className="text-2xl font-bold text-green-600">
									{orders.filter((o) => o.status === "completed").length}
								</p>
							</div>
							<div className="bg-green-100 p-3 rounded-full">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-green-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</div>
						</div>
					</div>
				)}

				{/* Orders list - only show when not loading */}
				{!loading && (
					<OrderList
						orders={orders}
						onPrepare={handlePrepareOrder}
						onComplete={handleCompleteOrder}
						isLoading={loading}
					/>
				)}
			</main>
		</div>
	);
};

export default KitchenDisplay;
