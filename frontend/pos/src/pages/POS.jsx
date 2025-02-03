import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import Cart from "../components/Cart"; // Import Cart Component

const categories = ["Sandwiches", "Meals", "Sides"];

const products = {
  Sandwiches: [
    { id: 1, name: "Hamburger", price: 5, color: "bg-green-500" },
    { id: 2, name: "Cheeseburger", price: 6, color: "bg-green-500" },
    { id: 3, name: "Western Burger", price: 7, color: "bg-green-500" },
    { id: 4, name: "Bacon Burger", price: 8, color: "bg-green-500" },
  ],
  Meals: [
    { id: 5, name: "Chicken Caesar Wrap", price: 7, color: "bg-blue-500" },
    { id: 6, name: "Chicken Ranch Wrap", price: 7, color: "bg-blue-500" },
  ],
  Sides: [
    { id: 7, name: "Fries", price: 3, color: "bg-yellow-500" },
    { id: 8, name: "Onion Rings", price: 4, color: "bg-yellow-500" },
  ],
};

export default function POS() {
  const [selectedCategory, setSelectedCategory] = useState("Sandwiches");
  const { addToCart } = useCartStore();
  const navigate = useNavigate();

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-800 text-white">
      {/* Back Button */}
      <div className="p-4">
        <button
          className="px-4 py-2 bg-gray-600 text-black rounded-lg hover:bg-gray-700"
          onClick={() => navigate("/")}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="flex flex-grow">
        {/* Left: Cart Component */}
        <Cart />

        {/* Right: Product Categories & Items */}
        <div className="w-2/3 p-4 flex flex-col">
          {/* Category Tabs */}
          <div className="flex space-x-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`px-4 py-2 border text-black bg-white rounded-lg ${
                  selectedCategory === category ? "font-bold" : "opacity-70"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {products[selectedCategory].map((product) => (
              <button
                key={product.id}
                className={`p-3 ${product.color} text-black font-bold rounded-lg shadow-md hover:brightness-90`}
                onClick={() => addToCart(product)}
              >
                {product.name} - ${product.price}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
