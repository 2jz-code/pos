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
				staggerChildren: 0.2,
				duration: 0.3,
			},
		},
	};

	const itemVariants = {
		hidden: { y: 20, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: { type: "spring", stiffness: 300, damping: 24 },
		},
	};

	const pulseVariants = {
		pulse: {
			scale: [1, 1.05, 1],
			transition: {
				duration: 2,
				repeat: Infinity,
				repeatType: "reverse",
			},
		},
	};

	// Floating animation for decorative elements
	const floatVariants = {
		float: (i) => ({
			y: [0, -15, 0],
			transition: {
				duration: 3 + i * 0.5,
				repeat: Infinity,
				repeatType: "reverse",
				ease: "easeInOut",
				delay: i * 0.2,
			},
		}),
	};

	return (
		<div className="w-full h-screen bg-white flex flex-col overflow-hidden relative">
			{/* Decorative bakery elements positioned absolutely */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				{/* Top left decorative element */}
				<motion.div
					className="absolute top-12 left-12"
					custom={0}
					variants={floatVariants}
					animate="float"
				>
					<div className="w-24 h-24 rounded-full bg-blue-50 opacity-30"></div>
				</motion.div>

				{/* Bottom right decorative element */}
				<motion.div
					className="absolute bottom-12 right-12"
					custom={1}
					variants={floatVariants}
					animate="float"
				>
					<div className="w-32 h-32 rounded-full bg-indigo-50 opacity-30"></div>
				</motion.div>
			</div>

			{/* Top colored band */}
			<motion.div
				className="h-3 bg-gradient-to-r from-blue-500 to-indigo-600 w-full flex-shrink-0 z-10"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			></motion.div>

			{/* Main content */}
			<motion.div
				className="w-full flex-grow flex flex-col items-center justify-center px-6 overflow-hidden z-10"
				initial="hidden"
				animate="visible"
				variants={containerVariants}
			>
				<div className="max-w-2xl w-full text-center">
					{/* Icon and Welcome message */}
					<motion.div variants={itemVariants}>
						<motion.div
							className="flex justify-center mb-8"
							variants={pulseVariants}
							animate="pulse"
						>
							<div className="p-6 bg-blue-50 rounded-full">
								<CakeIcon className="w-24 h-24 text-blue-600" />
							</div>
						</motion.div>

						<motion.h1
							className="text-5xl font-bold text-slate-800 mb-4"
							variants={itemVariants}
						>
							Welcome to Ajeen Bakery
						</motion.h1>

						<motion.p
							className="text-2xl text-slate-600 mb-6"
							variants={itemVariants}
						>
							Fresh baked goods made with love
						</motion.p>

						<motion.div
							className="flex justify-center items-center gap-2 text-slate-400"
							variants={itemVariants}
						>
							<span className="text-lg">{formattedTime}</span>
							<span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
							<span>{formattedDate}</span>
						</motion.div>
					</motion.div>
				</div>
			</motion.div>
		</div>
	);
};

export default WelcomePage;
