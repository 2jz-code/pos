// features/customerDisplay/components/CustomerDisplayApp.jsx

import { useEffect, useState } from "react";
import WelcomePage from "./WelcomePage";

const CustomerDisplay = () => {
	const [displayData, setDisplayData] = useState(null);

	useEffect(() => {
		// Listen for messages from the parent window
		const handleMessage = (event) => {
			// Make sure the message is from our parent window
			if (event.source === window.opener) {
				if (event.data.type === "CUSTOMER_DISPLAY_UPDATE") {
					setDisplayData(event.data.content);
				}
			}
		};

		window.addEventListener("message", handleMessage);

		// Notify the parent window that we're ready
		if (window.opener) {
			window.opener.postMessage("CUSTOMER_DISPLAY_READY", "*");
		}

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	// If we have display data, show it, otherwise show the welcome page
	return (
		<div className="customer-display-container">
			{displayData ? (
				<div className="customer-data">
					{/* Render the data received from the main window */}
					<pre>{JSON.stringify(displayData, null, 2)}</pre>
				</div>
			) : (
				<WelcomePage />
			)}
		</div>
	);
};

export default CustomerDisplay;
