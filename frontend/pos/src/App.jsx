import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useEffect, useRef } from "react";
import customerDisplayManager from "./features/customerDisplay/utils/windowManager";
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
import { WebSocketProvider } from "./contexts/WebSocketContext";
import KitchenDisplay from "./pages/kitchen/KitchenDisplay";
import CustomerDisplayApp from "./features/customerDisplay/components/CustomerDisplay";
import { CustomerDisplayProvider } from "./features/customerDisplay/contexts/CustomerDisplayProvider";

function App() {
	const displayInitialized = useRef(false);

	// Check if we're in customer display mode
	const isCustomerDisplay =
		new URLSearchParams(window.location.search).get("mode") ===
		"customer-display";

	useEffect(() => {
		// Only initialize the customer display if this is the main window (not customer display mode)
		// and it hasn't been initialized yet
		if (!isCustomerDisplay && !displayInitialized.current) {
			displayInitialized.current = true;
			customerDisplayManager.openWindow();
		}
	}, [isCustomerDisplay]);

	// If we're in customer display mode, render the customer display app
	if (isCustomerDisplay) {
		return <CustomerDisplayApp />;
	}

	// Otherwise render the main POS application
	return (
		<WebSocketProvider>
			<CustomerDisplayProvider>
				<Router>
					<div className="w-full h-screen flex flex-col">
						<div className="flex-grow">
							<Routes>
								{/* Public Route (Login) */}
								<Route
									path="/login"
									element={<Login />}
								/>

								{/* Protected routes */}
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
										path="/kitchen"
										element={<KitchenDisplay />}
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
			</CustomerDisplayProvider>
		</WebSocketProvider>
	);
}

export default App;
