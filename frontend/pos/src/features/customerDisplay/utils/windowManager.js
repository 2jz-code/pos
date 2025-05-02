import { useCartStore } from "../../../store/cartStore";
import { calculateCartTotals } from "../../cart/utils/cartCalculations";

class CustomerDisplayWindowManager {
	constructor() {
		this.displayWindow = null;
		this.windowFeatures = "width=800,height=600,resizable=yes";
		// Ensure the origin is correctly captured for postMessage security
		this.targetOrigin = window.location.origin;
		this.displayUrl = `${this.targetOrigin}?mode=customer-display`; // Use query parameter
		this.checkInterval = null;
		this.isOpening = false;
		this.messageListenerAdded = false;
		this.lastFlowData = null; // Holds the most recent data sent during a flow
		// Optional: Queue for messages to send once window is ready
		// this.messageQueue = [];
		// this.isWindowReady = false;
	}

	openWindow() {
		// Prevent multiple simultaneous open attempts
		if (this.isOpening) {
			console.log("Window opening already in progress.");
			return;
		}
		this.isOpening = true;

		// Check if window exists and is not closed
		if (this.displayWindow && !this.displayWindow.closed) {
			console.log("Window already open.");
			this.isOpening = false;
			return this.displayWindow;
		}

		console.log("Attempting to open customer display window...");
		// Reset state variables for a new window instance
		this.displayWindow = null;
		// this.isWindowReady = false;

		// Create a new window
		try {
			this.displayWindow = window.open(
				this.displayUrl,
				"customerDisplay", // Use a consistent name
				this.windowFeatures
			);

			// Start monitoring only if successfully opened
			if (this.displayWindow) {
				console.log("Customer display window opened successfully.");
				this.startMonitoring();
				this.setupMessageListener(); // Setup listener immediately
			} else {
				console.error(
					"window.open returned null. Check popup blocker settings."
				);
				// Reset flag if opening failed
				this.isOpening = false;
			}
		} catch (error) {
			console.error("Error opening customer display window:", error);
			// Reset flag on error
			this.isOpening = false;
		}

		// isOpening should ideally be set to false after the window confirms readiness or fails,
		// but for simplicity, we set it here. Consider using the ready message for more robust handling.
		this.isOpening = false;
		return this.displayWindow;
	}

	setupMessageListener() {
		// Remove previous listener if exists, to prevent duplicates on reopen
		if (this.messageHandler) {
			window.removeEventListener("message", this.messageHandler);
		}
		// Ensure flag is reset if setting up again
		this.messageListenerAdded = false;

		this.messageHandler = (event) => {
			// SECURITY: Always check the origin of the message
			if (event.origin !== this.targetOrigin) {
				console.warn(`Ignored message from unexpected origin: ${event.origin}`);
				return;
			}
			// Check if the message source is the window we opened
			if (event.source === this.displayWindow) {
				if (event.data === "CUSTOMER_DISPLAY_READY") {
					console.log("Customer display window is ready");
					// Handle readiness: Send queued messages or initial state
					// this.isWindowReady = true;
					// this.sendQueuedMessages(); // Example if using a queue
				}
				// Handle other potential messages from the customer display if needed
			}
		};

		window.addEventListener("message", this.messageHandler);
		this.messageListenerAdded = true;
		console.log("Message listener set up for customer display.");
	}

