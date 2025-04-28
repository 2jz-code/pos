import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { formatPrice } from "../../../../utils/numberUtils"; // Ensure path is correct
import { HandThumbUpIcon } from "@heroicons/react/24/outline"; // Example icon

/**
 * TipSelectionView Component (UI Revamped)
 * Allows the customer to select a tip percentage or enter a custom amount.
 */
const TipSelectionView = ({ orderTotal = 0, onComplete }) => {
	// State for tip amount, selected percentage, and custom input value
	const [tipAmount, setTipAmount] = useState(0);
	const [selectedPercentage, setSelectedPercentage] = useState(null); // Store the % value
	const [customTipInput, setCustomTipInput] = useState(""); // Store custom input as string

	// Calculate total with tip whenever base total or tip amount changes
	const totalWithTip = useMemo(
		() => orderTotal + tipAmount,
		[orderTotal, tipAmount]
	);

	// Predefined tip percentages
	const tipPercentages = [15, 18, 20, 25];

	// Calculate tip amount based on percentage and base order total
	const calculateTipFromPercentage = (percentage) => {
		if (orderTotal <= 0 || percentage <= 0) return 0;
		// Calculate in cents to avoid floating point issues, then convert back
		const orderCents = Math.round(orderTotal * 100);
		const tipCents = Math.round(orderCents * (percentage / 100));
		return tipCents / 100;
	};

	// Handle selection of a percentage button
	const handleTipSelection = (percentage) => {
		const calculatedTip = calculateTipFromPercentage(percentage);
		setTipAmount(calculatedTip);
		setSelectedPercentage(percentage);
		setCustomTipInput(""); // Clear custom input when percentage is selected
	};

	// Handle changes to the custom tip input field
	const handleCustomTipChange = (e) => {
		const inputVal = e.target.value;
		setCustomTipInput(inputVal); // Keep input as string

		// Validate and parse the input value
		const value = parseFloat(inputVal);
		const newTipAmount = !isNaN(value) && value >= 0 ? value : 0; // Allow 0, handle NaN

		setTipAmount(newTipAmount);
		setSelectedPercentage(null); // Deselect percentage buttons when custom is used
	};

	// Handle confirming the selected tip (or no tip)
	const handleComplete = () => {
		if (onComplete) {
			onComplete({
				tipAmount: parseFloat(tipAmount.toFixed(2)), // Ensure 2 decimal places
				tipPercentage: selectedPercentage, // Pass the selected percentage (or null)
				// Pass back totals for potential verification/logging
				orderTotal: parseFloat(orderTotal.toFixed(2)),
				totalWithTip: parseFloat(totalWithTip.toFixed(2)),
			});
		}
	};

	// Handle skipping the tip selection
	const handleSkip = () => {
		setTipAmount(0); // Reset tip amount
		setSelectedPercentage(0); // Indicate 'No Tip' was chosen explicitly
		setCustomTipInput("");
		if (onComplete) {
			onComplete({
				tipAmount: 0,
				tipPercentage: 0, // Explicitly 0 for skip
				orderTotal: parseFloat(orderTotal.toFixed(2)),
				totalWithTip: parseFloat(orderTotal.toFixed(2)), // Total remains base total
			});
		}
	};

	// --- Styling Classes ---
	const primaryColor = "blue-600";
	const primaryHoverColor = "blue-700";
	const primaryRingColor = "blue-500";
	const secondaryColor = "slate-700";
	const secondaryBorder = "slate-300";
	const secondaryHoverBg = "slate-50";

	const tipButtonBase = `flex-1 flex flex-col items-center justify-center rounded-lg border-2 p-4 text-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${primaryRingColor}`;
	const tipButtonSelected = `bg-${primaryColor} border-${primaryColor} text-white shadow-lg scale-105`;
	const tipButtonNormal = `bg-white border-${secondaryBorder} text-${secondaryColor} hover:border-${primaryColor}/50 hover:bg-${primaryColor}/5`;
	const baseButtonClass = `w-full inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`;
	const primaryButtonClass = `${baseButtonClass} bg-${primaryColor} text-white hover:bg-${primaryHoverColor} focus:ring-${primaryColor}`;
	const secondaryButtonClass = `${baseButtonClass} bg-white text-${secondaryColor} border border-${secondaryBorder} hover:bg-${secondaryHoverBg} focus:ring-${secondaryColor}`;

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { duration: 0.3 } },
		exit: { opacity: 0, transition: { duration: 0.2 } },
	};
	const itemVariants = (delay = 0) => ({
		hidden: { opacity: 0, y: 15 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.5, delay, ease: "easeOut" },
		},
	});

	return (
		<motion.div
			key="tip"
			className="flex h-full w-full flex-col items-center justify-center bg-white p-8 md:p-12 lg:p-16"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			<div className="w-full max-w-lg text-center">
				{/* Header */}
				<motion.div
					variants={itemVariants(0)}
					className="mb-8 md:mb-10"
				>
					<HandThumbUpIcon
						className={`mx-auto mb-4 h-16 w-16 text-${primaryColor} opacity-80`}
						strokeWidth={1.5}
					/>
					<h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
						Add a Tip?
					</h2>
					<p className="text-lg text-slate-600 md:text-xl">
						100% of tips go directly to our team!
					</p>
				</motion.div>

				{/* Total Display */}
				<motion.div
					variants={itemVariants(0.1)}
					className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-5 md:mb-10"
				>
					<div className="text-sm font-medium text-slate-500">
						Total Including Tip
					</div>
					<div className="mt-1 flex items-baseline justify-center gap-2">
						<span className="text-4xl font-bold text-slate-900 md:text-5xl">
							{formatPrice(totalWithTip)}
						</span>
						{/* Show calculated tip amount clearly */}
						{tipAmount > 0 && (
							<motion.span
								key={tipAmount} // Animate change when tipAmount changes
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								className={`ml-1 rounded-full bg-${primaryColor}/10 px-2 py-0.5 text-sm font-medium text-${primaryColor}`}
							>
								(+{formatPrice(tipAmount)} tip)
							</motion.span>
						)}
					</div>
				</motion.div>

				{/* Tip Options */}
				<motion.div
					variants={itemVariants(0.2)}
					className="w-full"
				>
					{/* Percentage Buttons */}
					<div className="mb-5 grid grid-cols-4 gap-3 md:gap-4">
						{tipPercentages.map((percent) => (
							<button
								key={percent}
								onClick={() => handleTipSelection(percent)}
								className={`${tipButtonBase} ${
									selectedPercentage === percent
										? tipButtonSelected
										: tipButtonNormal
								}`}
							>
								<span className="text-base font-semibold md:text-lg">
									{percent}%
								</span>
								<span className="mt-0.5 text-xs opacity-80 md:text-sm">
									{formatPrice(calculateTipFromPercentage(percent))}
								</span>
							</button>
						))}
					</div>

					{/* Custom Tip Input */}
					<div className="mb-6">
						<label
							htmlFor="customTip"
							className="sr-only"
						>
							Custom Tip Amount
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
								<span className="text-slate-400 sm:text-base">$</span>
							</div>
							<input
								type="number"
								id="customTip"
								name="customTip"
								min="0"
								step="0.01"
								value={customTipInput}
								onChange={handleCustomTipChange}
								placeholder="Custom Amount"
								className={`block w-full rounded-lg border-2 border-${secondaryBorder} bg-white py-3 pl-10 pr-4 text-center text-base focus:border-${primaryColor} focus:ring-1 focus:ring-${primaryColor} sm:leading-6`}
							/>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="grid grid-cols-2 gap-4">
						<button
							onClick={handleSkip}
							className={secondaryButtonClass}
						>
							No Tip
						</button>
						<button
							onClick={handleComplete}
							className={primaryButtonClass}
						>
							{tipAmount > 0 ? `Add ${formatPrice(tipAmount)} Tip` : "Continue"}
						</button>
					</div>
				</motion.div>
			</div>
		</motion.div>
	);
};

TipSelectionView.propTypes = {
	orderTotal: PropTypes.number.isRequired, // Base total before tip
	onComplete: PropTypes.func,
};

export default TipSelectionView;
