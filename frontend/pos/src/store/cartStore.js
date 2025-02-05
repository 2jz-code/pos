import { create } from "zustand";

export const useCartStore = create((set) => ({
    cart: [],
    orderId: null, // ✅ Track resumed order ID

    addToCart: (product) =>
        set((state) => {
            const existingItem = state.cart.find((item) => item.id === product.id);
            if (existingItem) {
                return {
                    cart: state.cart.map((item) =>
                        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                    ),
                };
            }
            return { cart: [...state.cart, { ...product, quantity: 1 }] };
        }),

    removeFromCart: (id) =>
        set((state) => ({
            cart: state.cart.filter((item) => item.id !== id),
        })),

    clearCart: () => set({ cart: [], orderId: null }), // ✅ Reset order ID when clearing cart

    setOrderId: (id) => set({ orderId: id }), // ✅ Store resumed order ID
}));
