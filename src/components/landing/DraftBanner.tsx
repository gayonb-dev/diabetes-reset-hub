/**
 * Prompt 4 §2 — preview-only legal review gate.
 *
 * This banner is rendered ONLY in non-production builds. A release test
 * (src/test/legalGates.test.ts) fails the build if any `[[...]]` legal
 * placeholder or this banner text can reach a production bundle.
 */
const DRAFT_BANNER_TEXT = "DRAFT — OWNER AND COUNSEL REVIEW REQUIRED. DO NOT PUBLISH.";

export const isPreviewBuild = import.meta.env.MODE !== "production";

const DraftBanner = () => {
  if (!isPreviewBuild) return null;
  return (
    <div
      role="status"
      className="w-full bg-destructive text-destructive-foreground text-center text-xs sm:text-sm font-semibold px-4 py-2"
    >
      {DRAFT_BANNER_TEXT}
    </div>
  );
};

export default DraftBanner;
