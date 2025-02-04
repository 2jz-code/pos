import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/api";

const Login = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	const handleLogin = async (e) => {
		e.preventDefault();
		setError(null); // Reset errors before new request

		try {
			await axiosInstance.post("/auth/login/", { username, password });

			navigate("/dashboard"); // Redirect user to dashboard on success
		} catch (error) {
			setError("Invalid username or password");
		}
	};

	return (
		<div className="flex h-screen w-screen justify-center items-center bg-gray-100">
			<div className="bg-white p-8 rounded-lg shadow-lg w-96">
				<h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
				{error && <p className="text-red-500 text-center">{error}</p>}
				<form onSubmit={handleLogin}>
					<input
						type="text"
						placeholder="Username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						className="w-full px-4 py-2 border rounded-lg mb-2"
						required
					/>
					<input
						type="password"
						placeholder="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full px-4 py-2 border rounded-lg mb-4"
						required
					/>
					<button
						type="submit"
						className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
					>
						Login
					</button>
				</form>
			</div>
		</div>
	);
};

export default Login;
