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
	const { showOverlay, setShowOverlay } = useCartStore();
	const navigate = useNavigate();

	useEffect(() => {
		const storedOrderId = useCartStore.getState().orderId;
		console.log("Stored Order ID in Zustand:", storedOrderId);

		if (storedOrderId) {
			setActiveOrderId(storedOrderId);
			setShowOverlay(false);

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

	const startOrder = async () => {
		try {
			const response = await axiosInstance.post("orders/start/");
			const newOrderId = response.data.id;
			console.log("New Order Started, ID:", newOrderId);

			useCartStore.setState({ orderId: newOrderId, cart: [] });

			setShowOverlay(false);
			setActiveOrderId(newOrderId);
		} catch (error) {
			console.error("Failed to start order:", error);
		}
	};

	const holdOrder = async () => {
		if (!activeOrderId) return alert("No active order to save!");

		try {
			await axiosInstance.patch(`orders/${activeOrderId}/`, {
				status: "saved",
			});
			alert("Order saved successfully!");
			clearCart();
			setActiveOrderId(null);
			setShowOverlay(true);
		} catch (error) {
			console.error("Failed to save order:", error);
			alert("Error saving order.");
		}
	};

	const startNewOrder = async () => {
		if (!activeOrderId) return alert("No active order to save!");

		try {
			await axiosInstance.patch(`orders/${activeOrderId}/`, {
				status: "saved",
			});

			clearCart();
			setActiveOrderId(null);
			setShowOverlay(true);

			const response = await axiosInstance.post("orders/start/");
			const newOrderId = response.data.id;
			console.log("New Order Started, ID:", newOrderId);

			useCartStore.setState({ orderId: newOrderId, cart: [] });

			setShowOverlay(false);
			setActiveOrderId(newOrderId);
		} catch (error) {
			console.error("Failed to start new order:", error);
			alert("Error starting new order.");
		}
	};

	return (
		<div className="relative w-1/3 bg-white flex flex-col border-l  border-gray-300 shadow-lg h-full">
			{/* Header Section */}
			<div className="p-4 border-b border-gray-300 flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-800">Order Summary</h2>
				{activeOrderId && (
					<button
						className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-md text-sm hover:bg-blue-200 transition-colors"
						onClick={startNewOrder}
					>
						New Order
					</button>
				)}
			</div>

			{/* Overlay for Starting Order */}
			{showOverlay && (
				<div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center">
					<button
						className="px-8 py-3 bg-blue-600 text-white rounded-lg shadow-lg text-lg hover:bg-blue-700 transition-all flex items-center gap-2"
						onClick={startOrder}
					>
						<span>➕ Start New Order</span>
					</button>
				</div>
			)}

			{/* Cart Items */}
			<div className="flex-1 overflow-y-auto p-4 space-y-3">
				{cart.length === 0 ? (
					<p className="text-gray-400 text-center py-8">No items in cart</p>
				) : (
					cart.map((item) => (
						<div
							key={item.id}
							className="bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow"
						>
							{/* Item Header */}
							<div
								className="p-3 flex justify-between items-center cursor-pointer group"
								onClick={() =>
									setExpandedItem(expandedItem === item.id ? null : item.id)
								}
							>
								<div className="flex items-center gap-3">
									<ChevronRightIcon
										className={`h-5 w-5 text-gray-400 transition-transform ${
											expandedItem === item.id ? "rotate-90" : ""
										}`}
									/>
									<span className="text-gray-800 font-medium">
										{item.quantity} × {item.name}
									</span>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-gray-700 font-medium">
										$
										{(
											item.price *
											item.quantity *
											(1 - (item.discount || 0) / 100)
										).toFixed(2)}
									</span>
									<button
										onClick={(e) => {
											e.stopPropagation();
											removeFromCart(item.id);
										}}
										className="text-red-400 hover:text-red-500 transition-colors"
									>
										<XCircleIcon className="h-5 w-5" />
									</button>
								</div>
							</div>

							{/* Expandable Details */}
							{expandedItem === item.id && (
								<div className="p-3 border-t border-gray-300">
									<div className="flex gap-4">
										<div className="flex-1">
											<label className="text-sm font-medium text-gray-600 mb-1 block">
												Quantity
											</label>
											<input
												type="number"
												min="1"
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
												value={item.quantity}
												onChange={(e) =>
													useCartStore.setState((state) => ({
														cart: state.cart.map((cartItem) =>
															cartItem.id === item.id
																? {
																		...cartItem,
																		quantity: Math.max(
																			1,
																			parseInt(e.target.value) || 1
																		),
																  }
																: cartItem
														),
													}))
												}
											/>
										</div>
										<div className="flex-1">
											<label className="text-sm font-medium text-gray-600 mb-1 block">
												Discount (%)
											</label>
											<input
												type="number"
												min="0"
												max="100"
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
												value={item.discount || ""}
												onChange={(e) =>
													useCartStore.setState((state) => ({
														cart: state.cart.map((cartItem) =>
															cartItem.id === item.id
																? {
																		...cartItem,
																		discount: Math.min(
																			100,
																			parseInt(e.target.value) || 0
																		),
																  }
																: cartItem
														),
													}))
												}
											/>
										</div>
									</div>
								</div>
							)}
						</div>
					))
				)}
			</div>

			{/* Totals & Actions */}
			<div className="sticky bottom-0 bg-white border-t border-gray-300 p-4 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
				<div className="space-y-2">
					<div className="flex justify-between text-gray-600">
						<span>Subtotal</span>
						<span>${totalAmount.toFixed(2)}</span>
					</div>
					<div className="flex justify-between text-gray-600">
						<span>Tax (10%)</span>
						<span>${taxAmount.toFixed(2)}</span>
					</div>
					<div className="flex justify-between text-lg font-semibold text-gray-800">
						<span>Total</span>
						<span>${payableAmount.toFixed(2)}</span>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<button
						className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
						onClick={holdOrder}
						disabled={!activeOrderId}
					>
						Hold Order
					</button>
					<button
						className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
						onClick={() => setIsPaymentFlow(true)}
						disabled={cart.length === 0}
					>
						Charge ${payableAmount.toFixed(2)}
					</button>
				</div>
			</div>

			{/* Payment Flow Overlay */}
			{isPaymentFlow && (
				<div className="absolute inset-0 bg-white p-6">
					<PaymentFlow
						totalAmount={payableAmount}
						onBack={() => setIsPaymentFlow(false)}
						onComplete={() => {
							clearCart();
							setIsPaymentFlow(false);
							navigate("/orders");
						}}
					/>
				</div>
			)}
		</div>
	);
}
