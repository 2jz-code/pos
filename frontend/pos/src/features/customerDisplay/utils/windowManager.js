// features/customerDisplay/utils/windowManager.js
import { useCartStore } from "../../../store/cartStore";
import { calculateCartTotals } from "../../cart/utils/cartCalculations";

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
		// Get cart data from the store
		const cart = useCartStore.getState().cart;
		const { subtotal, taxAmount, total } = calculateCartTotals(cart);

		const cartData = {
			items: cart,
			subtotal,
			taxAmount,
			total,
			orderId: cart.orderId,
		};

		if (!this.displayWindow || this.displayWindow.closed) {
			this.openWindow();

			// Give it a moment to initialize
			setTimeout(() => {
				if (this.displayWindow && !this.displayWindow.closed) {
					this.displayWindow.postMessage(
						{
							type: "CUSTOMER_DISPLAY_UPDATE",
							content: {
								displayMode: "cart",
								cart: cartData,
							},
						},
						"*"
					);
				}
			}, 500);
		} else {
			this.displayWindow.postMessage(
				{
					type: "CUSTOMER_DISPLAY_UPDATE",
					content: {
						displayMode: "cart",
						cart: cartData,
					},
				},
				"*"
			);
		}
	}

	// New method to show welcome screen in customer display
	showWelcome() {
		if (!this.displayWindow || this.displayWindow.closed) {
			this.openWindow();

			// Give it a moment to initialize before sending the welcome message
			setTimeout(() => {
				if (this.displayWindow && !this.displayWindow.closed) {
					this.displayWindow.postMessage({ type: "SHOW_WELCOME" }, "*");
				}
			}, 500);
		} else {
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

	showRewardsRegistration() {
		if (!this.displayWindow || this.displayWindow.closed) {
			this.openWindow();

			// Give it a moment to initialize
			setTimeout(() => {
				if (this.displayWindow && !this.displayWindow.closed) {
					this.displayWindow.postMessage(
						{
							type: "SHOW_REWARDS",
						},
						"*"
					);
				}
			}, 500);
		} else {
			this.displayWindow.postMessage(
				{
					type: "SHOW_REWARDS",
				},
				"*"
			);
		}
	}

	// Also add a method to listen for rewards registration completion
	listenForRewardsRegistration(callback) {
		const handleMessage = (event) => {
			if (
				event.source === this.displayWindow &&
				event.data.type === "REWARDS_REGISTRATION_COMPLETE"
			) {
				callback(event.data.content);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}

	startCustomerFlow(
		cartItems,
		initialStep = "cart",
		paymentMethod = "credit",
		orderTotal = 0,
		isSplitPayment = false,
		splitDetails = null,
		splitOrderData = null
	) {
		// Use existing utility to calculate totals
		const { subtotal, taxAmount, total } = calculateCartTotals(cartItems);
		const orderId = useCartStore.getState().cart.orderId;

		// Use split order data if provided, otherwise use calculated cart data
		const cartData = splitOrderData
			? {
					...splitOrderData,
					items: cartItems,
					orderId: orderId,
			  }
			: {
					items: cartItems,
					subtotal,
					taxAmount,
					total,
					orderId: orderId,
			  };

		// Add initial cash data if it's a cash payment
		const cashData =
			paymentMethod === "cash"
				? {
						cashTendered: 0,
						change: 0,
						amountPaid: 0,
						remainingAmount:
							orderTotal || (splitOrderData ? splitOrderData.total : total),
						isFullyPaid:
							(orderTotal || (splitOrderData ? splitOrderData.total : total)) <=
							0,
						isSplitPayment,
				  }
				: null;

		if (!this.displayWindow || this.displayWindow.closed) {
			this.openWindow();

			// Give it a moment to initialize
			setTimeout(() => {
				if (this.displayWindow && !this.displayWindow.closed) {
					this.displayWindow.postMessage(
						{
							type: "START_CUSTOMER_FLOW",
							content: {
								currentStep: initialStep,
								cartData,
								displayMode: "flow",
								paymentMethod,
								cashData,
								orderId: orderId,
								isSplitPayment,
								splitDetails,
								splitOrderData,
							},
						},
						"*"
					);
				}
			}, 500);
		} else {
			this.displayWindow.postMessage(
				{
					type: "START_CUSTOMER_FLOW",
					content: {
						currentStep: initialStep,
						cartData,
						displayMode: "flow",
						paymentMethod,
						cashData,
						orderId: orderId,
						isSplitPayment,
						splitDetails,
						splitOrderData,
					},
				},
				"*"
			);
		}
	}

	// Helper methods for calculating cart totals
	calculateSubtotal(cartItems) {
		if (!Array.isArray(cartItems)) return 0;
		return cartItems.reduce((total, item) => {
			const price = parseFloat(item.price) || 0;
			const quantity = parseInt(item.quantity) || 0;
			const discount = parseFloat(item.discount) || 0;

			// Apply discount if present
			const itemTotal = price * quantity;
			const discountAmount = itemTotal * (discount / 100);

			return total + (itemTotal - discountAmount);
		}, 0);
	}

	calculateTax(cartItems) {
		const subtotal = this.calculateSubtotal(cartItems);
		return subtotal * 0.1; // Assuming 10% tax rate
	}

	calculateTotal(cartItems) {
		const subtotal = this.calculateSubtotal(cartItems);
		const tax = this.calculateTax(cartItems);
		return subtotal + tax;
	}

	updateCustomerFlowStep(step, stepData = {}) {
		console.log(
			"WindowManager.updateCustomerFlowStep called with:",
			step,
			stepData
		);

		// Preserve cart data and orderId if they exist
		const cartData =
			stepData.cartData ||
			(this.lastFlowData ? this.lastFlowData.cartData : null);

		const orderId =
			stepData.orderId ||
			(cartData ? cartData.orderId : null) ||
			(this.lastFlowData ? this.lastFlowData.orderId : null);

		const content = {
			currentStep: step,
			...stepData,
			cartData,
			orderId,
			displayMode: "flow",
		};

		console.log("Prepared content for customer display:", content);

		// Store last flow data for reference
		this.lastFlowData = content;

		if (!this.displayWindow || this.displayWindow.closed) {
			console.log("Display window not available, opening new window");
			this.openWindow();
			setTimeout(() => {
				if (this.displayWindow && !this.displayWindow.closed) {
					this.sendUpdateMessage(content);
				}
			}, 500);
		} else {
			this.sendUpdateMessage(content);
		}
	}

	sendUpdateMessage(content) {
		try {
			console.log("Sending message to customer display:", content);
			this.displayWindow.postMessage(
				{
					type: "UPDATE_CUSTOMER_FLOW",
					content,
				},
				"*"
			);
			console.log("Message sent successfully");
		} catch (error) {
			console.error("Error sending update to customer display:", error);
		}
	}

	listenForCustomerFlowStepCompletion(callback) {
		const handleMessage = (event) => {
			if (
				event.source === this.displayWindow &&
				event.data.type === "CUSTOMER_FLOW_STEP_COMPLETE"
			) {
				callback(event.data.content.step, event.data.content.data);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}
}

// Create a singleton instance
const customerDisplayManager = new CustomerDisplayWindowManager();
export default customerDisplayManager;
