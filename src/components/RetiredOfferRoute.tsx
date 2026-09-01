import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";

/**
 * Prompt 4 closeout, retired offer routes ($497 6-week program, booking).
 *
 * Client-side replacement only (Lovable hosting has no server 301/308 support).
 * No retired offer content renders; the stub is noindex with a canonical to the
 * live membership offer.
 */
const RetiredOfferRoute = ({ to = "/#pricing" }: { to?: string }) => (
  <>
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href="https://diabetesresetmethod.com/" />
    </Helmet>
    <Navigate to={to} replace />
  </>
);

export default RetiredOfferRoute;
