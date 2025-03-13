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
					const flowContent = {
						...event.data.content,
						cartData: cartData,
					};
					setDisplayData(flowContent);
					setDisplayMode("flow");
				} else if (event.data.type === "UPDATE_CUSTOMER_FLOW") {
					// Preserve cart data if it's not included in the update
					const updatedContent = {
						...event.data.content,
						cartData:
							event.data.content.cartData ||
							(displayData ? displayData.cartData : cartData),
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
			return { items: [], subtotal: 0, taxAmount: 0, total: 0 };
		}

		// Use the existing utility to calculate totals
		const { subtotal, taxAmount, total } = calculateCartTotals(cartItems);

		return {
			items: cartItems,
			subtotal,
			taxAmount,
			total,
		};
	};

	// Handle flow step completion
	const handleFlowStepComplete = (step, stepData) => {
		// Send message back to parent window
		if (window.opener) {
			window.opener.postMessage(
				{
					type: "CUSTOMER_FLOW_STEP_COMPLETE",
					content: { step, data: stepData },
				},
				"*"
			);
		}
	};

	// Render the appropriate view based on the display mode
	const renderDisplay = () => {
		switch (displayMode) {
			case "welcome":
				return <WelcomePage />;
			case "cart":
				return <CartView cartData={processedCartData()} />;
			case "flow":
				return (
					<CustomerFlowView
						flowData={{
							...displayData,
							cartData: processedCartData(),
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
