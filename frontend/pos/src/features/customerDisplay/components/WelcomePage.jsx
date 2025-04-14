// features/customerDisplay/components/WelcomePage.jsx

import { CakeIcon } from "@heroicons/react/24/outline"; // Or replace with Ajeen Bakery Logo SVG
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const WelcomePage = () => {
	const [currentTime, setCurrentTime] = useState(new Date());

	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 60000);
		return () => clearInterval(timer);
	}, []);

	const formattedTime = currentTime.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}); // Standard time format
	const formattedDate = currentTime.toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	// Animation variants (simplified for faster, subtle transitions)
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { duration: 0.4, ease: "easeInOut" } },
		exit: { opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } },
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 15 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
		}, // Custom ease
	};

	return (
		<motion.div
			key="welcome"
			className="w-full h-screen bg-white flex flex-col items-center justify-center p-10 md:p-16 text-center text-slate-800"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			{/* Replace CakeIcon with actual Logo if available */}
			<motion.div
				variants={itemVariants}
				className="mb-8"
			>
				<CakeIcon className="w-28 h-28 text-blue-600 mx-auto" />
				{/* Example with an img logo:
                <img src="/path/to/ajeen-logo.svg" alt="Ajeen Bakery Logo" className="h-20 w-auto mx-auto" />
                */}
			</motion.div>

			<motion.h1
				variants={itemVariants}
				className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4"
			>
				Welcome
				{/* Optionally add "to Ajeen Bakery" if logo isn't clear enough */}
			</motion.h1>

			<motion.p
				variants={itemVariants}
				className="text-xl md:text-2xl text-slate-600 mb-12"
			>
				Please see the cashier to start your order
			</motion.p>

			<motion.div
				variants={itemVariants}
				className="text-slate-500"
			>
				<div className="text-5xl md:text-6xl font-medium mb-2">
					{formattedTime}
				</div>
				<div className="text-lg md:text-xl">{formattedDate}</div>
			</motion.div>
		</motion.div>
	);
};

export default WelcomePage;
