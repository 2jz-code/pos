import { useCartStore } from "../store/cartStore";

export default function Cart() {
  const { cart = [], removeFromCart, clearCart, addToCart } = useCartStore(); // ✅ Add addToCart for increasing quantity

  // ✅ Correct total price calculation (account for quantity)
  const totalPrice = cart
    .reduce((acc, item) => acc + item.price * item.quantity, 0)
    .toFixed(2);

  return (
    <div className="w-1/3 bg-gray-900 p-4 flex flex-col">
      <h2 className="text-xl font-semibold">Cart</h2>
      {cart.length === 0 ? (
        <p className="text-gray-400">Cart is empty.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cart.map((item) => (
            <div
              key={item.id}
              className="p-2 bg-gray-700 text-white rounded flex justify-between items-center"
            >
              <span className="text-white font-medium">
                {item.name} - ${item.price * item.quantity}
              </span>
              <div className="flex items-center space-x-2">
                {/* ✅ Decrease Quantity Button */}
                <button
                  className="bg-gray-500 text-white px-2 rounded hover:bg-gray-600"
                  onClick={() => {
                    if (item.quantity > 1) {
                      useCartStore.setState((state) => ({
                        cart: state.cart.map((cartItem) =>
                          cartItem.id === item.id
                            ? { ...cartItem, quantity: cartItem.quantity - 1 }
                            : cartItem
                        ),
                      }));
                    } else {
                      removeFromCart(item.id); // Remove if quantity reaches 0
                    }
                  }}
                >
                  -
                </button>

                <span className="text-white font-medium">{item.quantity}</span>

                {/* ✅ Increase Quantity Button */}
                <button
                  className="bg-gray-500 text-white px-2 rounded hover:bg-gray-600"
                  onClick={() => addToCart(item)}
                >
                  +
                </button>

                {/* ✅ Remove Item Button */}
                <button
                  className="text-red-400 hover:text-red-600 font-bold ml-2"
                  onClick={() => removeFromCart(item.id)}
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 text-lg text-white">
        <strong>Total: </strong>${totalPrice}
      </div>
      {cart.length > 0 && (
        <button
          className="mt-4 bg-red-500 text-black py-2 rounded hover:bg-red-700"
          onClick={clearCart}
        >
          Clear Cart
        </button>
      )}
    </div>
  );
}
