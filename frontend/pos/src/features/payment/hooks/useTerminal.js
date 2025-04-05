// src/features/payment/hooks/useTerminal.js
import { useContext } from "react";
import TerminalContext from "../contexts/TerminalContext";

// Custom hook to use the terminal context
export const useTerminal = () => {
	const context = useContext(TerminalContext);
	if (!context) {
		throw new Error("useTerminal must be used within a TerminalProvider");
	}
	return context;
};
