import { Shield } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="font-heading font-bold text-2xl mb-2">
            The Diabetes Reset Method
          </h3>
          <p className="text-background/60">
            Your path to reversing diabetes and reclaiming your life.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-background/60 text-sm mb-6">
          <Shield className="h-4 w-4" />
          <span>30-day money-back guarantee on all programs</span>
        </div>

        <div className="border-t border-background/20 pt-8">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm mb-4">
            <a href="/llm-info" className="text-background/70 hover:text-background underline underline-offset-4">
              LLM Info
            </a>
            <span className="text-background/30">·</span>
            <a href="/llms.txt" className="text-background/70 hover:text-background underline underline-offset-4">
              llms.txt
            </a>
            <span className="text-background/30">·</span>
            <a href="mailto:Info@diabetesresetmethod.com" className="text-background/70 hover:text-background underline underline-offset-4">
              Contact
            </a>
          </div>
          <p className="text-background/60 text-sm text-center mb-4">
            Educational coaching only. We do not diagnose, treat, cure, or prevent any disease.
            Always consult your healthcare provider before making changes to your diet, exercise, or medication.
          </p>
          <p className="text-background/40 text-sm text-center">
            © {currentYear} The Diabetes Reset Method. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
