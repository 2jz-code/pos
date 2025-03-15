// features/customerDisplay/components/CustomerDisplay.jsx

import { useEffect, useState } from "react";
import WelcomePage from "./WelcomePage";
import CartView from "./cart/CartView";
import CustomerFlowView from "./flow/CustomerFlowView";
import { calculateCartTotals } from "../../cart/utils/cartCalculations";

const CustomerDisplay = () => {
	const [displayData, setDisplayData] = useState(null);
	const [displayMode, setDisplayMode] = useState("welcome");
	const [cartData, setCartData] = useState(null);

	// Load cart data from localStorage
	useEffect(() => {
		const loadCartFromStorage = () => {
			try {
				// Get cart data from localStorage (where Zustand persists it)
				const storedCartData = localStorage.getItem("cart-storage");
				if (storedCartData) {
					const parsedData = JSON.parse(storedCartData);
					if (parsedData && parsedData.state) {
						setCartData(parsedData.state);
					}
				}
			} catch (error) {
				console.error("Error loading cart from localStorage:", error);
			}
		};

		// Load initially
		loadCartFromStorage();

		// Set up storage event listener to update when localStorage changes
		const handleStorageChange = (event) => {
			if (event.key === "cart-storage") {
				loadCartFromStorage();
			}
		};

		window.addEventListener("storage", handleStorageChange);

		return () => {
			window.removeEventListener("storage", handleStorageChange);
		};
	}, []);

	useEffect(() => {
		const handleMessage = (event) => {
			if (event.source === window.opener) {
				if (event.data.type === "CUSTOMER_DISPLAY_UPDATE") {
					setDisplayData(event.data.content);
					setDisplayMode(event.data.content.displayMode || "custom");
				} else if (event.data.type === "SHOW_CART") {
					// Instead of setting displayMode to "cart", set to "flow" with cart step
					setDisplayMode("flow");
					setDisplayData({
						...displayData,
						currentStep: "cart",
					});
				} else if (event.data.type === "SHOW_WELCOME") {
					setDisplayMode("welcome");
				} else if (event.data.type === "START_CUSTOMER_FLOW") {
					// Ensure orderId is properly captured and propagated
					const orderId = event.data.content.orderId;
					console.log("Starting customer flow with orderId:", orderId);

					const flowContent = {
						...event.data.content,
						cartData: {
							...(cartData || {}),
							...event.data.content.cartData,
							orderId: orderId,
						},
						orderId: orderId,
					};
					setDisplayData(flowContent);
					setDisplayMode("flow");
				} else if (event.data.type === "UPDATE_CUSTOMER_FLOW") {
					// Preserve cart data and orderId if it's not included in the update
					const updatedContent = {
						...event.data.content,
						cartData: {
							...(displayData?.cartData || {}),
							...(event.data.content.cartData || {}),
						},
						orderId: event.data.content.orderId || displayData?.orderId,
					};
					setDisplayData(updatedContent);
					// Keep the display mode as flow
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
	}, [displayData, cartData]);

	// Process cart data using the utility function
	const processedCartData = () => {
		// Use cart from localStorage if available, otherwise fall back to display data
		const cartItems =
			cartData?.cart || (displayData?.cart ? displayData.cart : []);

		if (!Array.isArray(cartItems) || cartItems.length === 0) {
			return {
				items: [],
				subtotal: 0,
				taxAmount: 0,
				total: 0,
				orderId: displayData?.orderId || null,
			};
		}

		// Use the existing utility to calculate totals
		const { subtotal, taxAmount, total } = calculateCartTotals(cartItems);

		// Include the order ID from display data if available
		return {
			items: cartItems,
			subtotal,
			taxAmount,
			total,
			orderId: displayData?.orderId || cartData?.orderId || null,
		};
	};

	// Handle flow step completion
	const handleFlowStepComplete = (step, stepData) => {
		// Send message back to parent window
		if (window.opener) {
			window.opener.postMessage(
				{
					type: "CUSTOMER_FLOW_STEP_COMPLETE",
					content: {
						step,
						data: {
							...stepData,
							orderId: displayData?.orderId, // Include orderId in step completion
						},
					},
				},
				"*"
			);
		}
	};

	// Render the appropriate view based on the display mode
	const renderDisplay = () => {
		const processedData = processedCartData();
		console.log("Processed cart data with orderId:", processedData.orderId);

		switch (displayMode) {
			case "welcome":
				return <WelcomePage />;
			case "cart":
				return <CartView cartData={processedData} />;
			case "flow":
				return (
					<CustomerFlowView
						flowData={{
							...displayData,
							cartData: processedData,
							orderId: displayData?.orderId || processedData.orderId,
						}}
						onStepComplete={handleFlowStepComplete}
					/>
				);
			case "custom":
			default:
				return (
					<div className="customer-data">
						<pre>{JSON.stringify(displayData, null, 2)}</pre>
					</div>
				);
		}
	};

	return (
		<div className="customer-display-container h-screen w-screen">
			{renderDisplay()}
		</div>
	);
};

export default CustomerDisplay;
