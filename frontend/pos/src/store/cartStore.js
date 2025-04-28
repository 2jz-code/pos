import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "../api/config/axiosConfig";
import { toast } from "react-toastify"; // Assuming toast is used for errors

// Assuming calculateCartTotals is correctly imported if needed within the store itself
// import { calculateCartTotals } from "../features/cart/utils/cartCalculations";

export const useCartStore = create(
	persist(
		(set, get) => ({
			cart: [],
			orderId: null,
			rewardsProfile: null, // State for associated rewards profile
			showOverlay: true, // Initially show overlay for new order
			orderDiscount: null, // State for the currently applied order-level discount

			// --- Actions ---

			setRewardsProfile: (profile) => set({ rewardsProfile: profile }),

			setShowOverlay: (value) => set({ showOverlay: value }),

			// Helper to normalize item structure when adding/setting cart
			normalizeItem: (item) => {
				// Handles items coming directly from product data or from backend order items
				const productData = item.product || item; // Use item itself if product key doesn't exist
				const price = parseFloat(productData.price) || 0;
				const quantity = parseInt(item.quantity, 10) || 1;
				// Item-specific discount (e.g., from loaded order), defaults to 0
				const discount =
					item.discount !== undefined ? parseFloat(item.discount) : 0;

				// --- FIX: More robust category ID check ---
				// Check for 'category' (likely the ID from Product model FK)
				// or 'category_id' (common naming convention)
				// or even 'product.category' if nested structure occurs
				const categoryId =
					productData.category ||
					productData.category_id ||
					item.product?.category ||
					null;
				// --- END FIX ---

				if (!productData.id || !productData.name) {
					console.warn(
						"Attempted to normalize item with missing ID or Name:",
						item
					);
					return null; // Return null for invalid items
				}

				return {
					id: productData.id, // Use product ID
					name: productData.name,
					price: Number.isFinite(price) ? price : 0,
					quantity: Number.isFinite(quantity) ? quantity : 1,
					discount: Number.isFinite(discount) ? discount : 0,
					categoryId: categoryId, // Store the found category ID (or null)
				};
			},

			// Set the entire cart (e.g., when loading a held order)
			setCart: (newCart) => {
				const normalizedCart = Array.isArray(newCart)
					? newCart
							.map((item) => get().normalizeItem(item))
							.filter((item) => item !== null) // Filter out any invalid items
					: [];
				set({ cart: normalizedCart });
				get().saveCartToBackend(get().cart); // Sync after setting
			},

			// Update quantity or other properties of a specific item
			updateItem: (itemId, updates) => {
				console.log("Store updateItem called:", { itemId, updates });
				let itemFound = false;
				set((state) => {
					const updatedCart = state.cart.map((item) => {
						if (item.id === itemId) {
							itemFound = true;
							// Ensure quantity is at least 1 if updated
							if (updates.quantity !== undefined) {
								const newQuantity = parseInt(updates.quantity, 10);
								updates.quantity =
									Number.isFinite(newQuantity) && newQuantity >= 1
										? newQuantity
										: 1;
							}
							// Ensure discount is valid if updated
							if (updates.discount !== undefined) {
								const newDiscount = parseFloat(updates.discount);
								updates.discount =
									Number.isFinite(newDiscount) &&
									newDiscount >= 0 &&
									newDiscount <= 100
										? newDiscount
										: 0;
							}
							return { ...item, ...updates };
						}
						return item;
					});
					if (!itemFound) {
						console.warn(
							`updateItem: Item with ID ${itemId} not found in cart.`
						);
						return {}; // Return empty object to indicate no change
					}
					return { cart: updatedCart };
				});

				if (itemFound) {
					get().saveCartToBackend(get().cart); // Sync only if item was found and updated
				}
			},

			// Specific quantity update (delegates to updateItem for validation)
			updateItemQuantity: (itemId, quantityUpdate) => {
				console.log("updateItemQuantity called with:", {
					itemId,
					quantityUpdate,
				});
				const newQuantity =
					typeof quantityUpdate === "object"
						? quantityUpdate.quantity
						: quantityUpdate;
				get().updateItem(itemId, { quantity: newQuantity }); // Use updateItem for validation logic
			},

			// Add a product to the cart
			addToCart: (product) => {
				const itemToAdd = get().normalizeItem(product);
				if (!itemToAdd) {
					toast.error("Could not add invalid product data to cart.");
					return; // Don't add if normalization failed
				}

				let itemExists = false;
				set((state) => {
					const updatedCart = state.cart.map((item) => {
						if (item.id === itemToAdd.id) {
							itemExists = true;
							// Increase quantity of existing item
							return { ...item, quantity: item.quantity + 1 };
						}
						return item;
					});

					// If item doesn't exist, add it with quantity 1
					if (!itemExists) {
						updatedCart.push({ ...itemToAdd, quantity: 1 });
					}

					// Return the updated cart state
					return { cart: updatedCart };
				});

				// Sync after state update
				get().saveCartToBackend(get().cart);
			},

			// Remove an item from the cart
			removeFromCart: (id) => {
				let itemRemoved = false;
				set((state) => {
					const originalLength = state.cart.length;
					const updatedCart = state.cart.filter((item) => item.id !== id);
					itemRemoved = updatedCart.length < originalLength;
					if (!itemRemoved) {
						console.warn(`removeFromCart: Item with ID ${id} not found.`);
						return {}; // No change
					}
					return { cart: updatedCart };
				});
				if (itemRemoved) {
					get().saveCartToBackend(get().cart); // Sync if item was removed
				}
			},

			// Clear the cart and associated order state
			clearCart: () => {
				const orderId = get().orderId;
				if (orderId) {
					get().saveCartToBackend([]); // Save empty cart to backend if orderId exists
				}
				set({
					cart: [],
					orderId: null,
					orderDiscount: null,
					rewardsProfile: null,
					showOverlay: true, // Show overlay after clearing
				});
			},

			// Set the current order ID
			setOrderId: (id) => set({ orderId: id }),

			// Save the current cart state to the backend
			saveCartToBackend: async (cartToSave) => {
				const orderId = get().orderId;
				if (!orderId) {
					// console.warn("No active order ID, cannot save cart to backend.");
					return; // Don't save if no order is active
				}

				// Ensure cartToSave is an array
				const currentCart = Array.isArray(cartToSave) ? cartToSave : get().cart;

				// Prepare items payload for backend (usually requires product ID and quantity)
				const itemsPayload = currentCart.map((item) => ({
					product_id: item.id, // Assuming backend expects product_id
					quantity: item.quantity,
					// Include price/discount if backend needs it for validation/logging
					// price: item.price,
					// discount: item.discount
				}));

				try {
					// Use the specific endpoint for updating in-progress orders
					const response = await axiosInstance.patch(
						`orders/in_progress/update/`,
						{
							order_id: parseInt(orderId, 10),
							items: itemsPayload,
						}
					);

					if (response.status !== 200) {
						throw new Error(
							`Backend cart save failed with status: ${response.status}`
						);
					}
					console.log("Cart auto-saved to backend for order:", orderId);
					return response.data; // Return data if needed
				} catch (error) {
					console.error("Failed to save cart to backend:", {
						message: error.message,
						orderId: orderId,
						// itemsPayload: itemsPayload, // Avoid logging potentially large payloads unless debugging
						response: error.response?.data,
					});
					// Optionally notify user, but avoid spamming for background saves
					// toast.error("Failed to sync cart with server.");
					// Don't re-throw here usually, as it's a background task
				}
			},

			// Set the order-level discount
			setOrderDiscount: (discount) => {
				// Get the current discount from the state *before* setting
				const currentDiscountId = get().orderDiscount?.id;
				const newDiscountId = discount?.id;

				console.log(
					`[cartStore setOrderDiscount] Attempting to set discount. Current ID: ${currentDiscountId}, New ID: ${newDiscountId}`,
					JSON.parse(JSON.stringify(discount || {})) // Log clean copy
				);

				// Only proceed with backend sync if the discount ID is actually changing
				// or if we are explicitly setting a discount when none was set before.
				// We also need to handle removing a discount (newDiscountId is null, current wasn't).
				const needsBackendSync = currentDiscountId !== newDiscountId;

				set({ orderDiscount: discount }); // Set the local state regardless

				const orderId = get().orderId;
				const isHydrated = get().isHydrated;

				// Only call saveOrderDiscount if the discount has actually changed
				if (needsBackendSync && orderId && isHydrated) {
					console.log(
						`[cartStore setOrderDiscount] Discount ID changed (from ${currentDiscountId} to ${newDiscountId}). Calling saveOrderDiscount.`
					);
					get().saveOrderDiscount(orderId, discount); // Pass the new discount object (or null)
				} else if (!needsBackendSync) {
					console.log(
						`[cartStore setOrderDiscount] Discount ID (${newDiscountId}) is the same as current. Skipping backend save.`
					);
				} else {
					console.log(
						`[cartStore setOrderDiscount] Skipping backend save. Needs Sync: ${needsBackendSync}, OrderID: ${orderId}, Hydrated: ${isHydrated}`
					);
				}
			},

			// Remove the order-level discount
			removeOrderDiscount: () => {
				const orderId = get().orderId;
				set({ orderDiscount: null }); // Remove from local state
				if (orderId) {
					get().saveOrderDiscount(orderId, null); // Sync removal with backend
				}
			},

			// Save (apply/remove) the order discount to the backend
			saveOrderDiscount: async (orderId, discount) => {
				if (!orderId) return; // Need an order ID

				const endpoint = `orders/${orderId}/discount/`;
				try {
					if (discount && discount.id) {
						// Apply discount
						await axiosInstance.post(endpoint, { discount_id: discount.id });
						console.log(
							`Discount ${discount.id} applied to order ${orderId} on backend.`
						);
					} else {
						// Remove discount
						await axiosInstance.delete(endpoint);
						console.log(`Discount removed from order ${orderId} on backend.`);
					}
				} catch (error) {
					console.error("Failed to save order discount to backend:", {
						message: error.message,
						orderId: orderId,
						discountId: discount?.id,
						response: error.response?.data,
					});
					const errorMsg =
						error.response?.data?.error ||
						"Failed to update discount on server.";
					toast.error(errorMsg);

					// IMPORTANT: Revert local state if backend update failed
					// Fetch the current discount state *before* the failed attempt
					// This requires storing the 'previous' discount state temporarily or refetching order state.
					// For simplicity here, we'll just remove the local discount if the update failed.
					// A more robust solution might involve fetching the order's current state.
					set({ orderDiscount: null }); // Revert local state on failure
				}
			},
		}),
		{
			name: "cart-storage", // Name for localStorage persistence
			// storage: createJSONStorage(() => localStorage), // Default is localStorage
		}
	)
);
