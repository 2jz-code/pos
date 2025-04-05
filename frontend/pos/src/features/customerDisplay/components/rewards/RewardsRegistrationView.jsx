// features/customerDisplay/components/RewardsRegistrationView.jsx

import { useState } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";

const RewardsRegistrationView = ({ onComplete }) => {
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
		acceptTerms: false,
	});
	const [step, setStep] = useState("intro"); // intro, form, success

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				when: "beforeChildren",
				staggerChildren: 0.08,
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

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData({
			...formData,
			[name]: type === "checkbox" ? checked : value,
		});
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		// In a real app, you would submit this data to your backend
		console.log("Submitting rewards registration:", formData);

		// Show success state
		setStep("success");

		// After a delay, notify parent component that registration is complete
		setTimeout(() => {
			if (onComplete) onComplete(formData);
		}, 3000);
	};

	const handleSkip = () => {
		if (onComplete) onComplete(null);
	};

	const startRegistration = () => {
		setStep("form");
	};

	const renderIntroStep = () => (
		<motion.div
			className="text-center"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
		>
			<motion.div
				variants={itemVariants}
				className="mb-8"
			>
				<div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-10 w-10 text-blue-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
						/>
					</svg>
				</div>
				<h2 className="text-2xl font-semibold text-gray-800 tracking-tight mb-2">
					Join Our Rewards Program
				</h2>
				<p className="text-gray-600 font-light">
					Earn points with every purchase and receive exclusive offers!
				</p>
			</motion.div>

			<motion.div
				variants={itemVariants}
				className="flex flex-col space-y-3"
			>
				<button
					onClick={startRegistration}
					className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm font-medium"
				>
					Sign Up Now
				</button>
				<button
					onClick={handleSkip}
					className="w-full py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
				>
					No Thanks
				</button>
			</motion.div>
		</motion.div>
	);

	const renderFormStep = () => (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
		>
			<motion.h2
				variants={itemVariants}
				className="text-xl font-semibold text-gray-800 tracking-tight mb-5 text-center"
			>
				Create Your Rewards Account
			</motion.h2>

			<motion.form
				variants={itemVariants}
				onSubmit={handleSubmit}
				className="space-y-4"
			>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label
							htmlFor="firstName"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							First Name
						</label>
						<input
							type="text"
							id="firstName"
							name="firstName"
							value={formData.firstName}
							onChange={handleChange}
							required
							className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
						/>
					</div>
					<div>
						<label
							htmlFor="lastName"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Last Name
						</label>
						<input
							type="text"
							id="lastName"
							name="lastName"
							value={formData.lastName}
							onChange={handleChange}
							required
							className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
						/>
					</div>
				</div>

				<div>
					<label
						htmlFor="email"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Email Address
					</label>
					<input
						type="email"
						id="email"
						name="email"
						value={formData.email}
						onChange={handleChange}
						required
						className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
					/>
				</div>

				<div>
					<label
						htmlFor="phone"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Phone Number
					</label>
					<input
						type="tel"
						id="phone"
						name="phone"
						value={formData.phone}
						onChange={handleChange}
						required
						className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
					/>
				</div>

				<div className="flex items-center">
					<input
						type="checkbox"
						id="acceptTerms"
						name="acceptTerms"
						checked={formData.acceptTerms}
						onChange={handleChange}
						required
						className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
					/>
					<label
						htmlFor="acceptTerms"
						className="ml-2 block text-sm text-gray-700"
					>
						I agree to the terms and conditions
					</label>
				</div>

				<div className="flex space-x-3 pt-2">
					<button
						type="submit"
						className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm font-medium"
					>
						Create Account
					</button>
					<button
						type="button"
						onClick={handleSkip}
						className="flex-1 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
					>
						Skip
					</button>
				</div>
			</motion.form>
		</motion.div>
	);

	const renderSuccessStep = () => (
		<motion.div
			className="text-center"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
		>
			<motion.div
				variants={itemVariants}
				className="mb-6"
			>
				<div className="w-20 h-20 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-10 w-10 text-emerald-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<h2 className="text-2xl font-semibold text-gray-800 tracking-tight mb-2">
					Welcome to Rewards!
				</h2>
				<p className="text-gray-600 font-light">
					Your account has been created successfully.
					<br />
					You have earned 100 bonus points for signing up!
				</p>
			</motion.div>
		</motion.div>
	);

	return (
		<div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
			{/* Subtle gradient background */}
			<div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-0"></div>

			{/* Top accent line */}
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 w-full flex-shrink-0 z-10 shadow-sm"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			></motion.div>

			{/* Main content */}
			<div className="flex-1 flex flex-col p-6 justify-center relative z-10">
				<div className="max-w-md w-full mx-auto bg-white p-8 rounded-lg shadow-sm">
					{step === "intro" && renderIntroStep()}
					{step === "form" && renderFormStep()}
					{step === "success" && renderSuccessStep()}
				</div>
			</div>

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

RewardsRegistrationView.propTypes = {
	onComplete: PropTypes.func,
};

export default RewardsRegistrationView;
