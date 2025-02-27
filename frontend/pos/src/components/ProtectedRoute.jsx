import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axiosInstance from "../api/config/axiosConfig";

const ProtectedRoute = () => {
	const [isAuthenticated, setIsAuthenticated] = useState(null);

	useEffect(() => {
		const checkAuth = async () => {
			try {
				await axiosInstance.get("auth/check-auth/");
				setIsAuthenticated(true);
			} catch {
				setIsAuthenticated(false);
			}
		};
		checkAuth();
	}, []);

	if (isAuthenticated === null)
		return (
			<div className="flex h-screen w-screen justify-center items-center bg-slate-50">
				<div className="flex flex-col items-center">
					<svg
						className="animate-spin h-10 w-10 text-blue-600 mb-4"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<p className="text-slate-700">Authenticating...</p>
				</div>
			</div>
		);

	return isAuthenticated ? (
		<Outlet />
	) : (
		<Navigate
			to="/login"
			replace
		/>
	);
};

export default ProtectedRoute;
