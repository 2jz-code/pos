// features/customerDisplay/components/TipSelectionView.jsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { formatPrice } from "../../../../utils/numberUtils";

const TipSelectionView = ({ orderTotal = 0, onComplete }) => {
	const [tipAmount, setTipAmount] = useState(0);
	const [selectedPercentage, setSelectedPercentage] = useState(null);
	const [customTipInput, setCustomTipInput] = useState("");
	const [totalWithTip, setTotalWithTip] = useState(orderTotal);

	useEffect(
		() => setTotalWithTip(orderTotal + tipAmount),
		[orderTotal, tipAmount]
	);

	const tipPercentages = [15, 18, 20, 25]; // Simplified values

	const calculateTipFromPercentage = (percentage) =>
		Math.round(orderTotal * (percentage / 100) * 100) / 100;

	const handleTipSelection = (percentage) => {
		setTipAmount(calculateTipFromPercentage(percentage));
		setSelectedPercentage(percentage);
		setCustomTipInput("");
	};

	const handleCustomTipChange = (e) => {
		const inputVal = e.target.value;
		setCustomTipInput(inputVal);
		const value = parseFloat(inputVal);
		const newTipAmount = isNaN(value) || value < 0 ? 0 : value;
		setTipAmount(newTipAmount);
		setSelectedPercentage(null);
	};

	const handleComplete = () => {
		if (onComplete) {
			onComplete({
				tipAmount: parseFloat(tipAmount.toFixed(2)),
				tipPercentage: selectedPercentage,
				orderTotal,
				totalWithTip: parseFloat(totalWithTip.toFixed(2)),
			});
		}
	};

	const handleSkip = () => {
		setTipAmount(0);
		setSelectedPercentage(0);
		setCustomTipInput("");
		if (onComplete) {
			onComplete({
				tipAmount: 0,
				tipPercentage: 0,
				orderTotal,
				totalWithTip: orderTotal,
			});
		}
	};

	// Brand colors
	const primaryColor = "blue-600"; // e.g. text-blue-600, bg-blue-600, border-blue-600
	const primaryHoverColor = "blue-700";
	const primaryRingColor = "blue-300";
	const secondaryColor = "slate-600";
	const secondaryHoverBg = "slate-100";
	const secondaryBorder = "slate-300";
	const secondaryRingColor = "slate-400";

	return (
		<motion.div
			key="tip"
			className="w-full h-screen bg-white flex flex-col items-center justify-center p-8 md:p-12 lg:p-16"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.3 }}
		>
			<div className="w-full max-w-lg text-center">
				{/* Header */}
				<motion.div
					className="mb-8 md:mb-10"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-2">
						Add a Tip
					</h2>
					<p className="text-lg md:text-xl text-slate-600">
						Optional - 100% goes to the team!
					</p>
				</motion.div>

				{/* Total Display */}
				<motion.div
					className="mb-8 md:mb-10 p-6 bg-slate-50 rounded-xl border border-slate-200"
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.2, duration: 0.4 }}
				>
					<div className="text-base text-slate-500 mb-1 font-medium">
						Total Including Tip
					</div>
					<div className="flex items-baseline justify-center gap-2">
						<span className="text-4xl md:text-5xl font-bold text-gray-900">
							${formatPrice(totalWithTip)}
						</span>
						<AnimatePresence>
							{tipAmount > 0 && (
								<motion.span
									className={`ml-2 px-2.5 py-1 bg-${primaryColor}/10 text-${primaryColor} text-sm rounded-full font-medium`}
									initial={{ opacity: 0, y: 5 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -5 }}
								>
									+${formatPrice(tipAmount)} tip
								</motion.span>
							)}
						</AnimatePresence>
					</div>
				</motion.div>

				{/* Tip Options */}
				<motion.div
					className="w-full"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3, duration: 0.5 }}
				>
					<div className="grid grid-cols-4 gap-3 md:gap-4 mb-6">
						{tipPercentages.map((percent) => (
							<button
								key={percent}
								onClick={() => handleTipSelection(percent)}
								className={`py-4 px-2 rounded-lg transition-all duration-150 border-2 text-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${primaryRingColor} ${
									selectedPercentage === percent
										? `bg-${primaryColor} border-${primaryColor} text-white shadow-md`
										: `bg-white border-${secondaryBorder} text-${secondaryColor} hover:border-${primaryColor}/50 hover:bg-${primaryColor}/5`
								}`}
							>
								<div className="font-semibold text-base md:text-lg">
									{percent}%
								</div>
								<div className="text-sm md:text-base opacity-80 mt-0.5">
									${formatPrice(calculateTipFromPercentage(percent))}
								</div>
							</button>
						))}
					</div>

					{/* Custom Tip */}
					<div className="mb-8 relative">
						<label
							htmlFor="customTip"
							className="sr-only"
						>
							Custom Tip Amount
						</label>{" "}
						{/* Screen reader label */}
						<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
							<span className="text-slate-400 text-lg">$</span>
						</div>
						<input
							type="number"
							id="customTip"
							min="0"
							step="0.01"
							value={customTipInput}
							onChange={handleCustomTipChange}
							placeholder="Enter Custom Amount"
							className={`block w-full pl-10 pr-4 py-4 border-2 border-${secondaryBorder} rounded-lg text-lg text-center focus:ring-2 focus:ring-${primaryRingColor} focus:border-${primaryColor} placeholder-slate-400`}
						/>
					</div>

					{/* Actions */}
					<div className="grid grid-cols-2 gap-4">
						<button
							onClick={handleSkip}
							className={`py-4 bg-white text-${secondaryColor} border-2 border-${secondaryBorder} rounded-lg hover:bg-${secondaryHoverBg} transition-colors font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${secondaryRingColor}`}
						>
							No Tip
						</button>
						<button
							onClick={handleComplete}
							className={`py-4 bg-${primaryColor} text-white rounded-lg shadow-sm hover:bg-${primaryHoverColor} transition-colors font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${primaryRingColor}`}
						>
							{tipAmount > 0 ? `Add Tip` : "Continue"}
						</button>
					</div>
				</motion.div>
			</div>
		</motion.div>
	);
};

TipSelectionView.propTypes = {
	orderTotal: PropTypes.number.isRequired,
	onComplete: PropTypes.func,
};

export default TipSelectionView;
