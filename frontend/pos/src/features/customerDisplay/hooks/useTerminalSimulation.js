// features/payment/hooks/useTerminalSimulation.js

import { useContext, useEffect } from "react";
import TerminalSimulationContext from "../contexts/TerminalSimulationContext";

export function useTerminalSimulation() {
	const context = useContext(TerminalSimulationContext);

	if (!context) {
		throw new Error(
			"useTerminalSimulation must be used within a TerminalSimulationProvider"
		);
	}

	const { setupPaymentResultListener, ...rest } = context;

	// Set up event listeners when the hook is used
	useEffect(() => {
		const cleanup = setupPaymentResultListener();
		return cleanup;
	}, [setupPaymentResultListener]);

	return rest;
}
