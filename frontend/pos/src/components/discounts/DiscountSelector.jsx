// src/components/discounts/DiscountSelector.jsx
import { useState, useEffect } from "react";
import { discountService } from "../../api/services/discountService";
import { XMarkIcon, TagIcon } from "@heroicons/react/24/outline";
import PropTypes from "prop-types";
import { toast } from "react-toastify";

const DiscountSelector = ({ isOpen, onClose, onSelectDiscount }) => {
	const [discounts, setDiscounts] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [filter, setFilter] = useState("all");

	useEffect(() => {
		if (isOpen) {
			fetchDiscounts();
		}
	}, [isOpen]);

	const fetchDiscounts = async () => {
		setIsLoading(true);
		try {
			const response = await discountService.getDiscounts();

			// Process discounts to mark expired ones
			const now = new Date();
			const processedDiscounts = Array.isArray(response)
				? response.map((discount) => {
						// Create a copy to avoid mutating the original data
						const processedDiscount = { ...discount };

						// Check if it's an expired promotional discount
						if (
							processedDiscount.discount_category === "promotional" &&
							processedDiscount.end_date &&
							new Date(processedDiscount.end_date) < now
						) {
							// Mark as inactive
							processedDiscount.is_active = false;
							processedDiscount.isExpired = true; // Add flag for UI purposes
						}

						return processedDiscount;
				  })
				: [];

			setDiscounts(processedDiscounts);
		} catch (error) {
			console.error("Error fetching discounts:", error);
			toast.error("Failed to load discounts");
		} finally {
			setIsLoading(false);
		}
	};

	const handleApplyDiscount = (discount) => {
		onSelectDiscount(discount);
		onClose();
		toast.success(`Applied discount: ${discount.name}`);
	};

	const filteredDiscounts = discounts.filter((discount) => {
		// First filter: only show active discounts
		if (!discount.is_active) return false;

		// Then apply any additional filters
		if (filter === "permanent" && discount.discount_category !== "permanent")
			return false;
		if (
			filter === "promotional" &&
			discount.discount_category !== "promotional"
		)
			return false;

		// Finally, apply search term filter if present
		if (searchTerm) {
			const term = searchTerm.toLowerCase();
			return (
				discount.name.toLowerCase().includes(term) ||
				(discount.code && discount.code.toLowerCase().includes(term)) ||
				(discount.description &&
					discount.description.toLowerCase().includes(term))
			);
		}

		// If all filters pass, show the discount
		return true;
	});

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-slate-800/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
				{/* Header */}
				<div className="flex justify-between items-center p-4 border-b">
					<h2 className="text-xl font-semibold text-slate-800 flex items-center">
						<TagIcon className="h-5 w-5 text-orange-500 mr-2" />
						Apply Discount
					</h2>
					<button
						onClick={onClose}
						className="text-slate-500 hover:text-slate-700"
					>
						<XMarkIcon className="h-6 w-6" />
					</button>
				</div>

				{/* Search and Filters */}
				<div className="p-4 border-b">
					<input
						type="text"
						placeholder="Search discounts..."
						className="w-full px-3 py-2 border border-slate-300 rounded-md mb-3"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
					<div className="flex flex-wrap gap-2">
						<button
							className={`px-3 py-1.5 text-sm rounded-md ${
								filter === "all"
									? "bg-orange-100 text-orange-700"
									: "bg-slate-100 text-slate-700"
							}`}
							onClick={() => setFilter("all")}
						>
							All Active
						</button>
						<button
							className={`px-3 py-1.5 text-sm rounded-md ${
								filter === "permanent"
									? "bg-orange-100 text-orange-700"
									: "bg-slate-100 text-slate-700"
							}`}
							onClick={() => setFilter("permanent")}
						>
							Permanent
						</button>
						<button
							className={`px-3 py-1.5 text-sm rounded-md ${
								filter === "promotional"
									? "bg-orange-100 text-orange-700"
									: "bg-slate-100 text-slate-700"
							}`}
							onClick={() => setFilter("promotional")}
						>
							Promotional
						</button>
					</div>
				</div>

				{/* Discount List */}
				<div className="flex-1 overflow-y-auto p-2">
					{isLoading ? (
						<div className="flex justify-center items-center h-32">
							<div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
						</div>
					) : filteredDiscounts.length === 0 ? (
						<div className="text-center py-8 text-slate-500">
							No discounts found
						</div>
					) : (
						<div className="space-y-2">
							{filteredDiscounts.map((discount) => (
								<div
									key={discount.id}
									className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow"
								>
									<div className="flex justify-between">
										<div>
											<h3 className="font-medium text-slate-800">
												{discount.name}
											</h3>
											{discount.code && (
												<div className="inline-block bg-slate-100 px-2 py-0.5 text-xs font-mono rounded mt-1">
													{discount.code}
												</div>
											)}
											<p className="text-xs text-slate-500 mt-1 line-clamp-2">
												{discount.description || "No description"}
											</p>
										</div>
										<div className="text-right">
											<div className="text-lg font-semibold text-orange-600">
												{discount.discount_type === "percentage"
													? `${discount.value}%`
													: `$${discount.value}`}
											</div>
											<button
												onClick={() => handleApplyDiscount(discount)}
												className="mt-2 px-3 py-1 bg-orange-50 text-orange-600 text-sm rounded-md hover:bg-orange-100 transition-colors"
											>
												Apply
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

DiscountSelector.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSelectDiscount: PropTypes.func.isRequired,
	orderId: PropTypes.number,
};

export default DiscountSelector;
