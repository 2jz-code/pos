import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import axiosInstance from "../api/api";
import PropTypes from "prop-types";

const ProtectedRoute = ({ children }) => {
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
		children
	) : (
		<Navigate
			to="/login"
			replace
		/>
	);
};

// Add PropTypes validation
ProtectedRoute.propTypes = {
	children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
