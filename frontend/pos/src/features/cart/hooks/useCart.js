// src/features/cart/hooks/useCart.js
import { useEffect } from "react";
import { useCartStore } from "../../../store/cartStore";
import axiosInstance from "../../../api/config/axiosConfig";
import { checkOrderStatus } from "../../../utils/cartUtils";

export const useCart = () => {
	const { cart, orderId, showOverlay, setShowOverlay, setCart } =
		useCartStore();

	useEffect(() => {
		const initializeCart = async () => {
			if (orderId) {
				const { isValid, data } = await checkOrderStatus(
					orderId,
					axiosInstance
				);

				if (!isValid) {
					useCartStore.setState({ orderId: null, cart: [] });
					setShowOverlay(true);
				} else {
					setShowOverlay(false);
					setCart(data.items);
				}
			} else {
				setShowOverlay(true);
			}
		};

		initializeCart();
	}, [orderId, setShowOverlay, setCart]);

	return {
		cart,
		orderId,
		showOverlay,
	};
};
