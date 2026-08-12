/**
 * Prompt 4 §2 — preview-only legal review gate.
 *
 * This banner is rendered ONLY in non-production builds. The release gate
 * (scripts/release-gate.mjs) fails the production build if this text or any
 * `[[...]]` legal placeholder can reach a production bundle.
 */
export const DRAFT_BANNER_TEXT =
  "Draft legal information — UK company registration and owner review must be completed before publication.";

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
