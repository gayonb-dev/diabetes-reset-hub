import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Legacy /app/supplements route.
 *
 * DRM does not sell, prescribe, or require supplements. The former product pages
 * were removed in the S3 clinical remediation phase; this route now redirects to
 * the approved supplement-safety article.
 */
export default function Supplements() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/app/learn?guide=supplements-and-diabetes-safety", { replace: true });
  }, [navigate]);

  return (
    <div className="py-12 text-center">
      <p role="status" aria-live="polite" className="text-sm text-secondary-fg">
        Opening supplement safety guidance…
      </p>
    </div>
  );
}
