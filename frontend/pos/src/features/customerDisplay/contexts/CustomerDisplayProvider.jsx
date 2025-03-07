// features/customerDisplay/contexts/CustomerDisplayProvider.jsx

import { useCallback } from "react";
import PropTypes from "prop-types";
import CustomerDisplayContext from "./CustomerDisplayContext";
import customerDisplayManager from "../utils/windowManager";

export const CustomerDisplayProvider = ({ children }) => {
	const openCustomerDisplay = useCallback(() => {
		return customerDisplayManager.openWindow();
	}, []);

	const closeCustomerDisplay = useCallback(() => {
		customerDisplayManager.closeWindow();
	}, []);

	const updateCustomerDisplay = useCallback((content) => {
		customerDisplayManager.updateContent(content);
	}, []);

	return (
		<CustomerDisplayContext.Provider
			value={{
				openCustomerDisplay,
				closeCustomerDisplay,
				updateCustomerDisplay,
			}}
		>
			{children}
		</CustomerDisplayContext.Provider>
	);
};

CustomerDisplayProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export default CustomerDisplayProvider;
