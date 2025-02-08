import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "../api/api";

export const useCartStore = create(
  persist(
    (set, get) => ({
      cart: [],
      orderId: null,

      // ✅ Format Cart Data Before Saving
      normalizeCart: (cart) => {
        return cart.map((item) => ({
          id: item.product?.id || item.id, // Handle both formats
          name: item.product?.name || item.name,
          price: item.product?.price || item.price,
          quantity: item.quantity || 1,
        }));
      },

      // ✅ Update Cart & Sync with Backend
      setCart: (newCart) => {
        const normalizedCart = get().normalizeCart(newCart);
        set({ cart: normalizedCart });
        get().saveCartToBackend(normalizedCart);
      },

      // ✅ Add Item & Sync with Backend
      addToCart: (product) =>
        set((state) => {
          const existingItem = state.cart.find((item) => item.id === product.id);
          const updatedCart = existingItem
            ? state.cart.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              )
            : [...state.cart, { ...product, quantity: 1 }];

          get().saveCartToBackend(updatedCart);
          return { cart: updatedCart };
        }),

      // ✅ Remove Item & Sync with Backend
      removeFromCart: (id) =>
        set((state) => {
          const updatedCart = state.cart.filter((item) => item.id !== id);
          get().saveCartToBackend(updatedCart);
          return { cart: updatedCart };
        }),

      // ✅ Clear Cart & Reset Order ID
      clearCart: () => {
        get().saveCartToBackend([]);
        set({ cart: [], orderId: null });
      },

      // ✅ Set Order ID
      setOrderId: (id) => set({ orderId: id }),

      // ✅ Save Cart to Backend with Correct Order ID
      saveCartToBackend: async (cart) => {
        const orderId = get().orderId;
        if (!orderId) return;

        try {
          await axiosInstance.patch("orders/in_progress/update/", {
            order_id: orderId,
            items: cart.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
          });
          console.log("Cart auto-saved to backend!");
        } catch (error) {
          console.error("Failed to save cart:", error);
        }
      },
    }),
    {
      name: "cart-storage",
      getStorage: () => localStorage,
    }
  )
);
