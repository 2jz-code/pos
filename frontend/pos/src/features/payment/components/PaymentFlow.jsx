import { AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { PaymentHeader } from "./PaymentHeader";
import { PaymentSummary } from "./PaymentSummary";
import { PaymentStatus } from "./PaymentStatus";
import { usePaymentFlow } from "../hooks/usePaymentFlow";
import { usePaymentValidation } from "../hooks/usePaymentValidation";
import { calculatePaymentTotals } from "../utils/paymentCalculations";
import { PaymentViews } from "../views";

export const PaymentFlow = ({ totalAmount, onBack, onComplete }) => {
	const {
		state,
		setState,
		error,
		isProcessing,
		handleNavigation,
		handleBack,
		processPayment,
	} = usePaymentFlow({ totalAmount, onComplete });

	const handleBackNavigation = () => {
		const handled = handleBack();
		if (!handled) {
			onBack(); // Only call parent's onBack if we're at the root
		}
	};
	const { subtotal, taxAmount, payableAmount, remainingAmount } =
		calculatePaymentTotals(totalAmount, state.amountPaid);

	const validation = usePaymentValidation(state, totalAmount);

	const CurrentView =
		PaymentViews[state.currentView] || PaymentViews.InitialOptions;

	return (
		<div className="w-full h-full flex flex-col bg-white">
			<PaymentHeader onBack={handleBackNavigation} />

			<div className="flex-1 relative overflow-hidden p-4">
				<PaymentStatus
					error={error}
					isProcessing={isProcessing}
				/>

				<AnimatePresence
					initial={false}
					custom={state.direction}
					mode="wait"
				>
					<CurrentView
						state={state}
						setState={setState}
						remainingAmount={remainingAmount}
						handleNavigation={handleNavigation}
						handlePayment={processPayment} // Add this line
						processPayment={processPayment}
						validation={validation}
					/>
				</AnimatePresence>
			</div>

			<PaymentSummary
				totalAmount={subtotal} // Pass the calculated subtotal
				taxAmount={taxAmount}
				payableAmount={payableAmount}
				amountPaid={state.amountPaid}
			/>
		</div>
	);
};

PaymentFlow.propTypes = {
	totalAmount: PropTypes.number.isRequired,
	onBack: PropTypes.func.isRequired,
	onComplete: PropTypes.func.isRequired,
};

export default PaymentFlow;
