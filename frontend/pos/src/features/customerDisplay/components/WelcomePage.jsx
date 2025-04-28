import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BuildingStorefrontIcon } from "@heroicons/react/24/outline"; // Example: Storefront icon

/**
 * WelcomePage Component (UI Revamped)
 * Displays a welcome message, time, and date on the customer display.
 */
const WelcomePage = () => {
	const [currentTime, setCurrentTime] = useState(new Date());

	// Update time every minute
	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every 60 seconds
		return () => clearInterval(timer); // Cleanup interval on unmount
	}, []);

	// Format time and date
	const formattedTime = currentTime.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	const formattedDate = currentTime.toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	// Animation variants for the container and items
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { duration: 0.5, ease: "easeInOut", staggerChildren: 0.15 },
		},
		exit: { opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } },
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
		}, // Smoother ease
	};

	return (
		<motion.div
			key="welcome" // Key for AnimatePresence
			className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-10 text-center text-slate-800 md:p-16" // Use a subtle gradient
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			{/* Logo/Icon */}
			<motion.div
				variants={itemVariants}
				className="mb-8"
			>
				{/* Replace with your actual logo SVG or image if available */}
				{/* <img src="/path/to/ajeen-logo.svg" alt="Ajeen Bakery Logo" className="h-20 w-auto mx-auto" /> */}
				<BuildingStorefrontIcon
					className="mx-auto h-24 w-24 text-blue-500 md:h-28 md:w-28"
					strokeWidth={1}
				/>
			</motion.div>

			{/* Welcome Message */}
			<motion.h1
				variants={itemVariants}
				className="mb-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl"
			>
				Welcome!
			</motion.h1>

			{/* Instruction Text */}
			<motion.p
				variants={itemVariants}
				className="mb-12 text-xl text-slate-600 md:text-2xl"
			>
				Please see the cashier to start your order.
			</motion.p>

			{/* Time and Date */}
			<motion.div
				variants={itemVariants}
				className="text-slate-500"
			>
				<div className="mb-2 text-5xl font-medium md:text-6xl">
					{formattedTime}
				</div>
				<div className="text-lg md:text-xl">{formattedDate}</div>
			</motion.div>
		</motion.div>
	);
};

export default WelcomePage;
