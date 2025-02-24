// src/hooks/useHardwareSocket.js
import { useEffect, useRef, useState, useCallback } from "react";

// Define WebSocket endpoints
const WS_ENDPOINTS = {
	CASH_DRAWER: "cash-drawer",
	CARD_PAYMENT: "card-payment",
};

export const useHardwareSocket = (deviceType = WS_ENDPOINTS.CASH_DRAWER) => {
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState(null);
	const wsRef = useRef(null);

	const sendMessage = useCallback((message) => {
		if (wsRef.current?.readyState !== WebSocket.OPEN) {
			console.error("WebSocket is not connected");
			return;
		}

		const formattedMessage = {
			...message,
			id: Date.now().toString(),
			timestamp: new Date().toISOString(),
		};

		console.log("Sending message:", formattedMessage);
		wsRef.current.send(JSON.stringify(formattedMessage));
	}, []);

	const connect = useCallback(() => {
		try {
			// Validate device type
			if (!Object.values(WS_ENDPOINTS).includes(deviceType)) {
				throw new Error(`Invalid device type: ${deviceType}`);
			}

			const wsUrl = `ws://localhost:8001/ws/hardware/${deviceType}/`;
			console.log(`Connecting to ${wsUrl}`);

			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				console.log(`${deviceType} WebSocket Connected`);
				setIsConnected(true);
				setError(null);
			};

			ws.onmessage = (e) => {
				const data = JSON.parse(e.data);
				console.log("WebSocket received:", data);

				switch (data.type) {
					case "connection_established":
						setIsConnected(true);
						break;
					case "drawer_operation":
					case "drawer_state":
					case "print_operation": {
						const event = new CustomEvent("hardware-message", {
							detail: data,
						});
						window.dispatchEvent(event);
						break;
					}
					case "message_received": {
						console.log(`Message ${data.id} acknowledged:`, data);
						break;
					}
					default:
						console.warn("Unhandled message type:", data.type, data);
				}
			};

			ws.onclose = () => {
				console.log(`${deviceType} WebSocket Disconnected`);
				setIsConnected(false);
				setTimeout(connect, 3000);
			};

			ws.onerror = (err) => {
				console.error("WebSocket Error:", err);
				setError("WebSocket connection error");
			};
		} catch (err) {
			console.error("Connection error:", err);
			setError(err.message);
		}
	}, [deviceType]);

	useEffect(() => {
		connect();
		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, [connect]);

	return {
		isConnected,
		error,
		sendMessage,
	};
};
