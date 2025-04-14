// features/customerDisplay/components/cart/CartView.jsx

import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { formatPrice } from "../../../../utils/numberUtils";
import { ShoppingCartIcon } from "@heroicons/react/24/outline"; // Example icon

const CartView = ({ cartData }) => {
	const {
		items = [],
		subtotal = 0,
		taxAmount = 0,
		total = 0,
		discountAmount = 0,
		orderDiscount = null,
	} = cartData;

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
		exit: { opacity: 0 },
	};

	const itemVariants = {
		hidden: { opacity: 0, x: -20 },
		visible: {
			opacity: 1,
			x: 0,
			transition: { type: "spring", stiffness: 300, damping: 30 },
		},
		exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
	};

	const summaryVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.2 },
		},
		exit: { opacity: 0 },
	};

	return (
		<motion.div
			key="cart"
			className="w-full h-screen bg-slate-50 flex flex-col"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			{/* Header (Optional, often omitted in modern displays) */}
			{/* <div className="p-6 border-b border-slate-200 text-center">
                <h1 className="text-2xl font-semibold text-gray-900">Your Order</h1>
            </div> */}

			{/* Cart Items List */}
			<div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 custom-scrollbar">
				<AnimatePresence initial={false}>
					{" "}
					{/* Allow exit animations */}
					{items.length === 0 ? (
						<motion.div
							key="empty-cart"
							className="flex flex-col items-center justify-center h-full text-slate-400 pt-16"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ duration: 0.4 }}
						>
							<ShoppingCartIcon
								className="h-24 w-24 mb-6 text-slate-300"
								strokeWidth={1}
							/>
							<p className="text-2xl text-slate-500">
								Your cart is currently empty
							</p>
						</motion.div>
					) : (
						<motion.div
							className="space-y-4"
							variants={containerVariants}
						>
							{items.map((item) => (
								<motion.div
									key={item.id} // Use unique item ID
									layout // Animate layout changes
									variants={itemVariants}
									exit="exit" // Apply exit animation
									className="bg-white rounded-lg p-5 flex justify-between items-center gap-4 border border-slate-100 shadow-sm"
								>
									<div className="flex-1">
										<div className="flex items-center gap-3">
											<span className="font-semibold text-base text-slate-500 bg-slate-100 rounded px-2 py-0.5">
												{item.quantity}x
											</span>
											<h3 className="font-medium text-lg text-gray-900">
												{item.name}
											</h3>
										</div>
										{/* Optional: Modifiers/details can go here */}
										{item.discount > 0 && (
											<div className="mt-1.5 text-sm text-green-600 font-medium">
												{item.discount}% discount applied
											</div>
										)}
									</div>
									<div className="text-right font-semibold text-lg text-gray-900 flex-shrink-0">
										${formatPrice(item.price * item.quantity)}
									</div>
								</motion.div>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Order Summary Footer */}
			{items.length > 0 && (
				<motion.div
					layout
					variants={summaryVariants}
					className="bg-white border-t-2 border-slate-200 p-6 md:p-8 lg:p-10 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)]" // Top shadow
				>
					<div className="space-y-3 mb-5 text-lg">
						<div className="flex justify-between text-slate-600">
							<span>Subtotal</span>
							<span className="font-medium text-slate-800">
								${formatPrice(subtotal)}
							</span>
						</div>

						{discountAmount > 0 && (
							<div className="flex justify-between text-green-600">
								<span>
									Discount {orderDiscount ? `(${orderDiscount.name})` : ""}
								</span>
								<span className="font-medium">
									-${formatPrice(discountAmount)}
								</span>
							</div>
						)}

						<div className="flex justify-between text-slate-600">
							<span>Tax</span>
							<span className="font-medium text-slate-800">
								${formatPrice(taxAmount)}
							</span>
						</div>
					</div>
					{/* Total */}
					<div className="mt-5 pt-5 border-t border-slate-200 flex justify-between items-baseline">
						<span className="text-2xl font-bold text-gray-900">Total</span>
						<span className="text-3xl font-bold text-blue-600">
							${formatPrice(total)}
						</span>
					</div>
				</motion.div>
			)}
		</motion.div>
	);
};

// Updated PropTypes
CartView.propTypes = {
	cartData: PropTypes.shape({
		items: PropTypes.arrayOf(
			PropTypes.shape({
				id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
					.isRequired,
				name: PropTypes.string.isRequired,
				price: PropTypes.number.isRequired,
				quantity: PropTypes.number.isRequired,
				discount: PropTypes.number,
			})
		),
		subtotal: PropTypes.number,
		taxAmount: PropTypes.number,
		total: PropTypes.number,
		discountAmount: PropTypes.number,
		orderDiscount: PropTypes.object,
	}),
};

export default CartView;
