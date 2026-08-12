import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { LAST_UPDATED_DISPLAY, PENDING_UK_REGISTRATION_NOTICE, LEGAL } from "@/config/legal";
import Footer from "@/components/landing/Footer";

/**
 * Shared layout for the public legal/trust pages (Prompt 4 §13).
 * All pages are reachable without authentication and are mobile readable.
 */
interface LegalPageProps {
  title: string;
  metaDescription: string;
  path: string;
  children: ReactNode;
}

/** Owner review, not counsel approval. Legal review is a future recommendation. */
export const LAST_UPDATED = LEGAL.owner_review_date;

const LegalPage = ({ title, metaDescription, path, children }: LegalPageProps) => {
  return (
    <div className="min-h-dvh bg-background">
      <Helmet>
        <title>{`${title} | Diabetes Reset Method`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://diabetesresetmethod.com${path}`} />
        <meta property="og:url" content={`https://diabetesresetmethod.com${path}`} />
        <meta property="og:title" content={`${title} | Diabetes Reset Method`} />
        <meta property="og:description" content={metaDescription} />
      </Helmet>

      <DraftBanner />

      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="font-heading font-bold text-base sm:text-lg text-foreground">
            The Diabetes Reset Method
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center min-h-[44px] text-sm font-semibold text-primary"
          >
            Member login
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <article className="max-w-3xl mx-auto min-w-0">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-2">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Owner review date: {LAST_UPDATED} — owner review required before publication.
          </p>
          <div className="space-y-5 text-muted-foreground leading-relaxed break-words [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-xl [&_h2]:text-foreground [&_h2]:pt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">
            {children}
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;
