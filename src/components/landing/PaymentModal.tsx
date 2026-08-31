import { useState, useEffect, useRef, forwardRef } from "react";
import { X, Check, Loader2, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Prompt 4 §7.2 — checkout minimization.
 * Collects only the name and email needed to create the account and payment.
 * No phone, no health context, no bundled marketing consent.
 */
const PaymentModal = forwardRef<HTMLDivElement, PaymentModalProps>(
  ({ isOpen, onClose }, ref) => {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [errors, setErrors] = useState<{ fullName?: string; email?: string; general?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const validateForm = () => {
      const newErrors: { fullName?: string; email?: string } = {};
      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim();

      if (!trimmedName) newErrors.fullName = "Enter your full name";
      else if (trimmedName.length < 2) newErrors.fullName = "Name must be at least 2 characters";
      else if (trimmedName.length > 100) newErrors.fullName = "Name must be less than 100 characters";

      if (!trimmedEmail) newErrors.email = "Enter your email address";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
        newErrors.email = "Enter a valid email address";
      else if (trimmedEmail.length > 255)
        newErrors.email = "Email must be less than 255 characters";

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});
      if (!validateForm()) return;
      setIsSubmitting(true);

      try {
        const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
          body: {
            customerName: fullName.trim(),
            customerEmail: email.trim().toLowerCase(),
          },
        });

        if (error) {
          console.error("Checkout function error:", error);
          setErrors({ general: "Unable to process your request. Please try again." });
          return;
        }
        if (data?.error) {
          setErrors({ general: data.error });
          return;
        }
        if (data?.url) {
          window.open(data.url, "_blank");
          setIsSuccess(true);
        } else {
          setErrors({ general: "Unable to create checkout session. Please try again." });
        }
      } catch (err) {
        console.error("Error creating checkout session:", err);
        setErrors({ general: "Something went wrong. Please try again." });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleCloseRef = useRef<() => void>(() => {});

    const handleClose = () => {
      setErrors({});
      setFullName("");
      setEmail("");
      setIsSuccess(false);
      onClose();
    };

    // Escape closes the modal and the first field receives focus on open, so
    // the checkout is fully operable from the keyboard.
    const nameRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (!isOpen) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isSubmitting) handleCloseRef.current();
      };
      document.addEventListener("keydown", onKey);
      const t = window.setTimeout(() => nameRef.current?.focus(), 0);
      return () => {
        document.removeEventListener("keydown", onKey);
        window.clearTimeout(t);
      };
    }, [isOpen, isSubmitting]);

    handleCloseRef.current = handleClose;

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="bg-background rounded-xl shadow-2xl max-w-md w-full p-6 relative my-8">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg"
            type="button"
            aria-label="Close checkout"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {isSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-primary-foreground" aria-hidden="true" />
              </div>
              <h2 className="font-heading font-bold text-2xl text-foreground mb-2">
                Continue in the Stripe tab
              </h2>
              <p className="text-muted-foreground">
                A new tab opened with the secure Stripe checkout page. Your membership starts once
                Stripe confirms the payment.
              </p>
            </div>
          ) : (
            <>
              <h2
                id="checkout-modal-title"
                className="font-heading font-bold text-2xl text-center text-foreground mb-4 pr-8"
              >
                Start 14 days for $27
              </h2>

              <div className="rounded-lg border border-border bg-muted/40 p-4 mb-5 text-sm">
                <p className="text-foreground font-medium">
                  $27 today, then $67/month after 14 days until canceled.
                </p>
                <p className="text-muted-foreground mt-1">
                  Cancel inside the app at any time. Access continues through the period you already
                  paid for.
                </p>
                <p className="mt-2">
                  <Link to="/refunds" className="text-primary underline underline-offset-4">
                    Refund Terms
                  </Link>
                  {" · "}
                  <Link to="/terms" className="text-primary underline underline-offset-4">
                    Terms
                  </Link>
                </p>
              </div>

              {errors.general && (
                <div
                  role="alert"
                  className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4"
                >
                  <p className="text-sm text-destructive text-center">{errors.general}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-name">Full name</Label>
                  <Input
                    id="checkout-name"
                    ref={nameRef}
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                    }}
                    aria-invalid={!!errors.fullName}
                    aria-describedby={errors.fullName ? "checkout-name-error" : undefined}
                    className="w-full min-h-[44px] rounded-lg"
                    autoComplete="name"
                  />
                  {errors.fullName && (
                    <p id="checkout-name-error" className="text-xs text-destructive">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="checkout-email">Email address</Label>
                  <Input
                    id="checkout-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                    }}
                    aria-invalid={!!errors.email}
                    aria-describedby="checkout-email-hint checkout-email-error"
                    className="w-full min-h-[44px] rounded-lg"
                    autoComplete="email"
                  />
                  <p id="checkout-email-hint" className="text-xs text-muted-foreground">
                    Your account sign-in is connected to this email.
                  </p>
                  {errors.email && (
                    <p id="checkout-email-error" className="text-xs text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] bg-primary hover:bg-primary-dark text-primary-foreground py-4 font-bold rounded-lg h-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Processing…
                    </>
                  ) : (
                    "Continue to secure checkout"
                  )}
                </Button>
              </form>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" aria-hidden="true" />
                <span>Secure payment processing by Stripe</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  },
);

PaymentModal.displayName = "PaymentModal";

export default PaymentModal;
