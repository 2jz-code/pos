import CashPaymentView from "./CashPaymentView";
import CreditPaymentView from "./CreditPaymentView";
import InitialOptionsView from "./InitialOptionsView";
import SplitPaymentView from "./SplitPaymentView";

// Export as an object for backward compatibility
export const PaymentViews = {
	InitialOptions: InitialOptionsView,
	Cash: CashPaymentView,
	Credit: CreditPaymentView,
	Split: SplitPaymentView,
};
