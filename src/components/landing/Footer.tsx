import { Shield } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="font-heading font-bold text-2xl mb-2">
            The Diabetes Reset Method
          </h3>
          <p className="text-gray-400">
            Your path to reversing diabetes and reclaiming your life.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-6">
          <Shield className="h-4 w-4" />
          <span>30-day money-back guarantee on all programs</span>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <p className="text-gray-400 text-sm text-center mb-4">
            Educational coaching only. We do not diagnose, treat, cure, or prevent any disease.
            Always consult your healthcare provider before making changes to your diet, exercise, or medication.
          </p>
          <p className="text-gray-500 text-sm text-center">
            © {currentYear} The Diabetes Reset Method. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
