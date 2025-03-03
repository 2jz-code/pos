// src/pages/kitchen/hooks/useKitchenWebSocket.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocketContext } from "../../../contexts/WebSocketContext";

export const useKitchenWebSocket = () => {
	const { connections, sendMessage } = useWebSocketContext();
	const isConnected = connections.BUSINESS?.KITCHEN?.isConnected || false;

	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [lastUpdate, setLastUpdate] = useState(null);

	// Add a ref to track if we've received initial data
	const initialDataReceived = useRef(false);

	// Add timeout for loading state
	const loadingTimeoutRef = useRef(null);

	// Clear loading timeout helper
	const clearLoadingTimeout = useCallback(() => {
		if (loadingTimeoutRef.current) {
			clearTimeout(loadingTimeoutRef.current);
			loadingTimeoutRef.current = null;
		}
	}, []);

	// Request initial orders function
	const requestInitialOrders = useCallback(() => {
		if (!isConnected) {
			console.log("Cannot request orders: Kitchen WebSocket not connected");
			setLoading(false);
			setError("WebSocket not connected. Please refresh the page.");
			return false;
		}

		console.log("Requesting initial kitchen orders...");
		setLoading(true);

		// Clear any existing timeout
		clearLoadingTimeout();

		// Request orders from the server
		const success = sendMessage("BUSINESS", "KITCHEN", {
			action: "refresh_orders",
		});

		if (success) {
			// Set a timeout to clear loading state if we don't get a response
			loadingTimeoutRef.current = setTimeout(() => {
				if (!initialDataReceived.current) {
					console.log("No response received for initial orders request");
					setLoading(false);
					setError("No response from kitchen service. Please try again.");
				}
			}, 8000); // 8 second timeout
			return true;
		} else {
			setLoading(false);
			setError("Failed to send request. Please refresh the page.");
			return false;
		}
	}, [isConnected, sendMessage, clearLoadingTimeout]);

	// Process incoming messages
	useEffect(() => {
		const handleMessage = (event) => {
			const { detail } = event;

			// Only process messages from kitchen endpoint
			if (
				detail._source?.category === "BUSINESS" &&
				detail._source?.endpoint === "KITCHEN"
			) {
				console.log("Kitchen websocket message received:", detail);

				// Handle different message types
				switch (detail.type) {
					case "initial_orders":
						initialDataReceived.current = true;
						setOrders(detail.orders || []);
						setLoading(false);
						setLastUpdate(new Date());
						clearLoadingTimeout();
						console.log("Initial orders loaded:", detail.orders?.length || 0);
						break;

					case "order_update":
						setOrders((prev) => {
							// Replace the updated order in the array
							const updated = prev.map((order) =>
								order.id === detail.order.id ? detail.order : order
							);

							// Filter out completed orders after 5 minutes
							return updated.filter((order) => {
								if (order.status === "completed") {
									const completedTime = new Date(order.updated_at);
									const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
									return completedTime > fiveMinutesAgo;
								}
								return true;
							});
						});
						setLastUpdate(new Date());
						break;

					case "new_order":
						// Play sound for new orders
						try {
							const audio = new Audio("/sounds/new-order.mp3");
							audio.play().catch((e) => console.log("Audio play failed:", e));
						} catch (e) {
							console.log("Audio play error:", e);
						}

						// Add the new order to the list
						setOrders((prev) => [detail.order, ...prev]);
						setLastUpdate(new Date());
						break;

					case "action_response":
						// Handle responses to user actions
						console.log("Action response:", detail);
						break;

					case "orders_update":
						initialDataReceived.current = true;
						setOrders(detail.orders || []);
						setLoading(false);
						clearLoadingTimeout();
						setLastUpdate(new Date());
						break;

					case "error":
						setError(detail.message);
						setLoading(false);
						clearLoadingTimeout();
						break;

					default:
						console.log("Unhandled kitchen message type:", detail.type);
				}
			}
		};

		window.addEventListener("websocket-message", handleMessage);

		// Request initial orders when the hook is mounted
		// This is the critical part - we always request orders when the Kitchen page mounts
		requestInitialOrders();

		return () => {
			window.removeEventListener("websocket-message", handleMessage);
			clearLoadingTimeout();
			// Reset the flag when the component unmounts
			initialDataReceived.current = false;
		};
	}, [isConnected, requestInitialOrders, clearLoadingTimeout]);

	// Action handlers
	const markOrderPreparing = useCallback(
		(orderId) => {
			if (!isConnected) return false;

			return sendMessage("BUSINESS", "KITCHEN", {
				action: "mark_prepared",
				order_id: orderId,
			});
		},
		[isConnected, sendMessage]
	);

	const markOrderCompleted = useCallback(
		(orderId) => {
			if (!isConnected) return false;

			return sendMessage("BUSINESS", "KITCHEN", {
				action: "mark_completed",
				order_id: orderId,
			});
		},
		[isConnected, sendMessage]
	);

	const refreshOrders = useCallback(() => {
		return requestInitialOrders();
	}, [requestInitialOrders]);

	// Auto-refresh orders every minute to update time calculations
	useEffect(() => {
		const interval = setInterval(() => {
			if (isConnected && !loading) {
				sendMessage("BUSINESS", "KITCHEN", {
					action: "refresh_orders",
				});
			}
		}, 60000); // 1 minute

		return () => clearInterval(interval);
	}, [isConnected, loading, sendMessage]);

	return {
		orders,
		loading,
		error,
		isConnected,
		lastUpdate,
		markOrderPreparing,
		markOrderCompleted,
		refreshOrders,
	};
};
