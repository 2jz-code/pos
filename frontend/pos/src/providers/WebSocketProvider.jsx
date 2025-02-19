// src/providers/WebSocketProvider.jsx
import { createContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import wsManager from "../api/config/websocketConfig";
import { WS_EVENTS } from "../api/config/wsEndpoints";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
	const [connectionStatus, setConnectionStatus] = useState("disconnected");

	useEffect(() => {
		const handleConnectionStatus = (status) => {
			console.log("WebSocket status update:", status);
			setConnectionStatus(status.status);
		};

		const handleError = (error) => {
			console.error("WebSocket error:", error);
		};

		// Subscribe to connection events
		wsManager.on(WS_EVENTS.CONNECTION, handleConnectionStatus);
		wsManager.on(WS_EVENTS.ERROR, handleError);

		// Initial connection attempt
		wsManager.connect();

		// Cleanup
		return () => {
			wsManager.off(WS_EVENTS.CONNECTION, handleConnectionStatus);
			wsManager.off(WS_EVENTS.ERROR, handleError);
			wsManager.disconnect();
		};
	}, []);

	// Optionally show connection status in development
	if (import.meta.env.DEV) {
		console.log("Current WebSocket status:", connectionStatus);
	}

	return (
		<WebSocketContext.Provider value={wsManager}>
			{children}
		</WebSocketContext.Provider>
	);
};

WebSocketProvider.propTypes = {
	children: PropTypes.node.isRequired,
};
