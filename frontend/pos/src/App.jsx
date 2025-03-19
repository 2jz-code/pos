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
import { useCustomerDisplayNavigation } from "./features/customerDisplay/hooks/useCustomerDisplayNavigation";
import TerminalSimulation from "./features/customerDisplay/components/terminal/TerminalSimulation";
import { TerminalSimulationProvider } from "./features/customerDisplay/contexts/TerminalSimulationProvider";

window.customerDisplayManager = customerDisplayManager;

function App() {
	const displayInitialized = useRef(false);

	// Check if we're in customer display or terminal simulation mode
	const urlParams = new URLSearchParams(window.location.search);
	const mode = urlParams.get("mode");
	const isCustomerDisplay = mode === "customer-display";
	const isTerminalSimulation = mode === "terminal-simulation";

	useEffect(() => {
		// Only initialize the customer display if this is the main window (not a special mode)
		// and it hasn't been initialized yet
		if (
			!isCustomerDisplay &&
			!isTerminalSimulation &&
			!displayInitialized.current
		) {
			displayInitialized.current = true;
			customerDisplayManager.openWindow();
		}
	}, [isCustomerDisplay, isTerminalSimulation]);

	// If we're in terminal simulation mode, render the terminal component
	if (isTerminalSimulation) {
		return (
			<TerminalSimulation
				onPaymentResult={(result) => {
					// Send result back to main window
					if (window.opener) {
						window.opener.postMessage(
							{
								type: "PAYMENT_RESULT",
								content: result,
							},
							"*"
						);
					}
				}}
			/>
		);
	}

	// If we're in customer display mode, render the customer display app
	if (isCustomerDisplay) {
		return (
			<TerminalSimulationProvider>
				<CustomerDisplayApp />
			</TerminalSimulationProvider>
		);
	}

	// Otherwise render the main POS application
	return (
		<WebSocketProvider>
			<CustomerDisplayProvider>
				<TerminalSimulationProvider>
					<Router>
						<AppContent />
					</Router>
				</TerminalSimulationProvider>
			</CustomerDisplayProvider>
		</WebSocketProvider>
	);
}

// Separate component to use router hooks
function AppContent() {
	// Use our custom hook to manage customer display based on navigation
	useCustomerDisplayNavigation();

	return (
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
	);
}

export default App;
