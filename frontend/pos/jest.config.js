// jest.config.js
module.exports = {
	testEnvironment: "jsdom",
	setupFilesAfterEnv: ["<rootDir>/src/tests/setupTests.js"],
	moduleNameMapper: {
		"\\.(css|less|scss|sass)$": "identity-obj-proxy",
	},
	testMatch: ["**/__tests__/**/*.js", "**/*.test.js"],
	transform: {
		"^.+\\.(js|jsx)$": "babel-jest",
	},
};
