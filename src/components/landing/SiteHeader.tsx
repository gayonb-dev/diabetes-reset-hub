import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/" className="font-heading font-bold text-base sm:text-lg text-foreground">
          The Diabetes Reset Method
        </a>
        <nav className="flex items-center gap-2 sm:gap-4">
          <a
            href="#pricing"
            className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground"
          >
            FAQ
          </a>
          <Link
            to="/login"
            className="text-sm font-semibold text-primary hover:text-primary-dark"
          >
            Member login
          </Link>
          <Button
            onClick={scrollToPricing}
            size="sm"
            className="bg-primary hover:bg-primary-dark text-primary-foreground font-semibold"
          >
            Start for $27
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;
