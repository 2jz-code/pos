// src/api/config/wsEndpoints.js
export const WS_EVENTS = {
	CONNECTION: "connection",
	DRAWER_STATE: "drawer_state",
	PAYMENT_STATUS: "payment_status",
	CASH_DRAWER: "cash_drawer", // Add this
	ERROR: "error",
	MESSAGE: "message",
};

export const WS_ACTIONS = {
	PROCESS_PAYMENT: "process_payment",
	SUBSCRIBE_DRAWER_STATE: "subscribe_drawer_state",
	OPEN_DRAWER: "open_drawer", // Add these
	CLOSE_DRAWER: "close_drawer", // cash drawer actions
};
