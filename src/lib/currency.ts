/** Centralized currency config — change here to update the whole site */
export const CURRENCY = {
  symbol: "ج.م",
  code: "EGP",
  label: "ج.م",
} as const;

/** Helper: returns the currency label regardless of language */
export const currencyLabel = () => CURRENCY.label;
