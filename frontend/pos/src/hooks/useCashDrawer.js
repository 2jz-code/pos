// src/hooks/useCashDrawer.js (updated to use new context)
import { useCallback, useState, useEffect } from "react";
import { useWebSocketContext } from "../contexts/WebSocketContext";

export const useCashDrawer = () => {
	const { connections, sendMessage } = useWebSocketContext();
	const isConnected = connections.HARDWARE?.CASH_DRAWER?.isConnected || false;

	const [drawerState, setDrawerState] = useState("closed");
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState(null);

	// Set up global hardware message listener
	useEffect(() => {
		const handleMessage = (event) => {
			const message = event.detail;

			// Only process messages from cash drawer
			if (
				message._source?.category === "HARDWARE" &&
				message._source?.endpoint === "CASH_DRAWER"
			) {
				console.log("Cash drawer message received:", message);

				if (message.type === "drawer_operation") {
					setDrawerState(message.state);
					setIsProcessing(false);
					if (message.status === "error") {
						setError(message.message);
					}
				} else if (message.type === "drawer_state") {
					setDrawerState(message.state);
				} else if (message.type === "print_operation") {
					setIsProcessing(message.status === "processing");
					if (message.status === "error") {
						setError(message.message);
					}
				}
			}
		};

		window.addEventListener("websocket-message", handleMessage);
		return () => window.removeEventListener("websocket-message", handleMessage);
	}, []);

	const openDrawer = useCallback(() => {
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				window.removeEventListener("websocket-message", handleResponse);
				setIsProcessing(false);
				setError("Operation timed out");
				reject(new Error("Operation timed out"));
			}, 5000);

			let processingReceived = false;

			const handleResponse = (event) => {
				const message = event.detail;

				// Filter for cash drawer messages
				if (
					message._source?.category !== "HARDWARE" ||
					message._source?.endpoint !== "CASH_DRAWER"
				) {
					return;
				}

				if (
					message.type === "drawer_operation" &&
					message.operation === "open"
				) {
					if (message.status === "processing") {
						processingReceived = true;
						setDrawerState("processing");
						return; // Wait for final response
					}

					if (!processingReceived && message.status !== "processing") {
						console.warn("Received final response without processing state");
					}

					clearTimeout(timeoutId);
					window.removeEventListener("websocket-message", handleResponse);
					setIsProcessing(false);

					if (message.status === "success") {
						setDrawerState("open");
						resolve(true);
					} else {
						setDrawerState("error");
						setError(message.message || "Failed to open drawer");
						reject(new Error(message.message || "Failed to open drawer"));
					}
				}
			};

			window.addEventListener("websocket-message", handleResponse);
			sendMessage("HARDWARE", "CASH_DRAWER", { type: "open_drawer" });
		});
	}, [sendMessage]);

	const closeDrawer = useCallback(() => {
		if (!isConnected) {
			setError("Hardware not connected");
			return Promise.reject(new Error("Hardware not connected"));
		}

		setIsProcessing(true);
		setError(null);

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				window.removeEventListener("websocket-message", handleResponse);
				setIsProcessing(false);
				setError("Operation timed out");
				reject(new Error("Operation timed out"));
			}, 5000);

			let processingReceived = false;
			console.log(processingReceived);
			const handleResponse = (event) => {
				const message = event.detail;

				// Filter for cash drawer messages
				if (
					message._source?.category !== "HARDWARE" ||
					message._source?.endpoint !== "CASH_DRAWER"
				) {
					return;
				}

				console.log("Drawer close response received:", message);

				if (
					message.type === "drawer_operation" &&
					message.operation === "close"
				) {
					if (message.status === "processing") {
						processingReceived = true;
						setDrawerState("processing");
						return; // Wait for final response
					}

					clearTimeout(timeoutId);
					window.removeEventListener("websocket-message", handleResponse);
					setIsProcessing(false);

					if (message.status === "success") {
						console.log("Close drawer success");
						setDrawerState("closed");
						setError(null);
						resolve(true);
					} else {
						console.error("Close drawer failed:", message);
						const errorMessage = message.message || "Failed to close drawer";
						setDrawerState("error");
						setError(errorMessage);
						reject(new Error(errorMessage));
					}
				}
			};

			try {
				window.addEventListener("websocket-message", handleResponse);
				console.log("Sending close drawer message");
				sendMessage("HARDWARE", "CASH_DRAWER", { type: "close_drawer" });
			} catch (err) {
				console.error("Error sending close drawer message:", err);
				window.removeEventListener("websocket-message", handleResponse);
				clearTimeout(timeoutId);
				setIsProcessing(false);
				setError(err.message);
				reject(err);
			}
		});
	}, [isConnected, sendMessage]);

	// src/hooks/useCashDrawer.js (modified printReceipt function)

	const printReceipt = useCallback(
		(receiptData) => {
			if (!isConnected) {
				setError("Hardware not connected");
				return Promise.reject(new Error("Hardware not connected"));
			}

			setIsProcessing(true);
			setError(null);

			return new Promise((resolve, reject) => {
				const timeoutId = setTimeout(() => {
					window.removeEventListener("websocket-message", handleResponse);
					setIsProcessing(false);
					setError("Print operation timed out");
					reject(new Error("Print operation timed out"));
				}, 5000);

				let processingReceived = false;

				const handleResponse = (event) => {
					const message = event.detail;

					// Filter for receipt printer messages
					if (
						message._source?.category !== "HARDWARE" ||
						message._source?.endpoint !== "RECEIPT_PRINTER"
					) {
						return;
					}

					console.log("Print response received:", message);

					if (message.type === "print_operation") {
						// Handle processing state
						if (message.status === "processing") {
							processingReceived = true;
							setIsProcessing(true);
							return; // Wait for final response
						}

						// Handle final response
						clearTimeout(timeoutId);
						window.removeEventListener("websocket-message", handleResponse);
						setIsProcessing(false);

						if (message.status === "success") {
							console.log("Print operation success");
							setError(null);
							resolve(true);
						} else {
							console.error("Print operation failed:", message);
							const errorMessage = message.message || "Failed to print receipt";
							setError(errorMessage);
							reject(new Error(errorMessage));
						}
					}
				};

				try {
					window.addEventListener("websocket-message", handleResponse);
					console.log("Sending print receipt message", receiptData);

					// IMPORTANT: Send to RECEIPT_PRINTER endpoint instead of CASH_DRAWER
					sendMessage("HARDWARE", "RECEIPT_PRINTER", {
						type: "print_receipt",
						receipt_data: receiptData,
					});
				} catch (err) {
					console.error("Error sending print message:", err);
					window.removeEventListener("websocket-message", handleResponse);
					clearTimeout(timeoutId);
					setIsProcessing(false);
					setError(err.message);
					reject(err);
				}
			});
		},
		[isConnected, sendMessage]
	);

	return {
		drawerState,
		isProcessing,
		error,
		isConnected,
		openDrawer,
		closeDrawer,
		printReceipt,
	};
};
