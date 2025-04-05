// src/features/payment/components/TerminalStatusIndicator.jsx
import { motion } from "framer-motion";
import { DeviceTabletIcon } from "@heroicons/react/24/solid";
import { useTerminal } from "../hooks/useTerminal";

const TerminalStatusIndicator = () => {
	// Use the terminal context instead of local state
	const { status, deviceInfo, lastChecked, isChecking, checkStatus } =
		useTerminal();

	// Get status configuration based on current state
	const getStatusConfig = () => {
		const configs = {
			online: {
				color: "bg-emerald-500",
				pulseColor: "bg-emerald-400",
				shadowColor: "shadow-emerald-200",
				label: "Ready",
				icon: <DeviceTabletIcon className="h-3.5 w-3.5 text-emerald-600" />,
			},
			offline: {
				color: "bg-red-500",
				pulseColor: "bg-red-400",
				shadowColor: "shadow-red-200",
				label: "Offline",
				icon: <DeviceTabletIcon className="h-3.5 w-3.5 text-red-600" />,
			},
			not_found: {
				color: "bg-amber-500",
				pulseColor: "bg-amber-400",
				shadowColor: "shadow-amber-200",
				label: "Not Found",
				icon: <DeviceTabletIcon className="h-3.5 w-3.5 text-amber-600" />,
			},
			network_error: {
				color: "bg-blue-500",
				pulseColor: "bg-blue-400",
				shadowColor: "shadow-blue-200",
				label: "Connection Error",
				icon: <DeviceTabletIcon className="h-3.5 w-3.5 text-blue-600" />,
			},
			unauthorized: {
				color: "bg-purple-500",
				pulseColor: "bg-purple-400",
				shadowColor: "shadow-purple-200",
				label: "Auth Error",
				icon: <DeviceTabletIcon className="h-3.5 w-3.5 text-purple-600" />,
			},
			error: {
				color: "bg-red-500",
				pulseColor: "bg-red-400",
				shadowColor: "shadow-red-200",
				label: "Error",
				icon: <DeviceTabletIcon className="h-3.5 w-3.5 text-red-600" />,
			},
			unknown: {
				color: "bg-slate-400",
				pulseColor: "bg-slate-300",
				shadowColor: "shadow-slate-200",
				label: "Checking...",
				icon: <DeviceTabletIcon className="h-3.5 w-3.5 text-slate-600" />,
			},
		};

		return configs[status] || configs.unknown;
	};

	const statusConfig = getStatusConfig();
	const formattedTime = lastChecked
		? new Intl.DateTimeFormat("en-US", {
				hour: "2-digit",
				minute: "2-digit",
		  }).format(lastChecked)
		: "";

	return (
		<motion.div
			className="flex items-center px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mx-4 mb-2"
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<div className="relative flex items-center justify-center mr-2">
				<div className={`${statusConfig.color} h-2.5 w-2.5 rounded-full`}></div>
				{status === "online" && (
					<motion.div
						className={`absolute inset-0 ${statusConfig.pulseColor} rounded-full`}
						animate={{
							scale: [1, 1.5, 1],
							opacity: [0.8, 0, 0.8],
						}}
						transition={{
							duration: 2,
							repeat: Infinity,
							repeatType: "loop",
						}}
					/>
				)}
			</div>

			<div className="flex items-center">
				<div className={`mr-2 p-1 rounded-md ${statusConfig.shadowColor}`}>
					{statusConfig.icon}
				</div>

				<div className="flex flex-col">
					<span className="text-xs font-medium text-slate-700">
						Terminal: {statusConfig.label}
					</span>

					{deviceInfo && status === "online" && (
						<span className="text-xs text-slate-500 leading-tight">
							{deviceInfo.label}
						</span>
					)}
				</div>
			</div>

			{lastChecked && (
				<div className="ml-2 pl-2 border-l border-slate-200">
					<button
						onClick={checkStatus}
						disabled={isChecking}
						className="text-xs text-slate-500 hover:text-slate-700 flex items-center"
					>
						<span className="mr-1">{formattedTime}</span>
						{isChecking ? (
							<motion.div
								className="h-2 w-2 bg-blue-500 rounded-full"
								animate={{ scale: [1, 0.8, 1] }}
								transition={{ duration: 1, repeat: Infinity }}
							/>
						) : (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-3 w-3"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
						)}
					</button>
				</div>
			)}
		</motion.div>
	);
};

export default TerminalStatusIndicator;
