// src/components/rewards/RewardsAccessButton.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import {
	PhoneIcon,
	UserPlusIcon,
	XMarkIcon,
	GiftIcon,
} from "@heroicons/react/24/outline";
import { rewardsService } from "../../api/services/rewardsService";
import { toast } from "react-toastify";
import { formatPhoneNumber } from "../../utils/formatters";
import RewardsTierBadge from "./RewardsTierBadge";
import RewardsProfileModal from "./RewardsProfileModal";

const RewardsAccessButton = ({
	buttonClassName = "",
	onUserAuthenticated,
	onUserRemoved,
	onClose,
	rewardsProfile = null,
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("login");
	const [isLoading, setIsLoading] = useState(false);

	// Login form state
	const [loginForm, setLoginForm] = useState({
		phone: "",
	});

	// Registration form state
	const [registerForm, setRegisterForm] = useState({
		firstName: "",
		lastName: "",
		phone: "",
		email: "",
		acceptTerms: false,
	});

	const openModal = () => {
		// If user is already authenticated, open the profile modal instead
		if (rewardsProfile) {
			setIsProfileModalOpen(true);
		} else {
			setIsModalOpen(true);
		}
	};

	const closeModal = () => {
		setIsModalOpen(false);
		if (onClose) onClose();
	};

	const closeProfileModal = () => {
		setIsProfileModalOpen(false);
	};

	const isValidPhoneNumber = (phone) => {
		// Remove all non-digits
		const digits = phone.replace(/\D/g, "");
		// Check if it's a valid US phone number (10 digits)
		return digits.length === 10;
	};

	const handleRemoveProfile = () => {
		if (onUserRemoved) {
			onUserRemoved();
			toast.success("Rewards member removed from order");
		}
	};

	const handleLoginChange = (e) => {
		const { name, value } = e.target;
		if (name === "phone") {
			setLoginForm((prev) => ({
				...prev,
				[name]: formatPhoneNumber(value),
			}));
		} else {
			setLoginForm((prev) => ({
				...prev,
				[name]: value,
			}));
		}
	};

	const handleRegisterChange = (e) => {
		const { name, value, type, checked } = e.target;
		if (name === "phone") {
			setRegisterForm((prev) => ({
				...prev,
				[name]: formatPhoneNumber(value),
			}));
		} else {
			setRegisterForm((prev) => ({
				...prev,
				[name]: type === "checkbox" ? checked : value,
			}));
		}
	};

	const handleLoginSubmit = async (e) => {
		e.preventDefault();

		if (!isValidPhoneNumber(loginForm.phone)) {
			toast.error("Please enter a valid 10-digit phone number");
			return;
		}

		// Format phone number (remove non-digits)
		const formattedPhone = loginForm.phone.replace(/\D/g, "");

		try {
			setIsLoading(true);
			const response = await rewardsService.findProfileByPhone(formattedPhone);

			if (response) {
				toast.success("Rewards member found!");

				// Call the callback with the user profile
				if (onUserAuthenticated) {
					onUserAuthenticated(response);
				}

				closeModal();
			}
		} catch (error) {
			console.error("Error finding rewards member:", error);
			toast.error("No rewards member found with this phone number");
		} finally {
			setIsLoading(false);
		}
	};

	const handleRegisterSubmit = async (e) => {
		e.preventDefault();

		// Validate form
		if (
			!registerForm.firstName ||
			!registerForm.lastName ||
			!registerForm.phone
		) {
			toast.error("Please fill in all required fields");
			return;
		}

		if (!isValidPhoneNumber(registerForm.phone)) {
			toast.error("Please enter a valid 10-digit phone number");
			return;
		}

		if (!registerForm.acceptTerms) {
			toast.error("Please accept the terms and conditions");
			return;
		}

		// Format phone number
		const formattedPhone = registerForm.phone.replace(/\D/g, "");

		try {
			setIsLoading(true);

			const newMember = {
				first_name: registerForm.firstName,
				last_name: registerForm.lastName,
				phone: formattedPhone,
				email: registerForm.email || null,
			};

			const response = await rewardsService.registerRewardsMember(newMember);

			if (response) {
				toast.success("New rewards member registered successfully!");

				// Call the callback with the new user profile
				if (onUserAuthenticated) {
					onUserAuthenticated(response);
				}

				closeModal();
			}
		} catch (error) {
			console.error("Error registering rewards member:", error);

			if (error.response?.status === 409) {
				toast.error("A member with this phone number already exists");
			} else {
				toast.error("Failed to register rewards member");
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			{/* Button to open the modal */}
			{rewardsProfile ? (
				<RewardsTierBadge
					tier={rewardsProfile.tier}
					onClick={openModal}
					className={buttonClassName}
				/>
			) : (
				<button
					onClick={openModal}
					className={
						buttonClassName ||
						"px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors flex items-center gap-1"
					}
					title="Rewards Program"
				>
					<GiftIcon className="h-5 w-5" />
				</button>
			)}

			{/* Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 bg-white/85 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
						{/* Loading Overlay */}
						{isLoading && (
							<div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
							</div>
						)}

						{/* Modal Header */}
						<div className="flex justify-between items-center p-6 border-b">
							<h2 className="text-xl font-semibold text-gray-800">
								Rewards Program
							</h2>
							<button
								onClick={closeModal}
								className="text-gray-400 hover:text-gray-500"
							>
								<XMarkIcon className="h-6 w-6" />
							</button>
						</div>

						{/* Tabs */}
						<div className="flex border-b">
							<button
								className={`flex-1 py-3 font-medium text-center ${
									activeTab === "login"
										? "text-blue-600 border-b-2 border-blue-600"
										: "text-gray-500 hover:text-gray-700"
								}`}
								onClick={() => setActiveTab("login")}
							>
								<div className="flex items-center justify-center gap-2">
									<PhoneIcon className="h-5 w-5" />
									<span>Find Member</span>
								</div>
							</button>
							<button
								className={`flex-1 py-3 font-medium text-center ${
									activeTab === "register"
										? "text-blue-600 border-b-2 border-blue-600"
										: "text-gray-500 hover:text-gray-700"
								}`}
								onClick={() => setActiveTab("register")}
							>
								<div className="flex items-center justify-center gap-2">
									<UserPlusIcon className="h-5 w-5" />
									<span>New Member</span>
								</div>
							</button>
						</div>

						{/* Login Tab */}
						{activeTab === "login" && (
							<form
								onSubmit={handleLoginSubmit}
								className="p-6 space-y-4"
							>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Phone Number
									</label>
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<PhoneIcon className="h-5 w-5 text-gray-400" />
										</div>
										<input
											type="tel"
											name="phone"
											value={loginForm.phone}
											onChange={handleLoginChange}
											placeholder="(555) 123-4567"
											className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
											required
										/>
									</div>
									<p className="mt-1 text-xs text-gray-500">
										Enter the customer&apos;s phone number to find their rewards
										account
									</p>
								</div>

								<div className="pt-4">
									<button
										type="submit"
										disabled={isLoading}
										className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
									>
										{isLoading ? "Searching..." : "Find Member"}
									</button>
								</div>
							</form>
						)}

						{/* Register Tab */}
						{activeTab === "register" && (
							<form
								onSubmit={handleRegisterSubmit}
								className="p-6 space-y-4"
							>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											First Name *
										</label>
										<input
											type="text"
											name="firstName"
											value={registerForm.firstName}
											onChange={handleRegisterChange}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
											required
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Last Name *
										</label>
										<input
											type="text"
											name="lastName"
											value={registerForm.lastName}
											onChange={handleRegisterChange}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
											required
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Phone Number *
									</label>
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<PhoneIcon className="h-5 w-5 text-gray-400" />
										</div>
										<input
											type="tel"
											name="phone"
											value={registerForm.phone}
											onChange={handleRegisterChange}
											placeholder="(555) 123-4567"
											className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
											required
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Email (Optional)
									</label>
									<input
										type="email"
										name="email"
										value={registerForm.email}
										onChange={handleRegisterChange}
										placeholder="customer@example.com"
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>

								<div className="flex items-start">
									<input
										type="checkbox"
										name="acceptTerms"
										checked={registerForm.acceptTerms}
										onChange={handleRegisterChange}
										className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
										required
									/>
									<label className="ml-2 block text-sm text-gray-700">
										I agree to the{" "}
										<a
											href="#"
											className="text-blue-600 hover:underline"
										>
											Terms and Conditions
										</a>{" "}
										and{" "}
										<a
											href="#"
											className="text-blue-600 hover:underline"
										>
											Privacy Policy
										</a>
									</label>
								</div>

								<div className="pt-4">
									<button
										type="submit"
										disabled={isLoading}
										className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 flex items-center justify-center gap-2"
									>
										{isLoading ? (
											"Registering..."
										) : (
											<>
												<UserPlusIcon className="h-5 w-5" />
												<span>Register New Member</span>
											</>
										)}
									</button>
								</div>
							</form>
						)}
					</div>
				</div>
			)}
			{isProfileModalOpen && rewardsProfile && (
				<RewardsProfileModal
					profile={rewardsProfile}
					onClose={closeProfileModal}
					onRemoveProfile={handleRemoveProfile}
				/>
			)}
		</>
	);
};

// Add PropTypes validation
RewardsAccessButton.propTypes = {
	buttonText: PropTypes.string,
	buttonClassName: PropTypes.string,
	onUserAuthenticated: PropTypes.func,
	onUserRemoved: PropTypes.func,
	onClose: PropTypes.func,
	rewardsProfile: PropTypes.shape({
		tier: PropTypes.string.isRequired,
		// Add other required properties of the rewardsProfile object
		first_name: PropTypes.string,
		last_name: PropTypes.string,
		phone: PropTypes.string,
		email: PropTypes.string,
		points: PropTypes.number,
		// Add any other properties that might be in the profile
	}),
};

export default RewardsAccessButton;
