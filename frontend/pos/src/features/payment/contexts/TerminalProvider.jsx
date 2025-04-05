// src/features/payment/contexts/TerminalProvider.jsx
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import TerminalContext from "./TerminalContext";
import axiosInstance from "../../../api/config/axiosConfig";

// Terminal Provider component
export const TerminalProvider = ({ children }) => {
	const [status, setStatus] = useState("unknown");
	const [deviceInfo, setDeviceInfo] = useState(null);
	const [lastChecked, setLastChecked] = useState(null);
	const [isChecking, setIsChecking] = useState(false);

	// Check terminal status
	const checkStatus = async () => {
		if (isChecking) return; // Prevent multiple simultaneous checks

		setIsChecking(true);
		try {
			const response = await axiosInstance.get(
				"payments/terminal/reader-status/"
			);
			const responseData = response.data;

			if (responseData.success === true && responseData.reader) {
				const reader = responseData.reader;
				setStatus(reader.status);
				setDeviceInfo({
					type: reader.device_type || "Terminal",
					label: reader.label || "Card Reader",
					id: reader.id,
				});

				console.log(
					`Terminal status: ${reader.status}, Device: ${reader.device_type}, ID: ${reader.id}`
				);
			} else {
				setStatus("not_found");
				setDeviceInfo(null);
			}

			setLastChecked(new Date());
		} catch (error) {
			handleStatusCheckError(error);
		} finally {
			setIsChecking(false);
		}
	};

	const handleStatusCheckError = (error) => {
		if (error.response) {
			if (error.response.status === 404) {
				setStatus("not_found");
			} else if (
				error.response.status === 401 ||
				error.response.status === 403
			) {
				setStatus("unauthorized");
			} else {
				setStatus("error");
			}
			console.error(
				`Terminal status check failed: ${error.response.status}`,
				error.response.data
			);
		} else if (error.request) {
			setStatus("network_error");
			console.error("Network error when checking terminal status");
		} else {
			setStatus("error");
			console.error("Error setting up terminal status check:", error.message);
		}

		setDeviceInfo(null);
		setLastChecked(new Date());
	};

	// Check status on mount and every 30 seconds
	useEffect(() => {
		checkStatus();
		const interval = setInterval(checkStatus, 30000);
		return () => clearInterval(interval);
	}, []);

	// Cancel terminal action
	const cancelTerminalAction = async () => {
		if (!deviceInfo?.id) {
			console.error("No reader ID available for terminal cancellation");

			// Fallback - try to get reader info by making a direct API call
			try {
				console.log("Attempting to get reader info for cancellation");
				const response = await axiosInstance.get(
					"payments/terminal/reader-status/"
				);

				if (response.data.success && response.data.reader) {
					const readerId = response.data.reader.id;
					console.log(`Found reader ID for cancellation: ${readerId}`);

					// Now try to cancel with this reader ID
					const cancelResponse = await axiosInstance.post(
						"payments/terminal/cancel-action/",
						{ reader_id: readerId }
					);

					console.log(
						"Terminal cancellation response (fallback):",
						cancelResponse.data
					);
					return { success: true, data: cancelResponse.data };
				}
			} catch (fallbackError) {
				console.error("Error in fallback reader lookup:", fallbackError);
			}

			return { success: false, error: "No reader ID available" };
		}

		try {
			console.log(
				`Attempting to cancel terminal action on reader: ${deviceInfo.id}`
			);
			const response = await axiosInstance.post(
				"payments/terminal/cancel-action/",
				{ reader_id: deviceInfo.id }
			);
			console.log("Terminal cancellation response:", response.data);
			return { success: true, data: response.data };
		} catch (error) {
			console.error("Error cancelling terminal action:", error);
			return { success: false, error };
		}
	};

	// The context value
	const value = {
		status,
		deviceInfo,
		lastChecked,
		isChecking,
		checkStatus,
		cancelTerminalAction,
	};

	return (
		<TerminalContext.Provider value={value}>
			{children}
		</TerminalContext.Provider>
	);
};

// Add PropTypes validation
TerminalProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export default TerminalProvider;
