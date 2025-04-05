// features/customerDisplay/components/WelcomePage.jsx

import { CakeIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const WelcomePage = () => {
	const [currentTime, setCurrentTime] = useState(new Date());

	// Update time every minute
	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTime(new Date());
		}, 60000);

		return () => clearInterval(timer);
	}, []);

	const formattedTime = currentTime.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	const formattedDate = currentTime.toLocaleDateString([], {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				when: "beforeChildren",
				staggerChildren: 0.15,
				duration: 0.4,
			},
		},
	};

	const itemVariants = {
		hidden: { y: 15, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: { type: "spring", stiffness: 250, damping: 20 },
		},
	};

	const pulseVariants = {
		pulse: {
			scale: [1, 1.03, 1],
			transition: {
				duration: 3,
				repeat: Infinity,
				repeatType: "reverse",
			},
		},
	};

	// Subtle floating animation for decorative elements
	const floatVariants = {
		float: (i) => ({
			y: [0, -10, 0],
			transition: {
				duration: 4 + i * 0.5,
				repeat: Infinity,
				repeatType: "reverse",
				ease: "easeInOut",
				delay: i * 0.3,
			},
		}),
	};

	return (
		<div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden relative">
			{/* Subtle gradient background */}
			<div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-0"></div>

			{/* Decorative elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
				<motion.div
					className="absolute top-10 left-10"
					custom={0}
					variants={floatVariants}
					animate="float"
				>
					<div className="w-32 h-32 rounded-full bg-blue-100 opacity-20 blur-xl"></div>
				</motion.div>

				<motion.div
					className="absolute bottom-20 right-20"
					custom={1}
					variants={floatVariants}
					animate="float"
				>
					<div className="w-48 h-48 rounded-full bg-indigo-100 opacity-20 blur-xl"></div>
				</motion.div>

				<motion.div
					className="absolute top-1/3 right-1/4"
					custom={2}
					variants={floatVariants}
					animate="float"
				>
					<div className="w-24 h-24 rounded-full bg-teal-100 opacity-15 blur-lg"></div>
				</motion.div>
			</div>

			{/* Top accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 w-full flex-shrink-0 z-10 shadow-sm"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			></motion.div>

			{/* Main content */}
			<motion.div
				className="w-full flex-grow flex flex-col items-center justify-center px-6 z-10"
				initial="hidden"
				animate="visible"
				variants={containerVariants}
			>
				<div className="max-w-xl w-full text-center">
					{/* Icon and Welcome message */}
					<motion.div variants={itemVariants}>
						<motion.div
							className="flex justify-center mb-8"
							variants={pulseVariants}
							animate="pulse"
						>
							<div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full shadow-md">
								<CakeIcon className="w-20 h-20 text-blue-600" />
							</div>
						</motion.div>

						<motion.h1
							className="text-4xl font-semibold text-gray-800 tracking-tight mb-3"
							variants={itemVariants}
						>
							Welcome to Ajeen Bakery
						</motion.h1>

						<motion.p
							className="text-xl text-gray-600 font-light mb-8"
							variants={itemVariants}
						>
							Fresh baked goods made with love
						</motion.p>

						{/* Time and date display with refined styling */}
						<motion.div
							className="flex flex-col items-center gap-1"
							variants={itemVariants}
						>
							<span className="text-3xl font-light text-gray-700">
								{formattedTime}
							</span>
							<span className="text-sm text-gray-500 mt-1">
								{formattedDate}
							</span>
						</motion.div>
					</motion.div>
				</div>
			</motion.div>

			{/* Bottom accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 w-full flex-shrink-0 z-10 shadow-sm"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
			></motion.div>
		</div>
	);
};

export default WelcomePage;
