import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};

const NAV = [
  { label: "How it works", id: "how-it-works" },
  { label: "Inside the membership", id: "inside-the-membership" },
  { label: "Pricing", id: "pricing" },
  { label: "FAQ", id: "faq" },
];

const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border/60">
      <div className="container mx-auto px-4 min-h-14 py-2 flex items-center justify-between gap-3">
        <a href="/" className="font-heading font-bold text-base sm:text-lg text-foreground">
          The Diabetes Reset Method
        </a>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-3">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className="hidden lg:inline-flex items-center min-h-[44px] px-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </button>
          ))}
          <Link
            to="/login"
            className="inline-flex items-center min-h-[44px] px-2 text-sm font-semibold text-primary hover:text-primary-dark"
          >
            Member login
          </Link>
          <Button
            onClick={() => scrollTo("pricing")}
            className="min-h-[44px] bg-primary hover:bg-primary-dark text-primary-foreground font-semibold"
          >
            Start 14 days for $27
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;
