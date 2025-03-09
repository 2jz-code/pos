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
		<div className="w-full h-screen bg-white flex flex-col">
			{/* Top colored band */}
			<motion.div
				className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 w-full flex-shrink-0"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			/>

			{/* Main content - using flex with justify-between to maximize space usage */}
			<div className="flex-1 flex flex-col px-4 py-2">
				{/* Header - reduced vertical padding */}
				<div className="text-center py-3">
					<motion.h2
						className="text-xl font-bold text-slate-800 mb-1"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						Would You Like to Add a Tip?
					</motion.h2>
					<motion.p
						className="text-sm text-slate-600"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1, transition: { delay: 0.1 } }}
					>
						Your support is appreciated by our staff.
					</motion.p>
				</div>

				{/* Content container with equal spacing */}
				<div className="flex-1 flex flex-col justify-evenly">
					{/* Total display - moved closer to tip options */}
					<div className="text-center mt-2 mb-3">
						<div className="text-sm text-slate-500 mb-1">Total</div>
						<div className="flex items-center justify-center">
							<motion.div
								className="text-2xl font-bold text-slate-800"
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
										className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
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
					<div className="max-w-lg mx-auto w-full">
						{/* Tip percentage buttons - reduced bottom margin */}
						<motion.div
							className="grid grid-cols-4 gap-2 mb-3"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
						>
							{tipPercentages.map((tip) => (
								<button
									key={tip.label}
									onClick={() => handleTipSelection(tip.value)}
									className={`py-2 px-2 rounded-lg border ${
										selectedPercentage === tip.value
											? "bg-blue-50 border-blue-400 text-blue-700"
											: "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
									} transition-colors`}
								>
									<div className="font-medium">{tip.label}</div>
									<div className="text-sm">
										${formatPrice(calculateTipFromPercentage(tip.value))}
									</div>
								</button>
							))}
						</motion.div>

						{/* Custom tip input - reduced margin */}
						<motion.div
							className="mb-4"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
						>
							<label
								htmlFor="customTip"
								className="block text-sm font-medium text-slate-700 mb-1"
							>
								Custom Amount
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<span className="text-slate-500">$</span>
								</div>
								<input
									type="number"
									id="customTip"
									min="0"
									step="0.01"
									value={selectedPercentage === null ? tipAmount : ""}
									onChange={handleCustomTipChange}
									placeholder="Enter amount"
									className="block w-full pl-8 pr-12 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
						</motion.div>

						{/* Action buttons - adjusted to be closer to input */}
						<motion.div
							className="grid grid-cols-2 gap-3"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 }}
						>
							<button
								onClick={handleSkip}
								className="py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
							>
								No Tip
							</button>
							<button
								onClick={handleComplete}
								className="py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
							>
								{tipAmount > 0 ? `Add Tip` : "Continue"}
							</button>
						</motion.div>
					</div>
				</div>
			</div>
		</div>
	);
};

TipSelectionView.propTypes = {
	orderTotal: PropTypes.number.isRequired,
	onComplete: PropTypes.func,
};

export default TipSelectionView;
