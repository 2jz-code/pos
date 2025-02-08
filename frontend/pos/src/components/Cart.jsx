import { useState, useEffect } from "react";
import { useCartStore } from "../store/cartStore";
import axiosInstance from "../api/api";
import { useNavigate } from "react-router-dom";
import PaymentFlow from "../components/PaymentFlow";
import { ChevronRightIcon, XCircleIcon } from "@heroicons/react/24/solid";

export default function Cart() {
	const { cart, removeFromCart, clearCart, setCart } = useCartStore();
	const [expandedItem, setExpandedItem] = useState(null);
	const [isPaymentFlow, setIsPaymentFlow] = useState(false);
	const [activeOrderId, setActiveOrderId] = useState(null);
	const [showOverlay, setShowOverlay] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		const storedOrderId = useCartStore.getState().orderId; // ✅ Check Zustand
		console.log("Stored Order ID in Zustand:", storedOrderId);

		if (storedOrderId) {
			setActiveOrderId(storedOrderId);
			setShowOverlay(false); // ✅ Hide overlay immediately

			axiosInstance
				.get(`orders/${storedOrderId}/`)
				.then((response) => {
					setCart(response.data.items);
				})
				.catch(() => setActiveOrderId(null));
		}
	}, []);

	const totalAmount = cart.reduce(
		(acc, item) =>
			acc +
			(Number(item.price) || 0) *
				(Number(item.quantity) || 1) *
				(1 - (Number(item.discount) || 0) / 100),
		0
	);
	const taxAmount = totalAmount * 0.1;
	const payableAmount = totalAmount + taxAmount;

	// ✅ Start Order (Creates a new "in_progress" order)
	const startOrder = async () => {
		try {
			const response = await axiosInstance.post("orders/start/");
			const newOrderId = response.data.order_id;

			console.log("New Order Started, ID:", newOrderId);

			// ✅ Update Zustand storage (cart_storage)
			useCartStore.setState({ orderId: newOrderId, cart: [] });

			// ✅ Ensure overlay is removed
			setShowOverlay(false);
			setActiveOrderId(newOrderId);
		} catch (error) {
			console.error("Failed to start order:", error);
		}
	};

	// ✅ Hold Order & Return to Orders Page
	const holdOrder = async () => {
		if (!activeOrderId) return alert("No active order to save!");

		try {
			await axiosInstance.patch(`orders/${activeOrderId}/`, {
				status: "saved",
			});
			alert("Order saved successfully!");
			clearCart();
			setActiveOrderId(null);
			setShowOverlay(true); // ✅ Show overlay again for new order
			navigate("/orders"); // ✅ Navigate to Orders Page instead of auto-resuming
		} catch (error) {
			console.error("Failed to save order:", error);
			alert("Error saving order.");
		}
	};

	return (
		<div className="relative w-1/3 bg-white shadow-lg p-6 rounded-lg flex flex-col h-full transition-all duration-500">
			{/* ✅ "Start New Order" Button (Top-Right after starting an order) */}
			{activeOrderId && (
				<button
					className="absolute top-2 right-2 px-3 py-2 text-sm bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-all"
					onClick={holdOrder}
				>
					Hold Order
				</button>
			)}

			{!isPaymentFlow ? (
				<>
					<h2 className="text-xl font-semibold mb-4">Cart Summary</h2>

					{/* ✅ Start Order Overlay */}
					{showOverlay && (
						<div
							className={`absolute inset-0 flex justify-center items-center z-10 rounded transition-opacity duration-500 ${
								!activeOrderId
									? "bg-black opacity-30"
									: "opacity-0 pointer-events-none"
							}`}
						>
							<button
								className="px-6 py-3 bg-green-500 opacity-100 text-white rounded-lg shadow-lg text-lg hover:bg-green-600 transition-all"
								onClick={startOrder}
							>
								Start Order
							</button>
						</div>
					)}

					{/* ✅ Scrollable Cart Items (Remains even after refresh) */}
					<div className="flex-grow overflow-y-auto max-h-[400px] space-y-2">
						{cart.length === 0 ? (
							<p className="text-gray-500 text-center">Cart is empty.</p>
						) : (
							cart.map((item) => (
								<div
									key={item.id}
									className="bg-gray-200 rounded-lg shadow-sm overflow-hidden"
								>
									<div
										className="p-3 flex justify-between items-center cursor-pointer"
										onClick={() =>
											setExpandedItem(expandedItem === item.id ? null : item.id)
										}
									>
										<div className="flex items-center space-x-3">
											<div
												className={`transition-transform duration-200 ${
													expandedItem === item.id ? "rotate-90" : "rotate-0"
												}`}
											>
												<ChevronRightIcon className="h-5 w-5 text-gray-600" />
											</div>
											<span className="text-gray-800 font-semibold">
												{item.quantity} ×
											</span>
											<span className="text-gray-800 font-medium">
												{item.name}
											</span>
										</div>
										<div className="flex items-center space-x-3">
											<span className="text-gray-900 font-semibold">
												$
												{(
													item.price *
													item.quantity *
													(1 - (item.discount || 0) / 100)
												).toFixed(2)}
											</span>
											<button onClick={() => removeFromCart(item.id)}>
												<XCircleIcon className="h-5 w-5 text-red-500" />
											</button>
										</div>
									</div>
								</div>
							))
						)}
					</div>

					{/* ✅ Pricing Details & Buttons */}
					<div className="absolute bottom-0 left-0 w-full bg-white border-t shadow-md p-4">
						<div className="mb-4 text-lg space-y-2">
							<div className="flex justify-between">
								<span className="text-gray-600">Subtotal:</span>
								<span className="text-gray-800 font-semibold">
									${totalAmount.toFixed(2)}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Tax (10%):</span>
								<span className="text-gray-800 font-semibold">
									${taxAmount.toFixed(2)}
								</span>
							</div>
							<div className="flex justify-between text-xl font-bold">
								<span className="text-gray-900">Total:</span>
								<span className="text-gray-900">
									${payableAmount.toFixed(2)}
								</span>
							</div>
						</div>

						{/* ✅ Action Buttons */}
						<div className="flex space-x-2">
							<button
								className="flex-1 px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-all"
								onClick={holdOrder}
							>
								Hold Order
							</button>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
