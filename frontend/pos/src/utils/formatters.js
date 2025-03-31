// src/utils/formatters.js
export const formatPhoneNumber = (value) => {
	if (!value) return value;

	// Remove all non-digits
	const phoneNumber = value.replace(/[^\d]/g, "");

	// Format as (XXX) XXX-XXXX
	if (phoneNumber.length < 4) return phoneNumber;
	if (phoneNumber.length < 7) {
		return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
	}
	return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
		3,
		6
	)}-${phoneNumber.slice(6, 10)}`;
};
