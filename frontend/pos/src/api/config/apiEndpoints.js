// src/api/config/apiEndpoints.js
export const ENDPOINTS = {
	// Auth endpoints
	AUTH: {
		CHECK_STATUS: "auth/check-auth/",
		LOGIN: "auth/login/",
		LOGOUT: "auth/logout/",
		REFRESH_TOKEN: "auth/token/refresh/",
		USERS: "auth/users/",
		USER_DETAIL: (id) => `auth/users/${id}/`,
		USER_UPDATE: (id) => `auth/users/${id}/update/`,
		USER_DELETE: (id) => `auth/users/${id}/delete/`,
		REGISTER: "auth/register/",
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

	// Settings endpoints
	SETTINGS: {
		SECURITY: "settings/security/",
		TERMINAL: {
			LOCATIONS: "settings/terminal/locations/",
			LOCATION_DETAIL: (id) => `settings/terminal/locations/${id}/`,
			LOCATIONS_SYNC: "settings/terminal/locations/sync/",
			READERS: "settings/terminal/readers/",
			READERS_SYNC: "settings/terminal/readers/sync/",
		},
	},

	// Payment Terminal endpoints
	PAYMENT_TERMINAL: {
		CONNECTION_TOKEN: "payments/terminal/connection-token/",
		READER_STATUS: "payments/terminal/reader-status/",
		CREATE_PAYMENT_INTENT: "payments/terminal/create-payment-intent/",
		CAPTURE_PAYMENT: "payments/terminal/capture-payment/",
		PRESENT_PAYMENT_METHOD: "payments/terminal/present-payment-method/",
		PROCESS_PAYMENT_METHOD: "payments/terminal/process-payment-method/",
		CHECK_PAYMENT_COMPLETION: (id) =>
			`payments/terminal/check-payment-completion/${id}/`,
	},
};
