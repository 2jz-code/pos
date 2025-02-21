import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import POS from "./pages/POS";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Products from "./pages/products/Products";
import ProductDetail from "./pages/products/ProductDetail";
import AddProduct from "./pages/products/AddProduct";
import EditProduct from "./pages/products/EditProduct";
import "./index.css";
import Orders from "./pages/orders/Orders";
import OrderDetails from "./pages/orders/OrderDetails";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Reports from "./pages/reports/Reports";
import { WebSocketProvider } from "./providers/WebSocketProvider";

function App() {
	return (
		<WebSocketProvider>
			<Router>
				<div className="w-full h-screen flex flex-col">
					<div className="flex-grow">
						<Routes>
							{/* Public Route (Login) */}
							<Route
								path="/login"
								element={<Login />}
							/>

							{/* ✅ Wrap all protected routes inside a single ProtectedRoute */}
							<Route element={<ProtectedRoute />}>
								<Route
									path="/dashboard"
									element={<Dashboard />}
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
									path="/products/:name"
									element={<ProductDetail />}
								/>
								<Route
									path="/products/edit/:name"
									element={<EditProduct />}
								/>
								<Route
									path="/orders"
									element={<Orders />}
								/>
								<Route
									path="/orders/:orderId"
									element={<OrderDetails />}
								/>
								<Route
									path="/reports"
									element={<Reports />}
								/>
							</Route>
						</Routes>
						<ToastContainer
							position="top-right"
							autoClose={3000}
							hideProgressBar={false}
							closeOnClick
							pauseOnHover
						/>
					</div>
				</div>
			</Router>
		</WebSocketProvider>
	);
}

export default App;
