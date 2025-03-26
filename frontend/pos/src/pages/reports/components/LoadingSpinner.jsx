// src/components/LoadingSpinner.jsx
import PropTypes from "prop-types";

const LoadingSpinner = ({ size = "md", className = "" }) => {
	const sizeClasses = {
		xs: "h-3 w-3 border-2",
		sm: "h-4 w-4 border-2",
		md: "h-6 w-6 border-2",
		lg: "h-10 w-10 border-3",
		xl: "h-12 w-12 border-4",
	};

	const sizeClass = sizeClasses[size] || sizeClasses.md;

	return (
		<div
			className={`${sizeClass} ${className} animate-spin rounded-full border-t-transparent border-blue-600`}
		></div>
	);
};

LoadingSpinner.propTypes = {
	size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
	className: PropTypes.string,
};

export default LoadingSpinner;
