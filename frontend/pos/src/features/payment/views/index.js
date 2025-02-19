// src/features/payment/views/index.js
import CashPaymentView from "./CashPaymentView";
import CreditPaymentView from "./CreditPaymentView";
import InitialOptionsView from "./InitialOptionsView";
import SplitPaymentView from "./SplitPaymentView";
import CompletionView from "./CompletionView";

export const PaymentViews = {
  InitialOptions: InitialOptionsView,
  Cash: CashPaymentView,
  Credit: CreditPaymentView,
  Split: SplitPaymentView,
  Completion: CompletionView  // Make sure this matches exactly
};