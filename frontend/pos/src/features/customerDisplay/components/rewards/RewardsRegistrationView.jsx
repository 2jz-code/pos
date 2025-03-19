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
				staggerChildren: 0.1,
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
				className="mb-6"
			>
				<div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
				<h2 className="text-2xl font-bold text-slate-800 mb-2">
					Join Our Rewards Program
				</h2>
				<p className="text-slate-600 mb-4">
					Earn points with every purchase and get exclusive offers!
				</p>
			</motion.div>

			<motion.div
				variants={itemVariants}
				className="flex flex-col space-y-3"
			>
				<button
					onClick={startRegistration}
					className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Sign Up Now
				</button>
				<button
					onClick={handleSkip}
					className="w-full py-3 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
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
				className="text-xl font-bold text-slate-800 mb-4 text-center"
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
							className="block text-sm font-medium text-slate-700 mb-1"
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
							className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<label
							htmlFor="lastName"
							className="block text-sm font-medium text-slate-700 mb-1"
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
							className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>

				<div>
					<label
						htmlFor="email"
						className="block text-sm font-medium text-slate-700 mb-1"
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
						className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label
						htmlFor="phone"
						className="block text-sm font-medium text-slate-700 mb-1"
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
						className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
						className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
					/>
					<label
						htmlFor="acceptTerms"
						className="ml-2 block text-sm text-slate-700"
					>
						I agree to the terms and conditions
					</label>
				</div>

				<div className="flex space-x-3 pt-2">
					<button
						type="submit"
						className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Create Account
					</button>
					<button
						type="button"
						onClick={handleSkip}
						className="flex-1 py-3 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
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
				<div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
				<h2 className="text-2xl font-bold text-slate-800 mb-2">
					Welcome to Rewards!
				</h2>
				<p className="text-slate-600">
					Your account has been created successfully.
					<br />
					You have earned 100 bonus points for signing up!
				</p>
			</motion.div>
		</motion.div>
	);

	return (
		<div className="w-full h-screen bg-white flex flex-col overflow-hidden">
			{/* Main content */}
			<div className="flex-1 flex flex-col p-6 justify-center">
				<div className="max-w-md w-full mx-auto">
					{step === "intro" && renderIntroStep()}
					{step === "form" && renderFormStep()}
					{step === "success" && renderSuccessStep()}
				</div>
			</div>
		</div>
	);
};

RewardsRegistrationView.propTypes = {
	onComplete: PropTypes.func,
};

export default RewardsRegistrationView;
