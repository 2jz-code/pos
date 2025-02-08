import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "../api/api";

export const useCartStore = create(
	persist(
		(set, get) => ({
			cart: [],
			orderId: null,

			// ✅ Update Cart & Sync with Backend
			setCart: (newCart) => {
				set({ cart: newCart });
				get().saveCartToBackend(newCart);
			},

			// ✅ Add Item & Sync with Backend
			addToCart: (product) =>
				set((state) => {
					const existingItem = state.cart.find(
						(item) => item.id === product.id
					);
					const updatedCart = existingItem
						? state.cart.map((item) =>
								item.id === product.id
									? { ...item, quantity: item.quantity + 1 }
									: item
						  )
						: [...state.cart, { ...product, quantity: 1 }];

					get().saveCartToBackend(updatedCart); // ✅ Save to backend

					return { cart: updatedCart };
				}),

			// ✅ Remove Item & Sync with Backend
			removeFromCart: (id) =>
				set((state) => {
					const updatedCart = state.cart.filter((item) => item.id !== id);
					get().saveCartToBackend(updatedCart); // ✅ Save to backend
					return { cart: updatedCart };
				}),

			// ✅ Clear Cart & Reset Order ID
			clearCart: () => {
				get().saveCartToBackend([]); // ✅ Clear backend
				set({ cart: [], orderId: null });
			},

			// ✅ Set Order ID
			setOrderId: (id) => set({ orderId: id }),

			// ✅ Function to Save Cart to Backend
			saveCartToBackend: async (cart) => {
				const orderId = get().orderId;
				if (!orderId) return; // If no active order, don't save

				try {
					await axiosInstance.patch("orders/in_progress/update/", {
						order_id: orderId,
						items: cart,
					});
					console.log("Cart auto-saved to backend!");
				} catch (error) {
					console.error("Failed to save cart:", error);
				}
			},
		}),
		{
			name: "cart-storage", // ✅ Saves cart to localStorage under this key
			getStorage: () => localStorage, // ✅ Uses localStorage for persistence
		}
	)
);
