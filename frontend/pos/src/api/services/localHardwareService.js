// frontend-pos/api/services/localHardwareService.js
import { toast } from "react-toastify"; // Or your preferred notification library

// Get the agent URL from environment variables
const AGENT_BASE_URL = import.meta.env.VITE_HARDWARE_AGENT_URL;

/**
 * Sends a print request to the local hardware agent.
 *
 * @param {object} receiptData - The receipt data payload (matching backend's receipt_payload structure).
 * @param {boolean} openDrawer - Whether to open the cash drawer after printing.
 * @returns {Promise<{success: boolean, message: string}>} - Promise resolving with success status and message.
 */
export const printReceiptWithAgent = async (
	receiptData,
	openDrawer = false
) => {
	if (!AGENT_BASE_URL) {
		console.error(
			"Hardware Agent URL (VITE_HARDWARE_AGENT_URL) is not configured."
		);
		toast.error("Hardware Agent is not configured. Cannot print receipt.");
		return { success: false, message: "Hardware Agent URL not configured." };
	}

	const endpoint = `${AGENT_BASE_URL}/print`;
	console.log(`Sending print request to agent: ${endpoint}`);
	console.log("Receipt Data:", receiptData); // Log data being sent
	console.log("Open Drawer Flag:", openDrawer);

	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				receipt_data: receiptData, // Ensure payload matches agent expectation
				open_drawer: openDrawer,
			}),
			// Add mode: 'cors' if needed, though localhost might not require it depending on browser
			// mode: 'cors',
		});

		const result = await response.json();

		if (!response.ok || result.status !== "success") {
			const errorMessage =
				result.message || `Agent error: ${response.statusText}`;
			console.error(`Hardware Agent print error: ${errorMessage}`, result);
			toast.error(`Receipt Print Failed: ${errorMessage}`);
			return { success: false, message: errorMessage };
		}

		console.log("Hardware Agent print success:", result.message);
		toast.success("Receipt sent to printer.");
		return { success: true, message: result.message };
	} catch (error) {
		console.error(
			"Network or other error calling hardware agent for print:",
			error
		);
		// Handle specific errors like network failure
		let userMessage = "Could not connect to the hardware agent. Is it running?";
		if (
			error instanceof TypeError &&
			error.message.includes("Failed to fetch")
		) {
			// Common error if agent isn't running or CORS issue
			userMessage =
				"Failed to fetch from hardware agent. Check if it's running and accessible.";
		} else if (error instanceof SyntaxError) {
			// JSON parsing error from agent response
			userMessage = "Invalid response from hardware agent.";
		} else {
			userMessage = `Error printing receipt: ${error.message}`;
		}
		toast.error(userMessage);
		return { success: false, message: userMessage };
	}
};

/**
 * Sends an open drawer request to the local hardware agent.
 *
 * @returns {Promise<{success: boolean, message: string}>} - Promise resolving with success status and message.
 */
export const openDrawerWithAgent = async () => {
	if (!AGENT_BASE_URL) {
		console.error(
			"Hardware Agent URL (VITE_HARDWARE_AGENT_URL) is not configured."
		);
		toast.error("Hardware Agent is not configured. Cannot open drawer.");
		return { success: false, message: "Hardware Agent URL not configured." };
	}

	const endpoint = `${AGENT_BASE_URL}/open_drawer`;
	console.log(`Sending open drawer request to agent: ${endpoint}`);

	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json", // Even if no body, good practice
			},
			// No body needed for open_drawer endpoint
		});

		const result = await response.json();

		if (!response.ok || result.status !== "success") {
			const errorMessage =
				result.message || `Agent error: ${response.statusText}`;
			console.error(`Hardware Agent drawer error: ${errorMessage}`, result);
			toast.error(`Open Drawer Failed: ${errorMessage}`);
			return { success: false, message: errorMessage };
		}

		console.log("Hardware Agent drawer success:", result.message);
		toast.info("Cash drawer open command sent."); // Use info or success
		return { success: true, message: result.message };
	} catch (error) {
		console.error(
			"Network or other error calling hardware agent for drawer:",
			error
		);
		let userMessage = "Could not connect to the hardware agent. Is it running?";
		if (
			error instanceof TypeError &&
			error.message.includes("Failed to fetch")
		) {
			userMessage =
				"Failed to fetch from hardware agent. Check if it's running and accessible.";
		} else if (error instanceof SyntaxError) {
			userMessage = "Invalid response from hardware agent.";
		} else {
			userMessage = `Error opening drawer: ${error.message}`;
		}
		toast.error(userMessage);
		return { success: false, message: userMessage };
	}
};

/**
 * Checks the status of the hardware agent itself.
 *
 * @returns {Promise<object|null>} - Promise resolving with agent status or null on error.
 */
export const checkAgentStatus = async () => {
	if (!AGENT_BASE_URL) {
		console.error(
			"Hardware Agent URL (VITE_HARDWARE_AGENT_URL) is not configured."
		);
		return null;
	}
	const endpoint = `${AGENT_BASE_URL}/status`;
	try {
		const response = await fetch(endpoint);
		if (!response.ok) {
			console.warn(`Hardware agent status check failed: ${response.status}`);
			return null;
		}
		return await response.json();
	} catch (error) {
		console.error("Error checking hardware agent status:", error);
		return null;
	}
};
