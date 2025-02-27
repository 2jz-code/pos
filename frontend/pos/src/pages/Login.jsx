import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/config/axiosConfig";

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
			console.error("Error logging in:", error);
			setError("Invalid username or password");
		}
	};

	return (
		<div className="flex h-screen w-screen justify-center items-center bg-slate-50">
			<div className="bg-white p-8 rounded-xl shadow-lg w-96 border border-slate-100">
				<div className="text-center mb-6">
					<h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
					<p className="text-slate-500 text-sm mt-1">Login to your account</p>
				</div>

				{error && (
					<div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 flex items-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 mr-2"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clipRule="evenodd"
							/>
						</svg>
						{error}
					</div>
				)}

				<form
					onSubmit={handleLogin}
					className="space-y-4"
				>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">
							Username
						</label>
						<input
							type="text"
							placeholder="Enter your username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">
							Password
						</label>
						<input
							type="password"
							placeholder="Enter your password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							required
						/>
					</div>

					<button
						type="submit"
						className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium mt-2"
					>
						Sign In
					</button>
				</form>
			</div>
		</div>
	);
};

export default Login;
