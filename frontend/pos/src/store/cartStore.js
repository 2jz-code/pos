import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "../api/config/axiosConfig";

export const useCartStore = create(
	persist(
		(set, get) => ({
			cart: [],
			orderId: null,
			rewardsProfile: null, // Add this state property
			showOverlay: true,
			orderDiscount: null,

			// Add this function to set the rewards profile
			setRewardsProfile: (profile) => set({ rewardsProfile: profile }),

			// ✅ Format Cart Data Before Saving
			normalizeCart: (cart) => {
				return cart.map((item) => {
					// Parse numbers and provide fallbacks
					const price = parseFloat(item.product?.price || item.price) || 0;
					const quantity = parseInt(item.quantity, 10) || 1;
					// Preserve discount if it exists, or default to 0
					const discount =
						item.discount !== undefined ? parseFloat(item.discount) : 0;

					return {
						id: item.product?.id || item.id,
						name: item.product?.name || item.name,
						price: Number.isFinite(price) ? price : 0,
						quantity: Number.isFinite(quantity) ? quantity : 1,
						discount: Number.isFinite(discount) ? discount : 0,
					};
				});
			},

			setShowOverlay: (value) => set({ showOverlay: value }),

			// ✅ Update Cart & Sync with Backend
			setCart: (newCart) => {
				const normalizedCart = get().normalizeCart(newCart);
				set({ cart: normalizedCart });
				get().saveCartToBackend(normalizedCart);
			},

			updateItemQuantity: (itemId, quantityUpdate) => {
				console.log("updateItemQuantity called with:", {
					itemId,
					quantityUpdate,
				});

				// If it's an object with a discount property but no quantity,
				// redirect to updateItem instead
				if (
					typeof quantityUpdate === "object" &&
					"discount" in quantityUpdate &&
					!("quantity" in quantityUpdate)
				) {
					console.log("Redirecting discount update to updateItem");
					get().updateItem(itemId, quantityUpdate);
					return;
				}

				// Extract the quantity value, whether it's direct or from an object
				const newQuantity =
					typeof quantityUpdate === "object"
						? quantityUpdate.quantity
						: quantityUpdate;

				// Convert to number and validate
				const parsedQuantity = parseInt(newQuantity, 10);

				if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
					console.error("Invalid quantity update:", {
						original: quantityUpdate,
						parsed: parsedQuantity,
					});
					return;
				}

				set((state) => {
					const updatedCart = state.cart.map((item) => {
						if (item.id === itemId) {
							return {
								...item,
								quantity: parsedQuantity,
							};
						}
						return item;
					});

					return { cart: updatedCart };
				});

				// Trigger backend sync
				const updatedCart = get().cart;
				get().saveCartToBackend(updatedCart);
			},
			updateItem: (itemId, updates) => {
				console.log("Store updateItem called:", { itemId, updates });

				set((state) => {
					const updatedCart = state.cart.map((item) => {
						if (item.id === itemId) {
							const updatedItem = { ...item, ...updates };
							return updatedItem;
						}
						return item;
					});

					// Return updated cart immediately
					return { cart: updatedCart };
				});

				// After state update, sync with backend
				const updatedCart = get().cart;
				get().saveCartToBackend(updatedCart);
			},
			// ✅ Add Item & Sync with Backend
			addToCart: (product) =>
				set((state) => {
					const normalizedProduct = {
						id: product.id,
						name: product.name,
						price: parseFloat(product.price) || 0,
						quantity: 1,
					};

					const existingItem = state.cart.find(
						(item) => item.id === normalizedProduct.id
					);

					const updatedCart = existingItem
						? state.cart.map((item) =>
								item.id === normalizedProduct.id
									? { ...item, quantity: item.quantity + 1 }
									: item
						  )
						: [...state.cart, normalizedProduct];

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
				set({
					cart: [],
					orderId: null,
					orderDiscount: null,
					rewardsProfile: null,
				});
			},

			// ✅ Set Order ID
			setOrderId: (id) => set({ orderId: id }),

			// ✅ Save Cart to Backend with Correct Order ID
			saveCartToBackend: async (cart) => {
				const orderId = get().orderId;
				if (!orderId) {
					console.warn("No order ID available for cart save");
					return;
				}

				// Validate cart items before sending
				const validatedItems = cart
					.filter((item) => get().validateCartItem(item))
					.map((item) => ({
						id: parseInt(item.id, 10),
						quantity: parseInt(item.quantity, 10),
						price: parseFloat(item.price) || 0,
						discount: parseFloat(item.discount || 0), // Include discount in the backend save
					}));

				try {
					const response = await axiosInstance.patch(
						"orders/in_progress/update/",
						{
							order_id: parseInt(orderId, 10),
							items: validatedItems,
						}
					);

					if (response.status !== 200) {
						throw new Error(`Unexpected response status: ${response.status}`);
					}

					console.log("Cart auto-saved to backend!");
					return response.data;
				} catch (error) {
					console.error("Failed to save cart:", {
						error,
						orderId,
						items: validatedItems,
					});

					// Optionally trigger a UI notification
					if (error.response?.status === 500) {
						console.error("Server error details:", error.response.data);
					}

					throw error; // Re-throw to handle in UI if needed
				}
			},
			// Add a utility function to validate cart items
			validateCartItem: (item) => {
				if (!item) return false;

				const price = parseFloat(item.price);
				const quantity = parseInt(item.quantity, 10);
				const discount = parseFloat(item.discount || 0);

				return (
					item.id &&
					item.name &&
					Number.isFinite(price) &&
					price >= 0 &&
					Number.isFinite(quantity) &&
					quantity > 0 &&
					Number.isFinite(discount) &&
					discount >= 0 &&
					discount <= 100 // Assuming discount is a percentage
				);
			},
			// Add this method to set the order discount
			setOrderDiscount: (discount) => {
				set({ orderDiscount: discount });

				// If there's an active order, save the discount to the backend
				const orderId = get().orderId;
				if (orderId) {
					get().saveOrderDiscount(orderId, discount);
				}
			},

			saveOrderDiscount: async (orderId, discount) => {
				try {
					if (discount) {
						// Apply discount
						await axiosInstance.post(`orders/${orderId}/discount/`, {
							discount_id: discount.id,
						});
						console.log("Order discount saved to backend");
					} else {
						// Remove discount
						await axiosInstance.delete(`orders/${orderId}/discount/`);
						console.log("Order discount removed from backend");
					}
				} catch (error) {
					console.error("Failed to save order discount:", error);

					// Show a user-friendly error message
					if (
						error.response &&
						error.response.data &&
						error.response.data.error
					) {
						console.error(`Discount error: ${error.response.data.error}`);
					} else {
						console.error("Failed to apply discount");
					}

					// Since we failed to apply the discount on the backend, reset the state
					set({ orderDiscount: null });
				}
			},

			// Add this method to remove the order discount
			removeOrderDiscount: () => {
				const orderId = get().orderId;
				set({ orderDiscount: null });

				if (orderId) {
					get().saveOrderDiscount(orderId, null);
				}
			},
		}),

		{
			name: "cart-storage",
			getStorage: () => localStorage,
		}
	)
);
