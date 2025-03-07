// features/customerDisplay/hooks/useCustomerDisplay.js

import { useEffect, useCallback } from "react";
import customerDisplayManager from "../utils/windowManager";

export function useCustomerDisplay() {
	// Open the customer display window
	const openCustomerDisplay = useCallback(() => {
		return customerDisplayManager.openWindow();
	}, []);

	// Close the customer display window
	const closeCustomerDisplay = useCallback(() => {
		customerDisplayManager.closeWindow();
	}, []);

	// Update content in the customer display
	const updateCustomerDisplay = useCallback((content) => {
		customerDisplayManager.updateContent(content);
	}, []);

	// Clean up when component unmounts
	useEffect(() => {
		return () => {
			// Optional: decide if you want to close the display when the parent component unmounts
			customerDisplayManager.closeWindow();
		};
	}, []);

	return {
		openCustomerDisplay,
		closeCustomerDisplay,
		updateCustomerDisplay,
	};
}
