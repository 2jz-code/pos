// src/components/debug/HardwareAgentTest.jsx (or place in a suitable directory)
import { useState, useCallback } from "react";
import {
	checkAgentStatus,
	printReceiptWithAgent,
	openDrawerWithAgent,
} from "../api/services/localHardwareService";

// Basic mock receipt data for testing
const mockReceiptData = {
	id: "TEST-123",
	timestamp: new Date().toISOString(),
	items: [
		{ product_name: "Test Item 1", quantity: 2, unit_price: "5.00" },
		{ product_name: "Test Item 2", quantity: 1, unit_price: "12.50" },
	],
	subtotal: "22.50",
	tax: "2.25",
	discount_amount: "0.00",
	tip_amount: "3.00",
	total_amount: "27.75",
	payment: {
		method: "cash", // Test cash scenario
		status: "completed",
		is_split_payment: false,
		transactions: [
			{
				method: "cash",
				amount: "27.75",
				status: "completed",
				timestamp: new Date().toISOString(),
				metadata: {}, // Empty metadata for cash
				cashTendered: "30.00", // Example tendered amount
				change: "2.25", // Example change
			},
		],
	},
};

function HardwareAgentTest() {
	const [agentStatus, setAgentStatus] = useState(null);
	const [lastResponse, setLastResponse] = useState(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleCheckStatus = useCallback(async () => {
		setIsLoading(true);
		setLastResponse(null);
		setAgentStatus(null);
		console.log("Testing Agent Status...");
		const statusResult = await checkAgentStatus();
		setAgentStatus(statusResult);
		setLastResponse(
			statusResult
				? { status: "success", data: statusResult }
				: {
						status: "error",
						message: "Failed to get status or agent not running.",
				  }
		);
		setIsLoading(false);
		console.log("Agent Status Result:", statusResult);
	}, []);

	const handleTestPrint = useCallback(async (openDrawer) => {
		setIsLoading(true);
		setLastResponse(null);
		console.log(`Testing Print (Open Drawer: ${openDrawer})...`);
		const printResult = await printReceiptWithAgent(
			mockReceiptData,
			openDrawer
		);
		setLastResponse(printResult);
		setIsLoading(false);
		console.log("Print Result:", printResult);
	}, []);

	const handleOpenDrawer = useCallback(async () => {
		setIsLoading(true);
		setLastResponse(null);
		console.log("Testing Open Drawer...");
		const drawerResult = await openDrawerWithAgent();
		setLastResponse(drawerResult);
		setIsLoading(false);
		console.log("Open Drawer Result:", drawerResult);
	}, []);

	return (
		<div className="m-4 p-4 border border-dashed border-blue-500 rounded-lg bg-blue-50">
			<h3 className="text-lg font-semibold mb-3 text-blue-800">
				Local Hardware Agent Test
			</h3>
			<div className="space-y-3">
				{/* Status Button and Display */}
				<div>
					<button
						onClick={handleCheckStatus}
						disabled={isLoading}
						className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
					>
						{isLoading ? "Checking..." : "Check Agent Status"}
					</button>
					{agentStatus && (
						<div className="mt-2 p-2 text-xs bg-white border rounded shadow-sm">
							<p>
								<strong>Status:</strong> {agentStatus.status}
							</p>
							<p>
								<strong>Printer Connected:</strong>{" "}
								{agentStatus.printer_connected ? "Yes" : "No"}
							</p>
							<p>
								<strong>Printer Message:</strong> {agentStatus.printer_message}
							</p>
							<p>
								<strong>Agent URL:</strong>{" "}
								{import.meta.env.VITE_HARDWARE_AGENT_URL}
							</p>
							<p>
								<strong>Target Printer:</strong> {agentStatus.printer_ip}:
								{agentStatus.printer_port}
							</p>
						</div>
					)}
				</div>

				{/* Print Buttons */}
				<div className="flex space-x-2">
					<button
						onClick={() => handleTestPrint(false)}
						disabled={isLoading}
						className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
					>
						{isLoading ? "Printing..." : "Test Print (No Drawer)"}
					</button>
					<button
						onClick={() => handleTestPrint(true)}
						disabled={isLoading}
						className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 disabled:opacity-50"
					>
						{isLoading ? "Printing..." : "Test Print + Open Drawer"}
					</button>
				</div>

				{/* Open Drawer Button */}
				<div>
					<button
						onClick={handleOpenDrawer}
						disabled={isLoading}
						className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
					>
						{isLoading ? "Opening..." : "Test Open Drawer Only"}
					</button>
				</div>

				{/* Response Display */}
				{lastResponse && (
					<div
						className={`mt-3 p-3 text-sm border rounded shadow-sm ${
							lastResponse.success
								? "bg-green-50 border-green-200 text-green-800"
								: "bg-red-50 border-red-200 text-red-800"
						}`}
					>
						<p className="font-semibold">Last Action Response:</p>
						<pre className="mt-1 text-xs whitespace-pre-wrap break-words">
							{JSON.stringify(lastResponse, null, 2)}
						</pre>
					</div>
				)}
			</div>
		</div>
	);
}

export default HardwareAgentTest;
