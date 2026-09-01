import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Prompt 4 closeout, retired-route handling.
 *
 * Lovable hosting does not support server-side 301/308 redirects, so these are
 * client-side replacements (history.replace), NOT HTTP permanent redirects.
 * Nothing from the retired funnel renders before navigation; the stub is
 * noindex with a canonical pointing at the live offer.
 */
type Props = {
  /** Destination for signed-in members. */
  authedTo: string;
  /** Destination for anonymous visitors (usually /login?next=…). */
  anonTo: string;
  /** Canonical URL for the retired path. */
  canonical?: string;
};

const RetiredRoute = ({ authedTo, anonTo, canonical = "https://diabetesresetmethod.com/" }: Props) => {
  const { user, loading } = useAuth();

  const head = (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href={canonical} />
    </Helmet>
  );

  // Never flash retired content, and never bounce a signed-in member to /login
  // while auth is still resolving.
  if (loading) return head;

  return (
    <>
      {head}
      <Navigate to={user ? authedTo : anonTo} replace />
    </>
  );
};

export default RetiredRoute;
