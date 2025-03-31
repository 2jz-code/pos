// src/pages/rewards/VerifyRedemption.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { rewardsService } from "../../api/services/rewardsService";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function VerifyRedemption() {
	const navigate = useNavigate();
	const { execute, isLoading } = useApi();

	const [redemptionCode, setRedemptionCode] = useState("");
	const [verificationResult, setVerificationResult] = useState(null);

	const handleVerify = async (e) => {
		e.preventDefault();

		if (!redemptionCode.trim()) {
			toast.error("Please enter a redemption code");
			return;
		}

		try {
			const result = await execute(
				() => rewardsService.verifyRedemptionCode(redemptionCode.trim()),
				{ errorMessage: "Invalid or expired redemption code" }
			);

			setVerificationResult(result);
			toast.success("Redemption code verified successfully");
		} catch (error) {
			console.error("Error verifying redemption code:", error);
			setVerificationResult(null);
		}
	};

	const handleMarkAsUsed = async () => {
		if (!verificationResult) return;

		try {
			await execute(
				() => rewardsService.verifyRedemptionCode(redemptionCode.trim()), // This will mark it as used
				{ successMessage: "Reward marked as used successfully" }
			);

			// Update the verification result to show it's been used
			setVerificationResult({
				...verificationResult,
				redemption: {
					...verificationResult.redemption,
					is_used: true,
					used_at: new Date().toISOString(),
				},
			});
		} catch (error) {
			console.error("Error marking redemption as used:", error);
		}
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-slate-800">
					Verify Reward Redemption
				</h1>
				<button
					className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
					onClick={() => navigate("/rewards")}
				>
					<ArrowLeftIcon className="h-5 w-5" />
					Back to Rewards
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
				{/* Verification Form */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold mb-4">Enter Redemption Code</h2>
					<form
						onSubmit={handleVerify}
						className="space-y-4"
					>
						<div>
							<label
								htmlFor="redemptionCode"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Redemption Code
							</label>
							<input
								type="text"
								id="redemptionCode"
								value={redemptionCode}
								onChange={(e) => setRedemptionCode(e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
								placeholder="Enter code"
								required
							/>
						</div>

						<button
							type="submit"
							disabled={isLoading || !redemptionCode.trim()}
							className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
						>
							{isLoading ? "Verifying..." : "Verify Code"}
						</button>
					</form>
				</div>

				{/* Result Display */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold mb-4">Verification Result</h2>

					{verificationResult ? (
						<div className="space-y-4">
							<div className="bg-green-50 border border-green-200 rounded-md p-4">
								<div className="flex items-center">
									<svg
										className="h-5 w-5 text-green-500 mr-2"
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
									<span className="text-green-700 font-medium">
										Valid Redemption
									</span>
								</div>
							</div>

							<div className="border rounded-md p-4 space-y-3">
								<div>
									<h3 className="text-sm font-medium text-gray-500">Reward</h3>
									<p className="text-gray-900">
										{verificationResult.reward.name}
									</p>
								</div>

								<div>
									<h3 className="text-sm font-medium text-gray-500">
										Description
									</h3>
									<p className="text-gray-900">
										{verificationResult.reward.description}
									</p>
								</div>

								<div>
									<h3 className="text-sm font-medium text-gray-500">
										Points Used
									</h3>
									<p className="text-gray-900">
										{verificationResult.redemption.points_used}
									</p>
								</div>

								<div>
									<h3 className="text-sm font-medium text-gray-500">
										Redemption Date
									</h3>
									<p className="text-gray-900">
										{new Date(
											verificationResult.redemption.redeemed_at
										).toLocaleString()}
									</p>
								</div>

								<div>
									<h3 className="text-sm font-medium text-gray-500">Status</h3>
									<span
										className={`px-2 py-1 rounded-full text-xs font-medium ${
											verificationResult.redemption.is_used
												? "bg-gray-100 text-gray-800"
												: "bg-green-100 text-green-800"
										}`}
									>
										{verificationResult.redemption.is_used
											? "USED"
											: "READY TO USE"}
									</span>
								</div>

								{verificationResult.redemption.is_used && (
									<div>
										<h3 className="text-sm font-medium text-gray-500">
											Used At
										</h3>
										<p className="text-gray-900">
											{new Date(
												verificationResult.redemption.used_at
											).toLocaleString()}
										</p>
									</div>
								)}
							</div>

							{!verificationResult.redemption.is_used && (
								<button
									onClick={handleMarkAsUsed}
									className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
								>
									Mark as Used
								</button>
							)}
						</div>
					) : (
						<div className="text-center py-8 text-gray-500">
							<p>Enter a redemption code to verify its validity and details.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
