import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "../../../../utils/numberUtils"; // Ensure path is correct
import { ShoppingCartIcon, TagIcon } from "@heroicons/react/24/outline";

/**
 * CartView Component (UI Revamped)
 * Displays the customer's current cart items and totals on the customer display.
 */
const CartView = ({ cartData }) => {
	// Destructure with defaults
	const {
		items = [],
		subtotal = 0,
		taxAmount = 0,
		total = 0,
		discountAmount = 0,
		orderDiscount = null,
	} = cartData || {}; // Add fallback for potentially null cartData

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.05, delayChildren: 0.1 },
		}, // Stagger item appearance
		exit: { opacity: 0 },
	};

	const itemVariants = {
		hidden: { opacity: 0, x: -20 },
		visible: {
			opacity: 1,
			x: 0,
			transition: { type: "spring", stiffness: 300, damping: 25 },
		},
		exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
	};

	const summaryVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.4, ease: "easeOut", delay: 0.2 },
		},
		exit: { opacity: 0 },
	};

	return (
		<motion.div
			key="cart-view" // Unique key for AnimatePresence
			className="flex h-full w-full flex-col bg-slate-50" // Light background
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			{/* Optional Header */}
			<div className="flex-shrink-0 border-b border-slate-200 bg-white p-4 text-center shadow-sm">
				<h1 className="text-xl font-semibold text-slate-800">Your Order</h1>
			</div>

			{/* Cart Items List - Scrollable */}
			<div className="flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-6">
				<AnimatePresence initial={false}>
					{" "}
					{/* Animate items in/out */}
					{items.length === 0 ? (
						<motion.div
							key="empty-cart"
							className="flex h-full flex-col items-center justify-center pt-10 text-slate-400"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ duration: 0.3 }}
						>
							<ShoppingCartIcon
								className="mb-4 h-20 w-20 text-slate-300"
								strokeWidth={1}
							/>
							<p className="text-xl text-slate-500">Your order is empty</p>
						</motion.div>
					) : (
						<motion.div
							className="space-y-3"
							variants={containerVariants}
						>
							{items.map((item, index) => (
								<motion.div
									key={item.id || `item-${index}`} // Use index as fallback key if id is missing
									layout // Animate layout changes
									variants={itemVariants}
									exit="exit"
									className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-white p-4 shadow-sm"
								>
									<div className="flex min-w-0 items-center gap-3">
										{/* Quantity Badge */}
										<span className="flex-shrink-0 rounded bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-600">
											{item.quantity}x
										</span>
										{/* Item Name */}
										<span
											className="truncate font-medium text-base text-slate-800"
											title={item.name}
										>
											{item.name}
										</span>
										{/* Item-level Discount (if applicable) */}
										{item.discount > 0 && (
											<span className="ml-1 flex-shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
												-{item.discount}%
											</span>
										)}
									</div>
									{/* Item Total Price */}
									<span className="flex-shrink-0 font-semibold text-base text-slate-800">
										{formatPrice(
											(item.price || 0) *
												(item.quantity || 1) *
												(1 - (item.discount || 0) / 100)
										)}
									</span>
								</motion.div>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Order Summary Footer - Only show if items exist */}
			{items.length > 0 && (
				<motion.div
					layout // Animate size changes
					variants={summaryVariants}
					className="flex-shrink-0 border-t-2 border-slate-200 bg-white p-4 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)] sm:p-6" // Top shadow
				>
					<div className="mb-4 space-y-2 text-base">
						{/* Subtotal */}
						<div className="flex justify-between text-slate-600">
							<span>Subtotal</span>
							<span className="font-medium text-slate-800">
								{formatPrice(subtotal)}
							</span>
						</div>

						{/* Discount */}
						{discountAmount > 0 && (
							<div className="flex justify-between text-emerald-600">
								<span className="flex items-center gap-1">
									<TagIcon className="h-4 w-4" />
									Discount {orderDiscount ? `(${orderDiscount.name})` : ""}
								</span>
								<span className="font-medium">
									-{formatPrice(discountAmount)}
								</span>
							</div>
						)}

						{/* Tax */}
						<div className="flex justify-between text-slate-600">
							<span>Tax</span>
							<span className="font-medium text-slate-800">
								{formatPrice(taxAmount)}
							</span>
						</div>
					</div>

					{/* Total */}
					<div className="mt-4 flex items-baseline justify-between border-t border-slate-200 pt-4">
						<span className="text-xl font-bold text-slate-900 sm:text-2xl">
							Total
						</span>
						<span className="text-2xl font-bold text-blue-600 sm:text-3xl">
							{formatPrice(total)}
						</span>
					</div>
				</motion.div>
			)}
		</motion.div>
	);
};

CartView.propTypes = {
	cartData: PropTypes.shape({
		items: PropTypes.arrayOf(
			PropTypes.shape({
				id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
					.isRequired,
				name: PropTypes.string.isRequired,
				price: PropTypes.number, // Price might be optional if fetched later
				quantity: PropTypes.number.isRequired,
				discount: PropTypes.number, // Item-level discount
			})
		),
		subtotal: PropTypes.number,
		taxAmount: PropTypes.number,
		total: PropTypes.number,
		discountAmount: PropTypes.number, // Order-level discount amount
		orderDiscount: PropTypes.shape({
			// Details of the applied discount
			id: PropTypes.number,
			name: PropTypes.string,
			// Add other discount fields if needed
		}),
	}),
};

export default CartView;
