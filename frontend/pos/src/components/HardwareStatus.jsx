// src/components/HardwareStatus.jsx
import { useHardwareSocket } from "../hooks/useHardwareSocket";
import { useState, useEffect } from "react";
// src/components/HardwareStatus.jsx
export const HardwareStatus = () => {
	const { isConnected, error, sendMessage } = useHardwareSocket();
	const [testResponse, setTestResponse] = useState(null);

	useEffect(() => {
		const handleMessage = (e) => {
			const data = e.detail;
			if (data.type === "test_response") {
				setTestResponse(data.message);
			}
		};

		window.addEventListener("hardware-message", handleMessage);
		return () => window.removeEventListener("hardware-message", handleMessage);
	}, []);

	const handleTestMessage = () => {
		setTestResponse(null);
		sendMessage({
			type: "test",
			message: "Hello Hardware!",
		});
	};

	return (
		<div className="p-4 border rounded-lg bg-white shadow-sm">
			<h2 className="text-lg font-semibold mb-4">Hardware Connection Status</h2>

			<div className="flex items-center gap-2 mb-4">
				<div
					className={`w-3 h-3 rounded-full ${
						isConnected ? "bg-green-500" : "bg-red-500"
					}`}
				/>
				<span>{isConnected ? "Connected" : "Disconnected"}</span>
			</div>

			{error && <div className="text-red-600 mb-4">Error: {error}</div>}

			{testResponse && (
				<div className="text-green-600 mb-4">Response: {testResponse}</div>
			)}

			<button
				onClick={handleTestMessage}
				disabled={!isConnected}
				className={`px-4 py-2 rounded-lg ${
					isConnected
						? "bg-blue-500 hover:bg-blue-600 text-white"
						: "bg-gray-300 text-gray-500 cursor-not-allowed"
				}`}
			>
				Send Test Message
			</button>
		</div>
	);
};
