// src/api/hooks/useApi.js
import { useState, useCallback } from "react";
import { toast } from "react-toastify";

export const useApi = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const execute = useCallback(
		async (
			apiFunc,
			{ onSuccess, onError, successMessage, errorMessage } = {}
		) => {
			setIsLoading(true);
			setError(null);

			try {
				const response = await apiFunc();

				if (successMessage) {
					toast.success(successMessage);
				}

				if (onSuccess) {
					onSuccess(response.data);
				}

				return response.data;
			} catch (err) {
				const message =
					errorMessage || err.response?.data?.message || "An error occurred";

				setError(message);
				toast.error(message);

				if (onError) {
					onError(err);
				}

				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[]
	);

	return {
		isLoading,
		error,
		execute,
	};
};
