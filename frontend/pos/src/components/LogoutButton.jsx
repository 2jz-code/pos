import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/api";

const LogoutButton = () => {
	const navigate = useNavigate();

	const handleLogout = async () => {
		try {
			await axiosInstance.post("/auth/logout/");
			navigate("/login");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	return (
		<button
			onClick={handleLogout}
			className="bg-red-600 text-white px-4 py-2 rounded"
		>
			Logout
		</button>
	);
};

export default LogoutButton;
