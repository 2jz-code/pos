// src/animations/paymentAnimations.js
export const paymentAnimations = {
	pageVariants: {
		enter: (direction) => ({
			x: direction > 0 ? "100%" : "-100%",
			opacity: 0,
		}),
		center: {
			// Removed extra parenthesis
			x: 0,
			opacity: 1,
		}, // Fixed syntax
		exit: (direction) => ({
			x: direction < 0 ? "100%" : "-100%",
			opacity: 0,
		}),
	},

	pageTransition: {
		type: "tween",
		ease: "easeInOut",
		duration: 0.3,
	},

	footerVariants: {
		hidden: { y: 100 },
		visible: {
			y: 0,
			transition: {
				type: "spring",
				bounce: 0.2,
			},
		},
	},
};
