// features/customerDisplay/components/RewardsRegistrationView.jsx

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import {
	CheckCircleIcon,
	GiftIcon,
	ArrowLeftIcon,
} from "@heroicons/react/24/solid"; // Using solid icons

const RewardsRegistrationView = ({ onComplete }) => {
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
		acceptTerms: false,
	});
	const [step, setStep] = useState("intro"); // intro, form, success
	const [formErrors, setFormErrors] = useState({});

	// Animations
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { duration: 0.4 } },
		exit: { opacity: 0, transition: { duration: 0.2 } },
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 15 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
		},
	};

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
		if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
	};

	const validateForm = () => {
		// Basic validation (enhance as needed)
		const errors = {};
		if (!formData.firstName.trim()) errors.firstName = "First name required";
		if (!formData.lastName.trim()) errors.lastName = "Last name required";
		if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email))
			errors.email = "Valid email required";
		if (!formData.phone.trim()) errors.phone = "Phone number required"; // Add more specific phone validation if needed
		if (!formData.acceptTerms) errors.acceptTerms = "Agreement required";
		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!validateForm()) return;
		console.log("Submitting rewards:", formData);
		setStep("success");
		setTimeout(() => {
			if (onComplete) onComplete(formData);
		}, 2500); // Shorter success display
	};

	const handleSkip = () => {
		setFormData({
			firstName: "",
			lastName: "",
			email: "",
			phone: "",
			acceptTerms: false,
		});
		setFormErrors({});
		if (onComplete) onComplete(null);
	};

	// Brand colors (assuming blue)
	const primaryColor = "blue-600";
	const primaryHoverColor = "blue-700";
	const primaryRingColor = "blue-300";
	const secondaryColor = "slate-700";
	const secondaryBorder = "slate-300";
	const secondaryHoverBg = "slate-100";
	const secondaryRingColor = "slate-400";
	const errorColor = "red-500";
	const errorRingColor = "red-300";
	const successColor = "green-500";

	const inputBaseClass = `w-full px-4 py-3 border-2 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-offset-1`;
	const inputNormalClass = `border-slate-300 focus:border-${primaryColor} focus:ring-${primaryRingColor}`;
	const inputErrorClass = `border-${errorColor} focus:ring-${errorRingColor}`;

	const renderIntroStep = () => (
		<motion.div
			key="intro"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			className="text-center"
		>
			<motion.div variants={itemVariants}>
				<GiftIcon className={`w-20 h-20 text-${primaryColor} mx-auto mb-6`} />
				<h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3">
					Join Ajeen Rewards
				</h2>
				<p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
					Earn points on every purchase & get exclusive offers!
				</p>
			</motion.div>
			<motion.div
				variants={itemVariants}
				transition={{ delay: 0.1 }}
				className="flex flex-col space-y-4"
			>
				<button
					onClick={() => setStep("form")}
					className={`w-full py-4 bg-${primaryColor} text-white rounded-lg shadow-sm hover:bg-${primaryHoverColor} transition-colors font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${primaryRingColor}`}
				>
					Sign Up
				</button>
				<button
					onClick={handleSkip}
					className={`w-full py-4 bg-white text-${secondaryColor} border-2 border-${secondaryBorder} rounded-lg hover:bg-${secondaryHoverBg} transition-colors font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${secondaryRingColor}`}
				>
					No Thanks
				</button>
			</motion.div>
		</motion.div>
	);

	const renderFormStep = () => (
		<motion.div
			key="form"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			{/* Back Button */}
			<button
				onClick={() => setStep("intro")}
				className="absolute top-6 left-6 text-slate-500 hover:text-slate-700 transition-colors"
			>
				<ArrowLeftIcon className="w-6 h-6" />
			</button>

			<motion.h2
				variants={itemVariants}
				className="text-2xl font-semibold text-gray-800 mb-6 text-center pt-8"
			>
				Create Rewards Account
			</motion.h2>

			<motion.form
				variants={itemVariants}
				transition={{ delay: 0.1 }}
				onSubmit={handleSubmit}
				className="space-y-5"
				noValidate
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
							className={`${inputBaseClass} ${
								formErrors.firstName ? inputErrorClass : inputNormalClass
							}`}
						/>
						{formErrors.firstName && (
							<p className="text-red-600 text-sm mt-1">
								{formErrors.firstName}
							</p>
						)}
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
							className={`${inputBaseClass} ${
								formErrors.lastName ? inputErrorClass : inputNormalClass
							}`}
						/>
						{formErrors.lastName && (
							<p className="text-red-600 text-sm mt-1">{formErrors.lastName}</p>
						)}
					</div>
				</div>
				<div>
					<label
						htmlFor="email"
						className="block text-sm font-medium text-slate-700 mb-1"
					>
						Email
					</label>
					<input
						type="email"
						id="email"
						name="email"
						value={formData.email}
						onChange={handleChange}
						required
						className={`${inputBaseClass} ${
							formErrors.email ? inputErrorClass : inputNormalClass
						}`}
					/>
					{formErrors.email && (
						<p className="text-red-600 text-sm mt-1">{formErrors.email}</p>
					)}
				</div>
				<div>
					<label
						htmlFor="phone"
						className="block text-sm font-medium text-slate-700 mb-1"
					>
						Phone
					</label>
					<input
						type="tel"
						id="phone"
						name="phone"
						value={formData.phone}
						onChange={handleChange}
						required
						className={`${inputBaseClass} ${
							formErrors.phone ? inputErrorClass : inputNormalClass
						}`}
					/>
					{formErrors.phone && (
						<p className="text-red-600 text-sm mt-1">{formErrors.phone}</p>
					)}
				</div>
				<div className="flex items-center pt-1">
					<input
						type="checkbox"
						id="acceptTerms"
						name="acceptTerms"
						checked={formData.acceptTerms}
						onChange={handleChange}
						required
						className={`h-5 w-5 text-${primaryColor} focus:ring-${primaryRingColor} border-2 rounded ${
							formErrors.acceptTerms
								? `border-${errorColor}`
								: `border-${secondaryBorder}`
						}`}
					/>
					<label
						htmlFor="acceptTerms"
						className="ml-3 block text-sm text-slate-700"
					>
						I agree to the{" "}
						<a
							href="#"
							className={`underline text-${primaryColor} hover:text-${primaryHoverColor}`}
						>
							terms
						</a>
					</label>
				</div>
				{formErrors.acceptTerms && (
					<p className="text-red-600 text-sm ml-8 -mt-4">
						{formErrors.acceptTerms}
					</p>
				)}

				<div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
					<button
						type="submit"
						className={`flex-1 py-4 bg-${primaryColor} text-white rounded-lg shadow-sm hover:bg-${primaryHoverColor} transition-colors font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${primaryRingColor}`}
					>
						Create Account
					</button>
					<button
						type="button"
						onClick={handleSkip}
						className={`flex-1 py-4 bg-white text-${secondaryColor} border-2 border-${secondaryBorder} rounded-lg hover:bg-${secondaryHoverBg} transition-colors font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${secondaryRingColor}`}
					>
						Skip
					</button>
				</div>
			</motion.form>
		</motion.div>
	);

	const renderSuccessStep = () => (
		<motion.div
			key="success"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			className="text-center"
		>
			<motion.div variants={itemVariants}>
				<CheckCircleIcon
					className={`w-20 h-20 text-${successColor} mx-auto mb-6`}
				/>
				<h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3">
					You&apos;re All Set!
				</h2>
				<p className="text-lg md:text-xl text-slate-600 leading-relaxed">
					Welcome to Ajeen Rewards! <br />
					You&apos;ve earned{" "}
					<span className="font-semibold text-emerald-600">
						100 bonus points
					</span>
					.
				</p>
			</motion.div>
			<motion.p
				variants={itemVariants}
				transition={{ delay: 0.1 }}
				className="text-slate-500 text-base mt-8"
			>
				Continuing to next step...
			</motion.p>
		</motion.div>
	);

	return (
		// Added relative positioning for back button
		<div className="w-full h-screen bg-white flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 relative">
			{/* Use AnimatePresence for smooth step transitions */}
			<AnimatePresence mode="wait">
				{step === "intro" && renderIntroStep()}
				{step === "form" && renderFormStep()}
				{step === "success" && renderSuccessStep()}
			</AnimatePresence>
		</div>
	);
};

RewardsRegistrationView.propTypes = {
	onComplete: PropTypes.func,
};

export default RewardsRegistrationView;
