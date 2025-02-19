// src/api/config/websocketConfig.js

const getWebSocketURL = () => {
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	const host = import.meta.env.DEV ? "localhost:8001" : window.location.host;
	return `${protocol}//${host}/ws/hardware/`;
};

class WebSocketManager {
	constructor() {
		this.url = getWebSocketURL();
		this.socket = null;
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 5;
		this.reconnectInterval = 1000;
		this.listeners = new Map();
		this.isConnecting = false;

		console.log("WebSocket Manager initialized with URL:", this.url);
	}

	connect() {
		if (this.isConnecting || this.socket?.readyState === WebSocket.OPEN) {
			return;
		}

		this.isConnecting = true;
		console.log("Attempting WebSocket connection to:", this.url);

		try {
			this.socket = new WebSocket(this.url);

			this.socket.onopen = () => {
				console.log("WebSocket connected successfully");
				this.reconnectAttempts = 0;
				this.isConnecting = false;
				this.emit("connection", { status: "connected" });
			};

			this.socket.onclose = (event) => {
				console.log("WebSocket closed with code:", event.code);
				this.isConnecting = false;
				this.handleReconnect();
				this.emit("connection", {
					status: "disconnected",
					code: event.code,
					reason: event.reason,
				});
			};

			this.socket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					this.emit("message", data);
				} catch (error) {
					console.error("Error parsing WebSocket message:", error);
					this.emit("error", {
						type: "parseError",
						message: "Failed to parse WebSocket message",
						error: error,
					});
				}
			};

			this.socket.onerror = (error) => {
				console.error("WebSocket error:", error);
				this.isConnecting = false;
				this.emit("error", {
					type: "error",
					message: "WebSocket connection error",
					error: error,
				});
			};
		} catch (error) {
			console.error("Error creating WebSocket:", error);
			this.isConnecting = false;
			this.handleReconnect();
		}
	}

	handleReconnect() {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			const delay = this.reconnectInterval * this.reconnectAttempts;
			console.log(
				`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
			);
			setTimeout(() => this.connect(), delay);
		} else {
			console.log("Max reconnection attempts reached");
		}
	}

	send(data) {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(data));
			return true;
		}
		console.warn("Cannot send message: WebSocket is not connected");
		return false;
	}

	on(event, callback) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event).add(callback);
	}

	off(event, callback) {
		if (this.listeners.has(event)) {
			this.listeners.get(event).delete(callback);
		}
	}

	emit(event, data) {
		if (this.listeners.has(event)) {
			this.listeners.get(event).forEach((callback) => callback(data));
		}
	}

	disconnect() {
		if (this.socket) {
			this.socket.close();
			this.socket = null;
		}
		this.listeners.clear();
		this.isConnecting = false;
		console.log("WebSocket disconnected manually");
	}
}

// Create and export a singleton instance
const wsManager = new WebSocketManager();
export default wsManager;