	startMonitoring() {
		// Clear any existing interval to avoid duplicates
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
		}
		console.log("Starting window monitoring.");
		// Check every 2 seconds if the window is still open
		this.checkInterval = setInterval(() => {
			if (this.displayWindow && this.displayWindow.closed) {
				console.log("Customer display window was closed, cleaning up...");
				this.displayWindow = null;
				clearInterval(this.checkInterval);
				this.checkInterval = null;
				this.messageListenerAdded = false; // Reset listener flag
				if (this.messageHandler) {
					window.removeEventListener("message", this.messageHandler);
					this.messageHandler = null;
				}
				// this.isWindowReady = false; // Reset ready state
				this.lastFlowData = null; // Clear state on close

				// Optional: Automatically reopen? Or rely on next action to reopen?
				// Consider if auto-reopening is desired behavior.
				// console.log("Attempting to reopen closed window...");
				// setTimeout(() => this.openWindow(), 1000);
			}
		}, 2000);
	}

	closeWindow() {
		console.log("Closing customer display window...");
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}

		if (this.messageHandler) {
			window.removeEventListener("message", this.messageHandler);
			this.messageHandler = null;
		}

		if (this.displayWindow && !this.displayWindow.closed) {
			this.displayWindow.close();
		}

		this.displayWindow = null;
		this.messageListenerAdded = false;
		// this.isWindowReady = false;
		this.lastFlowData = null; // Clear state on explicit close
	}

	sendDirectCashUpdateMessage(content) {
		console.log("Requesting direct cash update message:", content);

		// Ensure the essential 'type' is correct for the message payload
		const messagePayload = {
			type: "DIRECT_CASH_UPDATE", // Use the specific type CustomerDisplay.jsx expects
			content: content,
		};

		// OPTIONAL but recommended: Update lastFlowData if this represents the latest state
		// This helps keep the manager's internal state consistent if other actions follow.
		if (this.lastFlowData && content.orderId === this.lastFlowData.orderId) {
			this.lastFlowData = {
				...this.lastFlowData, // Keep existing context
				...content, // Overwrite with the new direct update content
				displayMode: "flow", // Ensure display mode is correct
				currentStep: "payment", // Ensure step is correct
			};
			// Clean up potential undefined properties after merge
			Object.keys(this.lastFlowData).forEach((key) => {
				if (this.lastFlowData[key] === undefined) {
					delete this.lastFlowData[key];
				}
			});
			console.log(
				"Updated lastFlowData based on direct cash update:",
				this.lastFlowData
			);
		} else {
			// If no flow data exists or order ID mismatch, just send without updating internal state broadly
			console.warn(
				"Sending DIRECT_CASH_UPDATE without updating lastFlowData (no prior flow or different order)."
			);
		}

		console.log("Prepared DIRECT_CASH_UPDATE payload:", messagePayload);

		// Use the internal, safe message sending method which handles window checks and targetOrigin
		this.sendRawMessage(messagePayload);
	}

	// Internal method for sending messages via postMessage
	// Ensures the window exists and is open before attempting to send.
	sendRawMessage(payload) {
		if (this.displayWindow && !this.displayWindow.closed) {
			try {
				// SECURITY: Use specific origin instead of '*'
				this.displayWindow.postMessage(payload, this.targetOrigin);
				console.log("Message sent successfully via postMessage:", payload);
			} catch (error) {
				console.error(
					"Error sending message via postMessage:",
					error,
					"Payload:",
					payload
				);
				// Handle potential errors like detached window
				if (error.name === "DataCloneError") {
					console.error(
						"DataCloneError: The message payload might contain non-serializable data."
					);
				}
				// Consider closing/reopening if sending fails persistently
			}
		} else {
			console.warn(
				"Attempted to send message, but display window is closed or null. Payload:",
				payload
			);
			// Optional: Queue message or try reopening
			// this.queueMessage(payload);
			// this.openWindow(); // Or handle based on desired UX
		}
	}

	// --- Public Methods for Controlling Display ---

	showCart() {
		console.log("Requesting to show cart on customer display.");
		// Get current cart state DIRECTLY when needed
		const cartItems = useCartStore.getState().cart;
		const orderDiscount = useCartStore.getState().orderDiscount;
		const orderId = useCartStore.getState().orderId;
		const { subtotal, taxAmount, total, discountAmount } = calculateCartTotals(
			cartItems,
			orderDiscount
		);

		const cartData = {
			items: cartItems,
			subtotal,
			taxAmount,
			total,
			discountAmount: discountAmount || 0,
			orderDiscount,
			orderId,
		};

		const messagePayload = {
			type: "CUSTOMER_DISPLAY_UPDATE",
			content: {
				displayMode: "cart",
				cart: cartData,
			},
		};

		// Ensure window is open before sending
		if (!this.displayWindow || this.displayWindow.closed) {
			this.openWindow();
			// Ideally wait for "CUSTOMER_DISPLAY_READY" before sending.
			// Using setTimeout as a fallback for simplicity here.
			setTimeout(() => this.sendRawMessage(messagePayload), 600); // Slightly increased delay
		} else {
			this.sendRawMessage(messagePayload);
		}
	}

	showWelcome() {
		console.log("Requesting to show welcome screen on customer display.");
		// ** FIX: Clear last flow data when resetting to Welcome screen **
		this.lastFlowData = null;
		// --------------------------------------------------------------

		const messagePayload = { type: "SHOW_WELCOME" };

		// Ensure window is open
		if (!this.displayWindow || this.displayWindow.closed) {
			this.openWindow();
			setTimeout(() => this.sendRawMessage(messagePayload), 600);
		} else {
			this.sendRawMessage(messagePayload);
		}
	}

	showRewardsRegistration() {
		console.log("Requesting to show rewards registration on customer display.");
		const messagePayload = { type: "SHOW_REWARDS" };
		if (!this.displayWindow || this.displayWindow.closed) {
			this.openWindow();
			setTimeout(() => this.sendRawMessage(messagePayload), 600);
		} else {
			this.sendRawMessage(messagePayload);
		}
	}

	// Method specifically to start the payment/customer interaction flow
	startCustomerFlow({
		initialStep = "tip", // Sensible default? Or maybe 'cartReview'
		paymentMethod = "credit",
		amountDue, // Explicitly pass the amount for *this* payment flow
		isSplitPayment = false,
		splitDetails = null,
	}) {
		console.log(
			`Starting customer flow. Step: ${initialStep}, Method: ${paymentMethod}, Amount Due: ${amountDue}`
		);
		// ** FIX: Clear any lingering flow data from previous transactions **
		this.lastFlowData = null;
		// -----------------------------------------------------------------

		// Get the complete current cart state at the moment the flow starts
		const currentCartItems = useCartStore.getState().cart;
		const currentOrderDiscount = useCartStore.getState().orderDiscount;
		const currentOrderId = useCartStore.getState().orderId;
		const { subtotal, taxAmount, total, discountAmount } = calculateCartTotals(
			currentCartItems,
			currentOrderDiscount
		);

		// Construct the full cart snapshot for context
		const cartDataSnapshot = {
			items: currentCartItems,
			subtotal,
			taxAmount,
			total, // Full order total
			orderId: currentOrderId,
			discountAmount: discountAmount || 0,
			orderDiscount: currentOrderDiscount,
		};

		// Prepare the initial content for the customer flow
		const flowContent = {
			currentStep: initialStep,
			cartData: cartDataSnapshot, // Pass the snapshot
			displayMode: "flow",
			paymentMethod,
			orderId: currentOrderId,
			isSplitPayment,
			splitDetails,
			// Payment-specific amounts for this flow instance
			currentPaymentAmount: amountDue, // The amount being handled *now*
			totalRemainingAmount: amountDue, // Initially, remaining is the full amount due
		};

		console.log("Initial customer flow content:", flowContent);
		this.lastFlowData = flowContent; // Store this initial state

		const messagePayload = {
			type: "START_CUSTOMER_FLOW",
			content: flowContent,
		};

		// Ensure window is open
		if (!this.displayWindow || this.displayWindow.closed) {
			this.openWindow();
			setTimeout(() => this.sendRawMessage(messagePayload), 600);
		} else {
			this.sendRawMessage(messagePayload);
		}
	}

	// Method to update the current step within an active customer flow
	updateCustomerFlowStep(step, stepData = {}) {
		console.log(`Updating customer flow step to: ${step}`, stepData);

		if (!this.lastFlowData) {
			console.error(
				"Cannot update flow step: No active flow data (lastFlowData is null). Was startCustomerFlow called?"
			);
			return;
		}

		// ** FIX: Avoid stale data by merging carefully and potentially re-fetching **
		// Start with the *previous* state of the flow as a base
		let updatedContent = { ...this.lastFlowData };

		// Update with the new step name and specific data provided for this step
		updatedContent.currentStep = step;
		updatedContent = { ...updatedContent, ...stepData }; // Overwrite with new stepData

		// ** Crucially, ensure amounts reflect the LATEST state provided in stepData **
		// The caller (e.g., useCustomerFlow) is responsible for providing accurate amounts.
		if (stepData.currentPaymentAmount !== undefined) {
			updatedContent.currentPaymentAmount = stepData.currentPaymentAmount;
		}
		if (stepData.totalRemainingAmount !== undefined) {
			updatedContent.totalRemainingAmount = stepData.totalRemainingAmount;
		}
		// Update cart data if provided, otherwise keep the snapshot from the flow start
		if (stepData.cartData) {
			updatedContent.cartData = {
				...updatedContent.cartData,
				...stepData.cartData,
			};
		}
		// Ensure top-level discount info matches the cart data snapshot (it shouldn't change mid-flow)
		updatedContent.orderDiscount = updatedContent.cartData.orderDiscount;
		updatedContent.discountAmount = updatedContent.cartData.discountAmount;

		// Clean up any potential undefined properties from merging
		Object.keys(updatedContent).forEach((key) => {
			if (updatedContent[key] === undefined) {
				delete updatedContent[key];
			}
		});

		console.log(
			"Prepared content for customer display update:",
			updatedContent
		);

		// Store this new state as the last known state for the *current* flow
		this.lastFlowData = updatedContent;

		const messagePayload = {
			type: "UPDATE_CUSTOMER_FLOW",
			content: updatedContent,
		};

		// Window should already be open if we are updating a flow step
		this.sendRawMessage(messagePayload);
	}

	// Listener setup for step completions coming FROM the customer display
	listenForCustomerFlowStepCompletion(callback) {
		const listenerId = `customerFlowCompleteListener_${Date.now()}`; // Unique ID for listener
		console.log(`Setting up listener: ${listenerId}`);

		const handleMessage = (event) => {
			// Origin and Source checks
			if (
				event.origin !== this.targetOrigin ||
				event.source !== this.displayWindow
			) {
				return;
			}

			if (event.data?.type === "CUSTOMER_FLOW_STEP_COMPLETE") {
				const content = event.data.content;
				if (content) {
					console.log(
						`Listener ${listenerId} received step completion:`,
						content.step,
						content.data
					);
					callback(content.step, content.data);
				} else {
					console.warn(
						`Listener ${listenerId} received CUSTOMER_FLOW_STEP_COMPLETE without content.`
					);
				}
			}
		};

		window.addEventListener("message", handleMessage);

		// Return a cleanup function to remove this specific listener
		return () => {
			console.log(`Cleaning up listener: ${listenerId}`);
			window.removeEventListener("message", handleMessage);
		};
	}

	// Listener for rewards registration completion
	listenForRewardsRegistration(callback) {
		const listenerId = `rewardsCompleteListener_${Date.now()}`;
		console.log(`Setting up listener: ${listenerId}`);

		const handleMessage = (event) => {
			// Origin and Source checks
			if (
				event.origin !== this.targetOrigin ||
				event.source !== this.displayWindow
			) {
				return;
			}

			if (event.data?.type === "REWARDS_REGISTRATION_COMPLETE") {
				console.log(
					`Listener ${listenerId} received rewards completion:`,
					event.data.content
				);
				callback(event.data.content);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => {
			console.log(`Cleaning up listener: ${listenerId}`);
			window.removeEventListener("message", handleMessage);
		};
	}
}

// Create a singleton instance
const customerDisplayManager = new CustomerDisplayWindowManager();
export default customerDisplayManager;
