// src/components/rewards/RewardsTierBadge.jsx
import PropTypes from "prop-types";

const RewardsTierBadge = ({ tier, onClick, className }) => {
	// Define tier-specific styles
	const tierStyles = {
		bronze: {
			background: "linear-gradient(145deg, #cd7f32, #e8c496)",
			border: "1px solid #a56c2a",
			color: "#5d3c15",
		},
		silver: {
			background: "linear-gradient(145deg, #c0c0c0, #e8e8e8)",
			border: "1px solid #a0a0a0",
			color: "#505050",
		},
		gold: {
			background: "linear-gradient(145deg, #ffd700, #ffec8b)",
			border: "1px solid #e6c300",
			color: "#8b7500",
		},
		platinum: {
			background: "linear-gradient(145deg, #e5e4e2, #f5f5f5)",
			border: "1px solid #bbbab8",
			color: "#555555",
		},
	};

	// Normalize tier name to lowercase for consistency
	const normalizedTier = tier.toLowerCase();
	const style = tierStyles[normalizedTier] || tierStyles.bronze;

	return (
		<button
			onClick={onClick}
			className={`px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all flex items-center justify-center ${className}`}
			style={style}
			title={`${tier.toUpperCase()} Member`}
		>
			<span className="uppercase">{normalizedTier.charAt(0)}</span>
		</button>
	);
};

RewardsTierBadge.propTypes = {
	tier: PropTypes.string.isRequired,
	onClick: PropTypes.func.isRequired,
	className: PropTypes.string,
};

export default RewardsTierBadge;
