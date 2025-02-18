// src/api/config/apiEndpoints.js
export const ENDPOINTS = {
	// Auth endpoints
	AUTH: {
		CHECK_STATUS: "auth/check-auth/",
		LOGIN: "auth/login/",
		LOGOUT: "auth/logout/",
		REFRESH_TOKEN: "auth/token/refresh/",
	},

	// Order endpoints
	ORDERS: {
		LIST: "orders/",
		DETAIL: (id) => `orders/${id}/`,
		START: "orders/start/",
		RESUME: (id) => `orders/${id}/resume/`,
		COMPLETE: (id) => `orders/${id}/complete/`,
		IN_PROGRESS: "orders/in_progress/",
		UPDATE_IN_PROGRESS: "orders/in_progress/update/",
	},

	// Hardware endpoints
	HARDWARE: {
		CASH_DRAWER: {
			OPEN: "hardware/cash-drawer/open/",
			CLOSE: "hardware/cash-drawer/state/",
			STATE: "hardware/cash-drawer/state/",
		},
		RECEIPT: {
			PRINT: "hardware/receipt/print/",
		},
		DEBUG: {
			SIMULATE_ERROR: "hardware/debug/simulate-error/",
			SIMULATE_DELAY: "hardware/debug/simulate-delay/",
		},
	},
};
