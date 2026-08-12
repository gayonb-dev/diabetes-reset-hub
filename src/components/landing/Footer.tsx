import { Link } from "react-router-dom";

const LEGAL_LINKS = [
  { label: "Privacy Notice", to: "/privacy" },
  { label: "Consumer Health Data Privacy", to: "/health-data-privacy" },
  { label: "AI Use", to: "/ai-use" },
  { label: "Terms", to: "/terms" },
  { label: "Refund Terms", to: "/refunds" },
  { label: "Data rights", to: "/data-rights" },
  { label: "Member login", to: "/login" },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-heading font-bold text-2xl mb-2">The Diabetes Reset Method</h2>
          <p className="text-background/70">
            Self-guided education for adults managing Type 2 diabetes or prediabetes.
          </p>
        </div>

        <nav aria-label="Footer" className="border-t border-background/20 pt-8">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
            {LEGAL_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="inline-flex items-center min-h-[44px] text-background/80 hover:text-background underline underline-offset-4"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="mailto:info@diabetesresetmethod.com"
                className="inline-flex items-center min-h-[44px] text-background/80 hover:text-background underline underline-offset-4"
              >
                Contact
              </a>
            </li>
          </ul>
        </nav>

        <p className="text-background/70 text-sm text-center mt-6 max-w-2xl mx-auto">
          DRM is a self-guided educational membership. It does not diagnose, treat, prescribe, or
          replace care from a qualified healthcare professional. Contact emergency services for
          urgent symptoms.
        </p>

        <p className="text-background/50 text-sm text-center mt-4">
          © {currentYear} The Diabetes Reset Method. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
