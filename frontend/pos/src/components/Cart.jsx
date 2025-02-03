import { useCartStore } from "../store/cartStore";

export default function Cart() {
  const { cart, removeFromCart, clearCart } = useCartStore();

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
              className="p-2 bg-gray-700 text-white rounded flex justify-between"
            >
              <span className="text-white font-medium">
                {item.name} - ${item.price}
              </span>
              <button
                className="text-red-400 hover:text-red-600 font-bold"
                onClick={() => removeFromCart(item.id)}
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 text-lg text-white">
        <strong>Total: </strong>${cart.reduce((acc, item) => acc + item.price, 0)}
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
