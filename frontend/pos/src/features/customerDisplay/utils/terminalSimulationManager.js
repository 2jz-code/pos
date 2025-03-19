// features/payment/utils/terminalSimulationManager.js

// This class can be simplified since we're using real hardware now
class TerminalManager {
	constructor() {
		// No need for window management with real terminals
		this.paymentData = null;
		this.paymentCompletionCallback = null;
	}

	// Register a callback function to handle payment completion
	onPaymentComplete(callback) {
		this.paymentCompletionCallback = callback;
	}

	// Call this method when a payment is completed
	notifyPaymentComplete(result) {
		if (this.paymentCompletionCallback) {
			this.paymentCompletionCallback(result);
		}

		// Dispatch a custom event that can be listened to
		const event = new CustomEvent("terminal:paymentResult", {
			detail: result,
		});
		window.dispatchEvent(event);
	}
}

// Create a singleton instance
const terminalManager = new TerminalManager();
export default terminalManager;
