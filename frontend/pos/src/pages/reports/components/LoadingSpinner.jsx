import PropTypes from "prop-types";

/**
 * LoadingSpinner Component (Logic Preserved from User Provided Code)
 *
 * Simple spinner component.
 * UI updated slightly for consistency; Logic remains unchanged.
 */
const LoadingSpinner = ({ size = "md", className = "" }) => {
	// --- ORIGINAL LOGIC (UNCHANGED) ---
	const sizeClasses = {
		xs: "h-3 w-3 border-2",
		sm: "h-4 w-4 border-2",
		md: "h-6 w-6 border-2", // Default size
		lg: "h-10 w-10 border-[3px]", // Use border width instead of thickness number
		xl: "h-12 w-12 border-4",
	};
	const sizeClass = sizeClasses[size] || sizeClasses.md;
	// --- END OF ORIGINAL LOGIC ---

	// --- UPDATED UI ---
	return (
		// Use border-color and border-t-transparent for spinner effect
		<div
			className={`${sizeClass} ${className} animate-spin rounded-full border-blue-500 border-t-transparent`}
			role="status" // Added accessibility role
			aria-live="polite"
			aria-label="Loading"
		>
			<span className="sr-only">Loading...</span> {/* Screen reader text */}
		</div>
	);
	// --- END OF UPDATED UI ---
};

// --- ORIGINAL PROPTYPES (UNCHANGED) ---
LoadingSpinner.propTypes = {
	size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
	className: PropTypes.string,
};

export default LoadingSpinner;
