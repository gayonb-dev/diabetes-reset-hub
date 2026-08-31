import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * One shared checkout-opening action for every public "Start 14 days for $27"
 * control (header, hero, product tour, pricing, final CTA, mobile sticky bar).
 *
 * The provider is optional on purpose: components such as SiteHeader are also
 * rendered outside the landing page. Without a provider `openCheckout()`
 * navigates to the pricing section of the landing page instead of crashing.
 */
interface CheckoutContextValue {
  isOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const openCheckout = useCallback(() => setIsOpen(true), []);
  const closeCheckout = useCallback(() => setIsOpen(false), []);
  const value = useMemo(
    () => ({ isOpen, openCheckout, closeCheckout }),
    [isOpen, openCheckout, closeCheckout],
  );
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
};

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (ctx) return ctx;
  return {
    isOpen: false,
    openCheckout: () => {
      // No provider (e.g. a legal page header): send the visitor to pricing.
      window.location.assign("/#pricing");
    },
    closeCheckout: () => {},
  };
}
