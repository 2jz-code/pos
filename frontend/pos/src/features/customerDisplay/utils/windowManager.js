// features/customerDisplay/utils/windowManager.js

class CustomerDisplayWindowManager {
	constructor() {
		this.displayWindow = null;
		this.windowFeatures = "width=800,height=600,resizable=yes";
		this.displayUrl = `${window.location.origin}?mode=customer-display`; // Use query parameter
		this.checkInterval = null;
		this.isOpening = false;
		this.messageListenerAdded = false;
	}

	openWindow() {
		// Prevent multiple simultaneous open attempts
		if (this.isOpening) return;
		this.isOpening = true;

		// Check if window exists and is not closed
		if (this.displayWindow && !this.displayWindow.closed) {
			this.isOpening = false;
			return this.displayWindow;
		}

		// Create a new window
		try {
			this.displayWindow = window.open(
				this.displayUrl,
				"customerDisplay",
				this.windowFeatures
			);

			// Start monitoring only if successfully opened
			if (this.displayWindow) {
				this.startMonitoring();
				this.setupMessageListener();
			}
		} catch (error) {
			console.error("Error opening customer display window:", error);
		}

		this.isOpening = false;
		return this.displayWindow;
	}

	setupMessageListener() {
		if (this.messageListenerAdded) return;

		// Listen for messages from the customer display window
		window.addEventListener("message", (event) => {
			// Make sure the message is from our customer display window
			if (event.source === this.displayWindow) {
				if (event.data === "CUSTOMER_DISPLAY_READY") {
					console.log("Customer display window is ready");
					// You could send initial data here if needed
				}
			}
		});

		this.messageListenerAdded = true;
	}

	startMonitoring() {
		// Clear any existing interval to avoid duplicates
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
		}

		// Check every 2 seconds if the window is still open
		this.checkInterval = setInterval(() => {
			if (this.displayWindow && this.displayWindow.closed) {
				console.log("Customer display window was closed, reopening...");
				this.displayWindow = null;
				clearInterval(this.checkInterval);
				this.checkInterval = null;

				// Add a small delay before reopening
				setTimeout(() => this.openWindow(), 1000);
			}
		}, 2000);
	}

	closeWindow() {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}

		if (this.displayWindow && !this.displayWindow.closed) {
			this.displayWindow.close();
		}

		this.displayWindow = null;
	}

	showCart() {
		if (!this.displayWindow || this.displayWindow.closed) {
			this.openWindow();

			// Give it a moment to initialize
			setTimeout(() => {
				if (this.displayWindow && !this.displayWindow.closed) {
					this.displayWindow.postMessage({ type: "SHOW_CART" }, "*");
				}
			}, 500);
		} else {
			this.displayWindow.postMessage({ type: "SHOW_CART" }, "*");
		}
	}

	// New method to show welcome screen in customer display
	showWelcome() {
		if (this.displayWindow && !this.displayWindow.closed) {
			this.displayWindow.postMessage({ type: "SHOW_WELCOME" }, "*");
		}
	}

	// Override the updateContent method to include display mode
	updateContent(content, displayMode = "custom") {
		const contentWithMode = {
			...content,
			displayMode: displayMode,
		};

		if (!this.displayWindow || this.displayWindow.closed) {
			this.openWindow();

			// Give it a moment to initialize
			setTimeout(() => {
				if (this.displayWindow && !this.displayWindow.closed) {
					this.sendContentToWindow(contentWithMode);
				}
			}, 500);
		} else {
			this.sendContentToWindow(contentWithMode);
		}
	}

	sendContentToWindow(content) {
		try {
			if (this.displayWindow && !this.displayWindow.closed) {
				// Use postMessage for more secure cross-window communication
				this.displayWindow.postMessage(
					{
						type: "CUSTOMER_DISPLAY_UPDATE",
						content: content,
					},
					"*"
				);
			}
		} catch (error) {
			console.error("Error sending content to customer display:", error);
		}
	}
}

// Create a singleton instance
const customerDisplayManager = new CustomerDisplayWindowManager();
export default customerDisplayManager;
