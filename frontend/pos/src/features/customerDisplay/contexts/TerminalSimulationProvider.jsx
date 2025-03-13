// features/payment/contexts/TerminalSimulationProvider.jsx

import { useCallback, useState } from "react";
import PropTypes from "prop-types";
import TerminalSimulationContext from "./TerminalSimulationContext";
import terminalSimulationManager from "../utils/terminalSimulationManager";

export const TerminalSimulationProvider = ({ children }) => {
	const [currentPaymentData, setCurrentPaymentData] = useState(null);
	const [paymentStatus, setPaymentStatus] = useState("idle"); // idle, processing, success, error
	const [paymentResult, setPaymentResult] = useState(null);

	// Open terminal window and process payment
	const processPayment = useCallback((paymentData) => {
		setCurrentPaymentData(paymentData);
		setPaymentStatus("processing");
		setPaymentResult(null);
		// Open the terminal window with payment data
		terminalSimulationManager.openWindow(paymentData);
	}, []);

	// Listen for payment results
	const setupPaymentResultListener = useCallback(() => {
		const handlePaymentResult = (event) => {
			const result = event.detail;

			if (result.status === "success") {
				setPaymentStatus("success");
				setPaymentResult(result);
			} else {
				setPaymentStatus("error");
				setPaymentResult(result);
			}
		};

		const handleWindowClosed = () => {
			if (paymentStatus === "processing") {
				setPaymentStatus("error");
				setPaymentResult({
					error: "Payment cancelled - terminal window was closed",
				});
			}
		};

		// Add event listeners
		window.addEventListener("terminal:paymentResult", handlePaymentResult);
		window.addEventListener("terminal:windowClosed", handleWindowClosed);

		// Return cleanup function
		return () => {
			window.removeEventListener("terminal:paymentResult", handlePaymentResult);
			window.removeEventListener("terminal:windowClosed", handleWindowClosed);
		};
	}, [paymentStatus]);

	// Reset payment state
	const resetPayment = useCallback(() => {
		setPaymentStatus("idle");
		setPaymentResult(null);
		setCurrentPaymentData(null);
	}, []);

	// Close terminal window
	const closeTerminalWindow = useCallback(() => {
		terminalSimulationManager.closeWindow();
	}, []);

	return (
		<TerminalSimulationContext.Provider
			value={{
				processPayment,
				paymentStatus,
				paymentResult,
				currentPaymentData,
				setupPaymentResultListener,
				resetPayment,
				closeTerminalWindow,
			}}
		>
			{children}
		</TerminalSimulationContext.Provider>
	);
};

TerminalSimulationProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export default TerminalSimulationProvider;
