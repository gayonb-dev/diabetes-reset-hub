import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProgramStatus from "./tools/get-program-status";
import getTodayAction from "./tools/get-today-action";
import listBloodSugar from "./tools/list-blood-sugar";
import logBloodSugar from "./tools/log-blood-sugar";
import logHealth from "./tools/log-health";
import listRecentHealth from "./tools/list-recent-health";
import completeDay from "./tools/complete-day";

// Build issuer from the project ref so it is a compile-time literal (no runtime
// env read at import time, see app-mcp-server-authoring). The fallback keeps
// the entry evaluable during manifest extraction.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "diabetes-reset-method",
  title: "The Diabetes Reset Method",
  version: "0.1.0",
  instructions:
    "Tools for signed-in members of The Diabetes Reset Method. Read the member's current program day and streaks, view or log blood sugar readings and daily health entries (weight, energy, notes), fetch today's daily action, and mark program days complete. All calls act as the signed-in user under the app's RLS. This is educational, not medical advice.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProgramStatus,
    getTodayAction,
    listBloodSugar,
    logBloodSugar,
    logHealth,
    listRecentHealth,
    completeDay,
  ],
});
