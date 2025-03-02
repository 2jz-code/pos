// src/hooks/useCardPayment.js (updated to use new context)
import { useCallback, useState, useEffect } from "react";
import { useWebSocketContext } from "../contexts/WebSocketContext";

export const useCardPayment = () => {
	const { connections, sendMessage } = useWebSocketContext();
	const isConnected = connections.HARDWARE?.CARD_PAYMENT?.isConnected || false;

	const [isProcessing, setIsProcessing] = useState(false);
	const [status, setStatus] = useState(null);
	const [error, setError] = useState(null);
	const [cardData, setCardData] = useState(null);

	useEffect(() => {
		const handleMessage = (event) => {
			const message = event.detail;

			// Only process messages from card payment
			if (
				message._source?.category === "HARDWARE" &&
				message._source?.endpoint === "CARD_PAYMENT"
			) {
				if (message.type === "card_operation") {
					console.log("Card payment message received:", message);

					setIsProcessing(
						["waiting_for_card", "processing"].includes(message.status)
					);
					setStatus(message.status);

					if (message.status === "error" || message.status === "declined") {
						setError(message.message);
						setCardData(null);
					} else if (message.status === "success") {
						setError(null);
						setCardData({
							transactionId: message.transaction_id,
							cardType: message.card_type,
							lastFour: message.last_four,
						});
					}
				}
			}
		};

		window.addEventListener("websocket-message", handleMessage);
		return () => window.removeEventListener("websocket-message", handleMessage);
	}, []);

	const processPayment = useCallback(
		(amount) => {
			if (!isConnected) {
				setError("Card reader not connected");
				return Promise.reject(new Error("Card reader not connected"));
			}

			setIsProcessing(true);
			setError(null);
			setCardData(null);
			setStatus("initializing");

			return new Promise((resolve, reject) => {
				const timeoutId = setTimeout(() => {
					window.removeEventListener("websocket-message", handleResponse);
					setIsProcessing(false);
					setStatus("timeout");
					setError("Operation timed out");
					reject(new Error("Operation timed out"));
				}, 60000); // 60 second timeout for card operations

				const handleResponse = (event) => {
					const message = event.detail;

					// Filter for card payment messages
					if (
						message._source?.category !== "HARDWARE" ||
						message._source?.endpoint !== "CARD_PAYMENT"
					) {
						return;
					}

					if (
						message.type === "card_operation" &&
						message.operation === "process"
					) {
						if (["waiting_for_card", "processing"].includes(message.status)) {
							return; // Wait for final response
						}

						clearTimeout(timeoutId);
						window.removeEventListener("websocket-message", handleResponse);
						setIsProcessing(false);

						if (message.status === "success") {
							const data = {
								transactionId: message.transaction_id,
								cardType: message.card_type,
								lastFour: message.last_four,
							};
							setCardData(data);
							resolve(data);
						} else {
							setError(message.message);
							reject(new Error(message.message));
						}
					}
				};

				window.addEventListener("websocket-message", handleResponse);
				sendMessage("HARDWARE", "CARD_PAYMENT", {
					type: "process_payment",
					amount: amount,
				});
			});
		},
		[isConnected, sendMessage]
	);

	const cancelPayment = useCallback(() => {
		if (!isProcessing) return Promise.resolve();

		return new Promise((resolve) => {
			sendMessage("HARDWARE", "CARD_PAYMENT", { type: "cancel_payment" });
			setIsProcessing(false);
			setStatus("cancelled");
			resolve();
		});
	}, [isProcessing, sendMessage]);

	return {
		isProcessing,
		status,
		error,
		cardData,
		isConnected,
		processPayment,
		cancelPayment,
	};
};
