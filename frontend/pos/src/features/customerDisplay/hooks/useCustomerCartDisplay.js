// features/customerDisplay/hooks/useCustomerCartDisplay.js

import { useCallback, useEffect } from "react";
import { useCartStore } from "../../../store/cartStore";
import customerDisplayManager from "../utils/windowManager";

export function useCustomerCartDisplay() {
	const cart = useCartStore((state) => state.cart);

	// Function to update cart display
	const updateCartDisplay = useCallback(() => {
		if (cart && cart.length > 0) {
			customerDisplayManager.showCart(cart);
		}
	}, [cart]);

	// Function to show welcome screen
	const showWelcomeScreen = useCallback(() => {
		customerDisplayManager.showWelcome();
	}, []);

	// Update cart display whenever cart changes
	useEffect(() => {
		if (cart && cart.length > 0) {
			updateCartDisplay();
		}
	}, [cart, updateCartDisplay]);

	return {
		updateCartDisplay,
		showWelcomeScreen,
	};
}
