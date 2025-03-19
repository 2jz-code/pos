// Create a new file: usePaymentNavigation.js

import { useCallback } from "react";
import { useCartStore } from "../../../store/cartStore";
import customerDisplayManager from "../../customerDisplay/utils/windowManager";
import { calculateCartTotals } from "../../cart/utils/cartCalculations";

export function usePaymentNavigation() {
	// Function to reset display to cart when leaving payment views
	const resetToCart = useCallback(() => {
		const cart = useCartStore.getState().cart;

		if (!Array.isArray(cart) || cart.length === 0) {
			customerDisplayManager.showWelcome();
			return;
		}

		// Calculate cart totals
		const { subtotal, taxAmount, total } = calculateCartTotals(cart);

		// Show cart in customer display
		try {
			if (
				!customerDisplayManager.displayWindow ||
				customerDisplayManager.displayWindow.closed
			) {
				customerDisplayManager.openWindow();

				setTimeout(() => {
					customerDisplayManager.displayWindow.postMessage(
						{
							type: "CUSTOMER_DISPLAY_UPDATE",
							content: {
								displayMode: "cart",
								cart: {
									items: cart,
									subtotal,
									taxAmount,
									total,
									orderId: cart.orderId,
								},
							},
						},
						"*"
					);
				}, 500);
			} else {
				customerDisplayManager.displayWindow.postMessage(
					{
						type: "CUSTOMER_DISPLAY_UPDATE",
						content: {
							displayMode: "cart",
							cart: {
								items: cart,
								subtotal,
								taxAmount,
								total,
								orderId: cart.orderId,
							},
						},
					},
					"*"
				);
			}

			console.log("Reset customer display to cart view");
		} catch (err) {
			console.error("Error resetting display to cart:", err);
		}
	}, []);

	return { resetToCart };
}
