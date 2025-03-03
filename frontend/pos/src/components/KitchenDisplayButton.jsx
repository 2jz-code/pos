// src/components/KitchenDisplayButton.jsx
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

const KitchenDisplayButton = ({ className = "", size = "default" }) => {
	const navigate = useNavigate();

	// Determine classes based on size
	const getSizeClasses = () => {
		switch (size) {
			case "small":
				return "px-3 py-1.5 text-sm";
			case "large":
				return "px-5 py-3 text-base";
			default:
				return "px-4 py-2 text-sm";
		}
	};

	// Base classes + size classes + any additional classes
	const buttonClasses = `bg-blue-600 text-white rounded-lg hover:bg-blue-700 
    transition-colors flex items-center gap-1.5 font-medium
    ${getSizeClasses()} ${className}`;

	return (
		<button
			className={buttonClasses}
			onClick={() => navigate("/kitchen")}
			title="Open Kitchen Display"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className={size === "small" ? "h-4 w-4" : "h-5 w-5"}
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
				/>
			</svg>
			Kitchen Display
		</button>
	);
};

KitchenDisplayButton.propTypes = {
	className: PropTypes.string,
	size: PropTypes.oneOf(["small", "default", "large"]),
};

export default KitchenDisplayButton;
