import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axiosInstance from "../api/config/axiosConfig";

const ProtectedRoute = () => {
	const [isAuthenticated, setIsAuthenticated] = useState(null);

	useEffect(() => {
		const checkAuth = async () => {
			try {
				await axiosInstance.get("auth/check-auth/"); // Protected API route
				setIsAuthenticated(true);
			} catch {
				setIsAuthenticated(false);
			}
		};
		checkAuth();
	}, []);

	if (isAuthenticated === null) return <p>Loading...</p>;
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
