// src/features/cart/hooks/useCart.js
import { useEffect } from "react";
import { useCartStore } from "../../../store/cartStore";
import axiosInstance from "../../../api/config/axiosConfig";
import { checkOrderStatus } from "../../../utils/cartUtils";

export const useCart = () => {
	const {
		cart,
		orderId,
		showOverlay,
		setShowOverlay,
		setCart,
		orderDiscount,
		setOrderDiscount,
	} = useCartStore();

	useEffect(() => {
		const initializeCart = async () => {
			if (orderId) {
				const { isValid, data } = await checkOrderStatus(
					orderId,
					axiosInstance
				);

				if (!isValid) {
					useCartStore.setState({
						orderId: null,
						cart: [],
						orderDiscount: null,
					});
					setShowOverlay(true);
				} else {
					setShowOverlay(false);
					setCart(data.items);

					// If the order has a discount, load it
					if (data.discount) {
						// Get the discount details and set in store
						try {
							const discountResponse = await axiosInstance.get(
								`discounts/${data.discount}/`
							);
							setOrderDiscount(discountResponse.data);
						} catch (error) {
							console.error("Failed to load discount details:", error);
						}
					}
				}
			} else {
				setShowOverlay(true);
			}
		};

		initializeCart();
	}, [orderId, setShowOverlay, setCart, setOrderDiscount]);

	return {
		cart,
		orderId,
		showOverlay,
		orderDiscount,
	};
};
