// features/payment/utils/terminalSimulationManager.js

class TerminalSimulationManager {
	constructor() {
		this.terminalWindow = null;
		this.windowFeatures = "width=400,height=600,resizable=yes";
		this.terminalUrl = `${window.location.origin}?mode=terminal-simulation`;
		this.checkInterval = null;
		this.isOpening = false;
		this.messageListenerAdded = false;
		this.paymentData = null;
	}

	openWindow(paymentData) {
		console.log(paymentData);
		// Prevent multiple simultaneous open attempts
		if (this.isOpening) return;
		this.isOpening = true;

		// Store payment data for use when window is ready
		this.paymentData = paymentData;

		// Check if window exists and is not closed
		if (this.terminalWindow && !this.terminalWindow.closed) {
			this.sendPaymentDataToTerminal(paymentData);
			this.isOpening = false;
			return this.terminalWindow;
		}

		// Create a new window
		try {
			this.terminalWindow = window.open(
				this.terminalUrl,
				"terminalSimulation",
				this.windowFeatures
			);

			// Start monitoring only if successfully opened
			if (this.terminalWindow) {
				this.startMonitoring();
				this.setupMessageListener();
			}
		} catch (error) {
			console.error("Error opening terminal simulation window:", error);
		}

		this.isOpening = false;
		return this.terminalWindow;
	}

	setupMessageListener() {
		if (this.messageListenerAdded) return;

		// Listen for messages from the terminal window
		window.addEventListener("message", (event) => {
			// Make sure the message is from our terminal window
			if (event.source === this.terminalWindow) {
				if (event.data === "TERMINAL_SIMULATION_READY") {
					console.log("Terminal simulation window is ready");
					// Send initial payment data if available
					if (this.paymentData) {
						this.sendPaymentDataToTerminal(this.paymentData);
					}
				} else if (event.data.type === "PAYMENT_RESULT") {
					// Handle payment result
					this.handlePaymentResult(event.data.content);
				}
			}
		});

		this.messageListenerAdded = true;
	}

	sendPaymentDataToTerminal(paymentData) {
		if (this.terminalWindow && !this.terminalWindow.closed) {
			this.terminalWindow.postMessage(
				{
					type: "PAYMENT_REQUEST",
					content: paymentData,
				},
				"*"
			);
		}
	}

	handlePaymentResult(result) {
		// Dispatch a custom event that can be listened to
		const event = new CustomEvent("terminal:paymentResult", {
			detail: result,
		});
		window.dispatchEvent(event);

		// Close the terminal window after successful payment
		if (result.status === "success") {
			setTimeout(() => this.closeWindow(), 2000);
		}
	}

	startMonitoring() {
		// Clear any existing interval to avoid duplicates
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
		}

		// Check every 2 seconds if the window is still open
		this.checkInterval = setInterval(() => {
			if (this.terminalWindow && this.terminalWindow.closed) {
				console.log("Terminal simulation window was closed");
				this.terminalWindow = null;
				clearInterval(this.checkInterval);
				this.checkInterval = null;

				// Dispatch event indicating terminal window was closed
				const event = new CustomEvent("terminal:windowClosed");
				window.dispatchEvent(event);
			}
		}, 2000);
	}

	closeWindow() {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}

		if (this.terminalWindow && !this.terminalWindow.closed) {
			this.terminalWindow.close();
		}

		this.terminalWindow = null;
	}
}

// Create a singleton instance
const terminalSimulationManager = new TerminalSimulationManager();
export default terminalSimulationManager;
