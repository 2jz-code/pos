import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import POS from "./pages/POS";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import AddProduct from "./pages/AddProduct";

function App() {
	return (
		<Router>
			<div className="w-full h-screen flex flex-col">
				<div className="flex-grow">
					<Routes>
						<Route
							path="/login"
							element={<Login />}
						/>
						<Route
							path="/dashboard"
							element={
								<ProtectedRoute>
									<Dashboard />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/pos"
							element={<POS />}
						/>
						<Route
							path="/products"
							element={<Products />}
						/>
						<Route
							path="/products/add"
							element={<AddProduct />}
						/>
						<Route
							path="/products/:id"
							element={<ProductDetail />}
						/>
					</Routes>
				</div>
			</div>
		</Router>
	);
}

export default App;
