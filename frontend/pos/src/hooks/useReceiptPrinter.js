import { useCallback, useState, useEffect } from "react";
import { useWebSocketContext } from "../contexts/WebSocketContext";

export const useReceiptPrinter = () => {
	const { connections, sendMessage } = useWebSocketContext();
	const isConnected =
		connections.HARDWARE?.RECEIPT_PRINTER?.isConnected || false;
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		const handleMessage = (event) => {
			const message = event.detail;
			if (
				message._source?.category === "HARDWARE" &&
				message._source?.endpoint === "RECEIPT_PRINTER"
			) {
				console.log("Receipt printer message received:", message);
				if (
					message.type === "print_operation" ||
					(message.type === "drawer_operation" && message.operation === "open")
				) {
					setIsProcessing(message.status === "processing");
					if (message.status === "error") {
						setError(message.message);
					} else if (message.status === "success") {
						setError(null);
					}
				}
			}
		};
		window.addEventListener("websocket-message", handleMessage);
		return () => window.removeEventListener("websocket-message", handleMessage);
	}, []);

	const printReceipt = useCallback(
		// *** MODIFIED: Accept single object argument ***
		(dataToSend) => {
			// *** ADDED: Destructure to get both parts ***
			const { receipt_data, open_drawer = false } = dataToSend || {}; // Default to empty object if dataToSend is null/undefined
			console.log("useReceiptPrinter: printReceipt called with:", dataToSend);

			if (!isConnected) {
				const errMsg = "Receipt printer not connected";
				setError(errMsg);
				console.error(errMsg);
				return Promise.reject(new Error(errMsg));
			}
			// *** MODIFIED: Check receipt_data AFTER destructuring ***
			if (!receipt_data) {
				const errMsg = "Receipt data is missing in payload";
				setError(errMsg);
				console.error(errMsg);
				return Promise.reject(new Error(errMsg));
			}

			setIsProcessing(true);
			setError(null);

			return new Promise((resolve, reject) => {
				const timeoutId = setTimeout(() => {
					window.removeEventListener("websocket-message", handleResponse);
					setIsProcessing(false);
					const errMsg = "Print/Drawer operation timed out";
					setError(errMsg);
					console.error(errMsg);
					reject(new Error(errMsg));
				}, 10000);

				// eslint-disable-next-line no-unused-vars
				let processingReceived = false;

				const handleResponse = (event) => {
					const message = event.detail;
					if (
						message._source?.category !== "HARDWARE" ||
						message._source?.endpoint !== "RECEIPT_PRINTER" ||
						message.type !== "print_operation"
					) {
						return;
					}
					if (message.status === "processing") {
						processingReceived = true;
						setIsProcessing(true);
						return;
					}

					clearTimeout(timeoutId);
					window.removeEventListener("websocket-message", handleResponse);
					setIsProcessing(false);

					if (message.status === "success") {
						setError(null);
						resolve(true);
					} else {
						const errorMessage = message.message || "Failed to print receipt";
						setError(errorMessage);
						reject(new Error(errorMessage));
					}
				};

				try {
					window.addEventListener("websocket-message", handleResponse);
					// *** MODIFIED: Include open_drawer flag in payload ***
					const payload = {
						type: "print_receipt",
						receipt_data: receipt_data, // Use destructured variable
						open_drawer: !!open_drawer, // Ensure boolean true/false
					};
					console.log("useReceiptPrinter: Sending WS message:", payload);
					sendMessage("HARDWARE", "RECEIPT_PRINTER", payload);
				} catch (err) {
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

	// const openDrawerExplicitly = useCallback(() => {
	// 	if (!isConnected) {
	// 		const errMsg = "Printer not connected";
	// 		setError(errMsg);
	// 		console.error(errMsg);
	// 		return Promise.reject(new Error(errMsg));
	// 	}
	// 	setIsProcessing(true);
	// 	setError(null);
	// 	return new Promise((resolve, reject) => {
	// 		const timeoutId = setTimeout(() => {
	// 			reject(new Error("Explicit drawer open timed out"));
	// 		}, 5000);
	// 		const handleResponse = (event) => {
	// 			/* ... listener logic ... */
	// 		};
	// 		window.addEventListener("websocket-message", handleResponse);
	// 		sendMessage("HARDWARE", "RECEIPT_PRINTER", { type: "open_drawer" });
	// 	});
	// }, [isConnected, sendMessage]);

	return {
		isProcessing,
		error,
		isConnected,
		printReceipt,
		// openDrawerExplicitly,
	};
};
