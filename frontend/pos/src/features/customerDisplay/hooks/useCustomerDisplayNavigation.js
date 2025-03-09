// features/customerDisplay/hooks/useCustomerDisplayNavigation.js

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import customerDisplayManager from "../utils/windowManager";

export function useCustomerDisplayNavigation() {
	const location = useLocation();

	useEffect(() => {
		// Check if we're on the POS page
		const isPOSPage = location.pathname === "/pos";

		// If we're not on the POS page, reset to welcome screen
		if (!isPOSPage) {
			// Handle case where window might be closed
			try {
				customerDisplayManager.showWelcome();
			} catch (error) {
				console.error("Failed to show welcome screen:", error);
				// Attempt to reopen the window
				customerDisplayManager.openWindow();

				// Try again after a short delay
				setTimeout(() => {
					try {
						customerDisplayManager.showWelcome();
					} catch (secondError) {
						console.error(
							"Failed to show welcome screen after reopening window:",
							secondError
						);
					}
				}, 1000);
			}
		}

		// Handle logout page specifically
		if (location.pathname === "/login") {
			// Optionally close the window on logout
			// customerDisplayManager.closeWindow();

			// Or just ensure it shows welcome
			customerDisplayManager.showWelcome();
		}
	}, [location]);
}
