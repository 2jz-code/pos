import { useNavigate } from "react-router-dom";

const Reports = () => {
	const navigate = useNavigate();
	return (
		<div className="w-screen h-screen flex flex-col bg-gray-100 text-black p-6">
			{/* Header Section */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-gray-800">Sales Reports</h1>
				<div className="flex items-center gap-4">
					<button
						className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
						onClick={() => navigate("/dashboard")}
					>
						Dashboard
					</button>
				</div>
			</div>
		</div>
	);
};

export default Reports;
