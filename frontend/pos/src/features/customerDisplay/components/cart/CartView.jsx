// features/customerDisplay/components/CartView.jsx

import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { formatPrice } from "../../../../utils/numberUtils";

const CartView = ({ cartData }) => {
	// Extract the necessary data from the cart
	const { items = [], subtotal = 0, taxAmount = 0, total = 0 } = cartData;

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				when: "beforeChildren",
				staggerChildren: 0.08,
			},
		},
	};

	const itemVariants = {
		hidden: { y: 15, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: { type: "spring", stiffness: 250, damping: 20 },
		},
	};

	return (
		<div className="w-full h-screen bg-white flex flex-col overflow-hidden">
			{/* Top accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 w-full flex-shrink-0 z-10"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			></motion.div>

			{/* Main content */}
			<div className="flex-1 flex flex-col p-6 overflow-hidden relative z-10">
				<motion.div
					className="mb-6 text-center"
					initial={{ y: -15, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.1, duration: 0.4 }}
				>
					<h1 className="text-3xl font-semibold text-gray-800 tracking-tight">
						Your Order
					</h1>
					<p className="text-gray-500 mt-1 font-light">Ajeen Bakery</p>
				</motion.div>

				<motion.div
					className="flex-1 overflow-y-auto pr-2"
					variants={containerVariants}
					initial="hidden"
					animate="visible"
				>
					{items.length === 0 ? (
						<motion.div
							className="flex flex-col items-center justify-center h-full text-gray-400"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.2 }}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-16 w-16 mb-4 text-gray-300"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
							<p className="text-lg font-light">Your cart is empty</p>
						</motion.div>
					) : (
						<>
							{/* Cart items */}
							{items.map((item, index) => (
								<motion.div
									key={`${item.id}-${index}`}
									variants={itemVariants}
									className="mb-4 bg-transparent border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors duration-300"
								>
									<div className="flex justify-between items-start">
										<div>
											<h3 className="font-medium text-gray-800">{item.name}</h3>
											<p className="text-gray-500 text-sm mt-0.5">
												${formatPrice(item.price)} each
											</p>
										</div>
										<div className="text-right">
											<span className="font-medium text-gray-800">
												${formatPrice(item.price * item.quantity)}
											</span>
											<p className="text-gray-500 text-sm mt-0.5">
												Qty: {item.quantity}
											</p>
										</div>
									</div>
									{item.discount > 0 && (
										<div className="mt-2 text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full inline-block">
											{item.discount}% discount applied
										</div>
									)}
								</motion.div>
							))}
						</>
					)}
				</motion.div>

				{/* Order summary */}
				{items.length > 0 && (
					<motion.div
						className="border-t border-gray-200 pt-4 mt-auto bg-transparent p-4"
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<div className="flex justify-between text-gray-600 mb-2">
							<span>Subtotal</span>
							<span>${formatPrice(subtotal)}</span>
						</div>
						<div className="flex justify-between text-gray-600 mb-2">
							<span>Tax</span>
							<span>${formatPrice(taxAmount)}</span>
						</div>
						<div className="flex justify-between text-lg font-medium text-gray-800 mt-3 pt-3 border-t border-gray-200">
							<span>Total</span>
							<span>${formatPrice(total)}</span>
						</div>
					</motion.div>
				)}
			</div>

			{/* Bottom accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 w-full flex-shrink-0 z-10"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
			></motion.div>
		</div>
	);
};

CartView.propTypes = {
	cartData: PropTypes.shape({
		items: PropTypes.arrayOf(
			PropTypes.shape({
				id: PropTypes.number.isRequired,
				name: PropTypes.string.isRequired,
				price: PropTypes.number.isRequired,
				quantity: PropTypes.number.isRequired,
				discount: PropTypes.number,
			})
		),
		subtotal: PropTypes.number,
		taxAmount: PropTypes.number,
		total: PropTypes.number,
	}),
};

export default CartView;
