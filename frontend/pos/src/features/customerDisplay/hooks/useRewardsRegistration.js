// features/customerDisplay/hooks/useRewardsRegistration.js

import { useState, useEffect, useCallback } from "react";
import customerDisplayManager from "../utils/windowManager";

export function useRewardsRegistration() {
	const [registrationData, setRegistrationData] = useState(null);
	const [isRegistering, setIsRegistering] = useState(false);

	// Start the rewards registration process
	const startRegistration = useCallback(() => {
		setIsRegistering(true);
		customerDisplayManager.showRewardsRegistration();
	}, []);

	// Set up rewards registration listener
	useEffect(() => {
		let cleanup = () => {};

		if (isRegistering) {
			cleanup = customerDisplayManager.listenForRewardsRegistration((data) => {
				setRegistrationData(data);
				setIsRegistering(false);
			});
		}

		return cleanup;
	}, [isRegistering]);

	return {
		registrationData,
		isRegistering,
		startRegistration,
	};
}
