// src/hooks/useReceiptPrinter.js
import { useCallback, useState, useEffect } from "react";
import { useWebSocketContext } from "../contexts/WebSocketContext";

export const useReceiptPrinter = () => {
	const { connections, sendMessage } = useWebSocketContext();
	const isConnected =
		connections.HARDWARE?.RECEIPT_PRINTER?.isConnected || false;

	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState(null);

	// Set up global hardware message listener
	useEffect(() => {
		const handleMessage = (event) => {
			const message = event.detail;

			// Only process messages from receipt printer
			if (
				message._source?.category === "HARDWARE" &&
				message._source?.endpoint === "RECEIPT_PRINTER"
			) {
				console.log("Receipt printer message received:", message);

				if (message.type === "print_operation") {
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

	const printReceipt = useCallback(
		(receiptData) => {
			if (!isConnected) {
				setError("Receipt printer not connected");
				return Promise.reject(new Error("Receipt printer not connected"));
			}

			setIsProcessing(true);
			setError(null);

			return new Promise((resolve, reject) => {
				const timeoutId = setTimeout(() => {
					window.removeEventListener("websocket-message", handleResponse);
					setIsProcessing(false);
					setError("Print operation timed out");
					reject(new Error("Print operation timed out"));
				}, 10000); // 10 second timeout for printing

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
		isProcessing,
		error,
		isConnected,
		printReceipt,
	};
};
