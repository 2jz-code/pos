// src/components/HardwareStatus.jsx
import { useState, useEffect } from "react";
import { useWebSocketContext } from "../contexts/WebSocketContext";

export const HardwareStatus = () => {
	const { connections, sendMessage, endpoints } = useWebSocketContext();
	const [testResponse, setTestResponse] = useState(null);

	// Flatten the connections for easy display
	const flatConnections = Object.entries(connections).flatMap(
		([category, endpoints]) =>
			Object.entries(endpoints).map(([name, status]) => ({
				category,
				name,
				...status,
			}))
	);

	// Check if all endpoints are connected
	const allConnected = flatConnections.every((conn) => conn.isConnected);

	useEffect(() => {
		const handleMessage = (e) => {
			const data = e.detail;
			if (data.type === "test_response") {
				setTestResponse(data.message);
			}
		};

		window.addEventListener("websocket-message", handleMessage);
		return () => window.removeEventListener("websocket-message", handleMessage);
	}, []);

	const handleTestMessage = () => {
		setTestResponse(null);

		// Send test message to all hardware endpoints
		Object.entries(endpoints.HARDWARE).forEach(([name, _]) => {
			sendMessage("HARDWARE", name, {
				type: "test",
				message: `Hello ${name}!`,
			});
		});
	};

	return (
		<div className="p-4 border rounded-lg bg-white shadow-sm">
			<h2 className="text-lg font-semibold mb-4">
				WebSocket Connection Status
			</h2>

			{/* Overall status */}
			<div className="flex items-center gap-2 mb-4">
				<div
					className={`w-3 h-3 rounded-full ${
						allConnected ? "bg-green-500" : "bg-red-500"
					}`}
				/>
				<span>{allConnected ? "All Connected" : "Some Disconnected"}</span>
			</div>

			{/* Group by category */}
			<div className="space-y-4 mb-4">
				{Object.entries(connections).map(([category, endpoints]) => (
					<div
						key={category}
						className="space-y-2"
					>
						<h3 className="font-medium text-sm text-gray-500">{category}</h3>
						<div className="space-y-1 ml-2">
							{Object.entries(endpoints).map(
								([name, { isConnected, error }]) => (
									<div
										key={name}
										className="flex items-center gap-2 text-sm"
									>
										<div
											className={`w-2 h-2 rounded-full ${
												isConnected ? "bg-green-500" : "bg-red-500"
											}`}
										/>
										<span className="font-medium">{name}:</span>
										<span>{isConnected ? "Connected" : "Disconnected"}</span>
										{error && (
											<span className="text-red-500 text-xs">({error})</span>
										)}
									</div>
								)
							)}
						</div>
					</div>
				))}
			</div>

			{testResponse && (
				<div className="text-green-600 mb-4 p-2 bg-green-50 rounded">
					Response: {testResponse}
				</div>
			)}

			<button
				onClick={handleTestMessage}
				disabled={!connections.HARDWARE?.CASH_DRAWER?.isConnected}
				className={`px-4 py-2 rounded-lg ${
					connections.HARDWARE?.CASH_DRAWER?.isConnected
						? "bg-blue-500 hover:bg-blue-600 text-white"
						: "bg-gray-300 text-gray-500 cursor-not-allowed"
				}`}
			>
				Test Hardware Connections
			</button>
		</div>
	);
};
