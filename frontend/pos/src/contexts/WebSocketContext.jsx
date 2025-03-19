// src/contexts/WebSocketContext.js
import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	useCallback,
} from "react";
import PropTypes from "prop-types";

// Define initial WebSocket endpoints by category
const WS_ENDPOINTS = {
	HARDWARE: {
		CASH_DRAWER: "hardware/cash-drawer",
		CARD_PAYMENT: "hardware/card-payment",
		RECEIPT_PRINTER: "hardware/receipt-printer",
	},
	BUSINESS: {
		KITCHEN: "kitchen/orders", // Add kitchen endpoint
	},
};

// Create context
const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
	// Initialize connection states for all endpoints
	const initialConnectionStates = Object.entries(WS_ENDPOINTS).reduce(
		(categories, [category, endpoints]) => {
			categories[category] = Object.entries(endpoints).reduce(
				(endpoints, [name, path]) => {
					endpoints[name] = { isConnected: false, error: null };
					return endpoints;
				},
				{}
			);
			return categories;
		},
		{}
	);

	const [connections, setConnections] = useState(initialConnectionStates);

	// WebSocket references - flattened structure for easier access
	const wsRefs = useRef({});

	// Initialize refs for all endpoints
	useEffect(() => {
		Object.entries(WS_ENDPOINTS).forEach(([category, endpoints]) => {
			Object.entries(endpoints).forEach(([name, _]) => {
				if (!wsRefs.current[`${category}.${name}`]) {
					wsRefs.current[`${category}.${name}`] = null;
				}
			});
		});
	}, []);

	// Keep track of reconnection attempts
	const reconnectAttempts = useRef({});

	// Calculate reconnection delay with exponential backoff
	const calculateReconnectDelay = useCallback((endpointKey) => {
		if (!reconnectAttempts.current[endpointKey]) {
			reconnectAttempts.current[endpointKey] = 0;
		}

		reconnectAttempts.current[endpointKey]++;

		// Reset after 10 attempts
		if (reconnectAttempts.current[endpointKey] > 10) {
			reconnectAttempts.current[endpointKey] = 1;
		}

		// Base delay is 1000ms, max is ~30 seconds
		const delay = Math.min(
			1000 * Math.pow(1.5, reconnectAttempts.current[endpointKey] - 1),
			30000
		);

		// Add some randomness to prevent all connections trying at the same time
		return delay + Math.random() * 1000;
	}, []);

	// Get WebSocket URL based on category and endpoint
	const getWebSocketUrl = useCallback((category, endpointName) => {
		const path = WS_ENDPOINTS[category][endpointName];

		// Different base URL handling for different categories
		if (category === "HARDWARE") {
			return `ws://localhost:8001/ws/${path}/`;
		} else if (category === "BUSINESS") {
			return `ws://localhost:8001/ws/${path}/`;
		}

		throw new Error(`Unknown WebSocket category: ${category}`);
	}, []);

	// Connect to a specific endpoint
	const connect = useCallback(
		(category, endpointName) => {
			const endpointKey = `${category}.${endpointName}`;

			try {
				// Check if this endpoint is already connected
				if (wsRefs.current[endpointKey]?.readyState === WebSocket.OPEN) {
					console.log(`${endpointKey} WebSocket already connected`);
					return;
				}

				// Close existing connection if any
				if (wsRefs.current[endpointKey]) {
					wsRefs.current[endpointKey].close();
				}

				const wsUrl = getWebSocketUrl(category, endpointName);
				console.log(`Connecting to ${wsUrl}`);

				const ws = new WebSocket(wsUrl);
				wsRefs.current[endpointKey] = ws;

				ws.onopen = () => {
					console.log(`${endpointKey} WebSocket Connected`);
					setConnections((prev) => ({
						...prev,
						[category]: {
							...prev[category],
							[endpointName]: { isConnected: true, error: null },
						},
					}));
				};

				ws.onmessage = (e) => {
					try {
						const data = JSON.parse(e.data);
						console.log(`${endpointKey} WebSocket received:`, data);

						// Dispatch to window event system for compatibility with existing code
						const event = new CustomEvent("websocket-message", {
							detail: {
								...data,
								_source: { category, endpoint: endpointName },
							},
						});
						window.dispatchEvent(event);
					} catch (err) {
						console.error(`Error processing message from ${endpointKey}:`, err);
					}
				};

				ws.onclose = (event) => {
					console.log(
						`${endpointKey} WebSocket Disconnected:`,
						event.code,
						event.reason
					);
					setConnections((prev) => ({
						...prev,
						[category]: {
							...prev[category],
							[endpointName]: {
								...prev[category][endpointName],
								isConnected: false,
							},
						},
					}));

					// Attempt to reconnect after delay (with exponential backoff)
					const delay = calculateReconnectDelay(endpointKey);
					console.log(`Will attempt to reconnect ${endpointKey} in ${delay}ms`);

					setTimeout(() => {
						if (document.visibilityState !== "hidden") {
							connect(category, endpointName);
						}
					}, delay);
				};

				ws.onerror = (err) => {
					console.error(`${endpointKey} WebSocket Error:`, err);
					setConnections((prev) => ({
						...prev,
						[category]: {
							...prev[category],
							[endpointName]: {
								...prev[category][endpointName],
								error: "WebSocket connection error",
							},
						},
					}));
				};
			} catch (err) {
				console.error(`${endpointKey} Connection error:`, err);
				setConnections((prev) => ({
					...prev,
					[category]: {
						...prev[category],
						[endpointName]: {
							...prev[category][endpointName],
							error: err.message,
						},
					},
				}));
			}
		},
		[calculateReconnectDelay, getWebSocketUrl]
	);

	// Send a message to a specific endpoint
	const sendMessage = useCallback(
		(category, endpointName, message) => {
			const endpointKey = `${category}.${endpointName}`;

			if (wsRefs.current[endpointKey]?.readyState !== WebSocket.OPEN) {
				console.error(`${endpointKey} WebSocket is not connected`);
				// Try to reconnect
				connect(category, endpointName);
				return false;
			}

			const formattedMessage = {
				...message,
				id: Date.now().toString(),
				timestamp: new Date().toISOString(),
			};

			console.log(`Sending message to ${endpointKey}:`, formattedMessage);
			wsRefs.current[endpointKey].send(JSON.stringify(formattedMessage));
			return true;
		},
		[connect]
	);

	// Reconnect a specific endpoint
	const reconnect = useCallback(
		(category, endpointName) => {
			const endpointKey = `${category}.${endpointName}`;

			if (!WS_ENDPOINTS[category] || !WS_ENDPOINTS[category][endpointName]) {
				console.error(`Cannot reconnect - unknown endpoint: ${endpointKey}`);
				return false;
			}

			// Reset reconnect attempts for this endpoint
			reconnectAttempts.current[endpointKey] = 0;

			// Connect
			connect(category, endpointName);
			return true;
		},
		[connect]
	);

	// Connect to all endpoints on initial render
	useEffect(() => {
		// Handle visibility changes to reconnect when tab becomes visible
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				console.log("Tab is now visible, checking connections...");

				Object.entries(WS_ENDPOINTS).forEach(([category, endpoints]) => {
					Object.keys(endpoints).forEach((endpointName) => {
						const endpointKey = `${category}.${endpointName}`;
						if (wsRefs.current[endpointKey]?.readyState !== WebSocket.OPEN) {
							console.log(
								`Reconnecting to ${endpointKey} after visibility change`
							);
							connect(category, endpointName);
						}
					});
				});
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		// Initial connections
		Object.entries(WS_ENDPOINTS).forEach(([category, endpoints]) => {
			Object.keys(endpoints).forEach((endpointName) => {
				connect(category, endpointName);
			});
		});

		// Cleanup function
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);

			Object.entries(WS_ENDPOINTS).forEach(([category, endpoints]) => {
				Object.keys(endpoints).forEach((endpointName) => {
					const endpointKey = `${category}.${endpointName}`;
					if (wsRefs.current[endpointKey]) {
						wsRefs.current[endpointKey].close();
					}
				});
			});
		};
	}, [connect]);

	const contextValue = {
		connections,
		sendMessage,
		endpoints: WS_ENDPOINTS,
		reconnect,
	};

	return (
		<WebSocketContext.Provider value={contextValue}>
			{children}
		</WebSocketContext.Provider>
	);
};

// Add prop validation
WebSocketProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

// Custom hook to use the WebSocket context
export const useWebSocketContext = () => {
	const context = useContext(WebSocketContext);
	if (!context) {
		throw new Error(
			"useWebSocketContext must be used within a WebSocketProvider"
		);
	}
	return context;
};
