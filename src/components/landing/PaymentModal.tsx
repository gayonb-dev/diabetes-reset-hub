import { useState, forwardRef } from "react";
import { X, Check, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentModal = forwardRef<HTMLDivElement, PaymentModalProps>(
  ({ isOpen, onClose }, ref) => {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [errors, setErrors] = useState<{ fullName?: string; email?: string; phone?: string; general?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const validateForm = () => {
      const newErrors: { fullName?: string; email?: string; phone?: string } = {};
      
      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim();
      
      if (!trimmedName) {
        newErrors.fullName = "Full name is required";
      } else if (trimmedName.length < 2) {
        newErrors.fullName = "Name must be at least 2 characters";
      } else if (trimmedName.length > 100) {
        newErrors.fullName = "Name must be less than 100 characters";
      }
      
      if (!trimmedEmail) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        newErrors.email = "Please enter a valid email address";
      } else if (trimmedEmail.length > 255) {
        newErrors.email = "Email must be less than 255 characters";
      }

      if (phone && phone.trim().length > 20) {
        newErrors.phone = "Phone number must be less than 20 characters";
      }
      
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
            customerPhone: phone.trim() || undefined,
          },
        });

        if (error) {
          console.error("Supabase function error:", error);
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
          setTimeout(() => {
            onClose();
            setIsSuccess(false);
            setFullName("");
            setEmail("");
            setPhone("");
          }, 3000);
        } else {
          setErrors({ general: "Unable to create checkout session. Please try again." });
        }
      } catch (error) {
        console.error("Error creating checkout session:", error);
        setErrors({ general: "Something went wrong. Please try again." });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleClose = () => {
      setErrors({});
      setFullName("");
      setEmail("");
      setPhone("");
      onClose();
    };

    if (!isOpen) return null;

    return (
      <div ref={ref} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>

          {isSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-bold text-2xl text-gray-900 mb-2">
                Redirecting to Checkout!
              </h3>
              <p className="text-gray-600">
                A new tab has opened with your secure checkout page.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1">The Diabetes Reset Method</p>
              <h3 className="font-heading font-bold text-2xl text-center text-gray-900 mb-2">
                Start Your Membership
              </h3>
              <p className="text-center text-gray-600 mb-1">
                $27 today · 14-day full access · then $67/mo
              </p>
              <p className="text-center text-xs text-gray-500 mb-6">
                Cancel anytime in the trial — keep your $27 Reset program.
              </p>

              {errors.general && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-destructive text-center">{errors.general}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }));
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      errors.fullName ? "border-destructive" : "border-gray-200 focus:border-primary"
                    }`}
                    autoComplete="name"
                  />
                  {errors.fullName && (
                    <p className="text-xs text-destructive mt-1">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      errors.email ? "border-destructive" : "border-gray-200 focus:border-primary"
                    }`}
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Input
                    type="tel"
                    placeholder="Phone Number (optional)"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      errors.phone ? "border-destructive" : "border-gray-200 focus:border-primary"
                    }`}
                    autoComplete="tel"
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive mt-1">{errors.phone}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary-dark text-primary-foreground py-4 font-bold rounded-lg transition-all h-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue to Secure Checkout — $27"
                  )}
                </Button>
              </form>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
                <Lock className="h-3 w-3" />
                <span>256-bit SSL encrypted • 30-day guarantee</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

PaymentModal.displayName = "PaymentModal";

export default PaymentModal;
