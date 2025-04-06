// features/customerDisplay/components/TipSelectionView.jsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { formatPrice } from "../../../../utils/numberUtils";

const TipSelectionView = ({ orderTotal = 0, onComplete }) => {
	// State for tip amount and percentage
	const [tipAmount, setTipAmount] = useState(0);
	const [selectedPercentage, setSelectedPercentage] = useState(null);
	const [totalWithTip, setTotalWithTip] = useState(orderTotal);

	// Update total when tip changes
	useEffect(() => {
		setTotalWithTip(orderTotal + tipAmount);
	}, [orderTotal, tipAmount]);

	// Define standard tip percentages
	const tipPercentages = [
		{ label: "15%", value: 0.15 },
		{ label: "18%", value: 0.18 },
		{ label: "20%", value: 0.2 },
		{ label: "25%", value: 0.25 },
	];

	// Calculate tip amount based on percentage
	const calculateTipFromPercentage = (percentage) => {
		return Math.round(orderTotal * percentage * 100) / 100;
	};

	// Handle tip percentage selection
	const handleTipSelection = (percentage) => {
		const calculatedTip = calculateTipFromPercentage(percentage);
		setTipAmount(calculatedTip);
		setSelectedPercentage(percentage);
	};

	// Handle custom tip amount
	const handleCustomTipChange = (e) => {
		const value = parseFloat(e.target.value);
		setTipAmount(isNaN(value) ? 0 : value);
		setSelectedPercentage(null);
	};

	// Handle completion - submit the selected tip
	const handleComplete = () => {
		if (onComplete) {
			onComplete({
				tipAmount,
				tipPercentage: selectedPercentage,
				orderTotal,
				totalWithTip,
			});
		}
	};

	// Handle skipping tip
	const handleSkip = () => {
		if (onComplete) {
			onComplete({
				tipAmount: 0,
				tipPercentage: 0,
				orderTotal,
				totalWithTip: orderTotal,
			});
		}
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
			<div className="flex-1 flex flex-col px-6 py-4 relative z-10">
				{/* Header */}
				<div className="text-center py-4">
					<motion.h2
						className="text-2xl font-semibold text-gray-800 tracking-tight mb-1"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4 }}
					>
						Would You Like to Add a Tip?
					</motion.h2>
					<motion.p
						className="text-sm text-gray-600 font-light"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.1, duration: 0.4 }}
					>
						Your support is appreciated by our staff.
					</motion.p>
				</div>

				{/* Content container with equal spacing */}
				<div className="flex-1 flex flex-col justify-evenly max-w-md mx-auto w-full">
					{/* Total display */}
					<div className="text-center mt-2 mb-4 bg-transparent py-4 px-6 border-b border-gray-100">
						<div className="text-sm text-gray-500 mb-1 font-light">Total</div>
						<div className="flex items-center justify-center">
							<motion.div
								className="text-2xl font-semibold text-gray-800"
								key={totalWithTip}
								initial={{ opacity: 0.7, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ type: "spring", stiffness: 300, damping: 15 }}
							>
								${formatPrice(totalWithTip)}
							</motion.div>

							{/* Tip indicator */}
							<AnimatePresence>
								{tipAmount > 0 && (
									<motion.div
										className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full"
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -10 }}
									>
										+${formatPrice(tipAmount)} tip
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>

					{/* Tip options container */}
					<div className="w-full">
						{/* Tip percentage buttons */}
						<motion.div
							className="grid grid-cols-4 gap-3 mb-5"
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.15 }}
						>
							{tipPercentages.map((tip) => (
								<button
									key={tip.label}
									onClick={() => handleTipSelection(tip.value)}
									className={`py-3 px-2 rounded-lg transition-all duration-200 ${
										selectedPercentage === tip.value
											? "bg-blue-50 border-2 border-blue-300 text-blue-700"
											: "bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
									}`}
								>
									<div className="font-medium">{tip.label}</div>
									<div className="text-sm">
										${formatPrice(calculateTipFromPercentage(tip.value))}
									</div>
								</button>
							))}
						</motion.div>

						{/* Custom tip input */}
						<motion.div
							className="mb-6"
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.25 }}
						>
							<label
								htmlFor="customTip"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Custom Amount
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<span className="text-gray-500">$</span>
								</div>
								<input
									type="number"
									id="customTip"
									min="0"
									step="0.01"
									value={selectedPercentage === null ? tipAmount : ""}
									onChange={handleCustomTipChange}
									placeholder="Enter amount"
									className="block w-full pl-8 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
						</motion.div>

						{/* Action buttons */}
						<motion.div
							className="grid grid-cols-2 gap-4"
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.35 }}
						>
							<button
								onClick={handleSkip}
								className="py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
							>
								No Tip
							</button>
							<button
								onClick={handleComplete}
								className="py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium"
							>
								{tipAmount > 0 ? `Add Tip` : "Continue"}
							</button>
						</motion.div>
					</div>
				</div>
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

TipSelectionView.propTypes = {
	orderTotal: PropTypes.number.isRequired,
	onComplete: PropTypes.func,
};

export default TipSelectionView;
