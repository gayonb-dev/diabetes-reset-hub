// Phase B2.4 — Paid-member routing
// When an active paying member lands on a sales page, send them to their
// member area instead of asking them to buy again.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export function usePaidMemberRedirect(target: string = "/progress") {
  const { subscription, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (subscription && ACTIVE_STATUSES.has(subscription.status)) {
      navigate(target, { replace: true });
    }
  }, [loading, subscription, navigate, target]);
}
