// features/customerDisplay/components/FlowProgressMeter.jsx

import { motion } from "framer-motion";
import PropTypes from "prop-types";

const FlowProgressMeter = ({ steps, currentStep }) => {
	// Find the current step index
	const currentIndex = steps.findIndex((step) => step.id === currentStep);

	// Calculate progress percentage
	const progressPercentage = ((currentIndex + 1) / steps.length) * 100;

	return (
		<div className="w-full">
			{/* Progress bar */}
			<div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
				<motion.div
					className="h-full bg-blue-500"
					initial={{ width: 0 }}
					animate={{ width: `${progressPercentage}%` }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
				/>
			</div>

			{/* Steps */}
			<div className="flex justify-between mb-8">
				{steps.map((step, index) => {
					// Determine step status
					const isCompleted = index < currentIndex;
					const isCurrent = index === currentIndex;

					return (
						<div
							key={step.id}
							className="flex flex-col items-center"
						>
							{/* Step indicator */}
							<motion.div
								className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
									isCompleted
										? "bg-blue-500 text-white"
										: isCurrent
										? "bg-blue-100 text-blue-600 border-2 border-blue-500"
										: "bg-slate-100 text-slate-400"
								}`}
								initial={{ scale: 0.8, opacity: 0.5 }}
								animate={{
									scale: isCurrent ? 1.1 : 1,
									opacity: 1,
								}}
								transition={{ duration: 0.3 }}
							>
								{isCompleted ? (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								) : (
									<span>{index + 1}</span>
								)}
							</motion.div>

							{/* Step label */}
							<span
								className={`text-xs ${
									isCurrent ? "font-medium text-blue-600" : "text-slate-500"
								}`}
							>
								{step.label}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};

FlowProgressMeter.propTypes = {
	steps: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.string.isRequired,
			label: PropTypes.string.isRequired,
		})
	).isRequired,
	currentStep: PropTypes.string.isRequired,
};

export default FlowProgressMeter;
