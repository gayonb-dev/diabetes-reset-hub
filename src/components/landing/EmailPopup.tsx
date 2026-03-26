import { useState } from "react";
import { X, Mail, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface EmailPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const EmailPopup = ({ isOpen, onClose }: EmailPopupProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: { name?: string; email?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length > 100) {
      newErrors.name = "Name must be less than 100 characters";
    }
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    } else if (email.trim().length > 255) {
      newErrors.email = "Email must be less than 255 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("leads")
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          source: "free_meal_plan",
        });

      if (error) throw error;

      // Trigger email delivery (fire and forget)
      supabase.functions.invoke("send-meal-plan", {
        body: { name: name.trim(), email: email.trim().toLowerCase() },
      }).catch((err) => console.error("Email send error:", err));

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setName("");
        setEmail("");
      }, 2000);
    } catch (error) {
      console.error("Error submitting lead:", error);
      setErrors({ email: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="font-heading font-bold text-2xl text-gray-900 mb-2">
              Check Your Email!
            </h3>
            <p className="text-gray-600">
              Your free 2-day meal plan is on its way.
            </p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>

            <h3 className="font-heading font-bold text-2xl text-center text-gray-900 mb-2">
              Get Your Free Meal Plan
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Enter your details to receive the free 2-day diabetic-friendly meal plan.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    errors.name ? "border-destructive" : "border-gray-200 focus:border-primary"
                  }`}
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    errors.email ? "border-destructive" : "border-gray-200 focus:border-primary"
                  }`}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email}</p>
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
                    Sending...
                  </>
                ) : (
                  "Send Me The Free Meal Plan"
                )}
              </Button>
            </form>

            <p className="text-xs text-gray-500 text-center mt-4">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailPopup;
