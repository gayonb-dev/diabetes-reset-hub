/**
 * Product tour previews.
 *
 * Every image is a screenshot of the real member application rendered locally
 * with synthetic fixture data (see tools/landing/capture_previews.py). No
 * capability is mocked into existence, no admin-only surface is shown as a
 * member surface, and no health trend is arranged to imply a promised result.
 *
 * Files live in /public/previews so they are served as plain static assets and
 * can be loaded at full resolution only when a preview is enlarged.
 */
export interface PreviewItem {
  id: string;
  label: string;
  /** Full-resolution capture, loaded on demand in the enlargement dialog. */
  src: string;
  /** Width-optimised version used in the gallery. */
  thumb: string;
  width: number;
  height: number;
  /** Descriptive alt text for people who cannot see the image. */
  alt: string;
  /** Visible caption explaining what the screen does. */
  caption: string;
}

/** Visible, honest description of what these images are. */
export const PREVIEW_DATA_NOTE =
  "These are genuine DRM product screens shown with fictional example entries.";

/** Second supporting line for the tour. */
export const PREVIEW_DATA_NOTE_2 =
  "Look through the tools before you pay so you know what the membership includes—and what it does not.";

/** Persistent label shown on every preview. */
export const PREVIEW_PERSISTENT_LABEL =
  "Example member view · Illustrative data, not a member's results";

export const PREVIEWS: PreviewItem[] = [
  {
    id: "today",
    label: "Today",
    src: "/previews/today.jpg",
    thumb: "/previews/today-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The Today screen showing one action for the day, a short mindset reflection, and habit logging for water, meals and movement.",
    caption:
      "See one guided daily action, the tools available today, and a clear place to start.",
  },
  {
    id: "meals",
    label: "Meals",
    src: "/previews/meals.jpg",
    thumb: "/previews/meals-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The Meals screen showing meal ideas for the day with recipes and a shopping list that can be grouped by meal.",
    caption:
      "Build a practical weekly meal plan, view recipes, and swap individual meals without rebuilding everything.",
  },
  {
    id: "meals-shopping",
    label: "Shopping List",
    src: "/previews/meals-shopping.jpg",
    thumb: "/previews/meals-shopping-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The shopping list generated from the week's meals, grouped by meal, with each ingredient listed as a check item.",
    caption:
      "Turn selected meals into a by-meal or by-category shopping list you can check as you shop.",
  },
  {
    id: "progress",
    label: "Progress",
    src: "/previews/progress.jpg",
    thumb: "/previews/progress-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The Progress screen showing entries a member has recorded, such as blood glucose readings, weight and measurements, with example values only.",
    caption:
      "Record the information you choose and view your entries and trends without the app diagnosing them.",
  },
  {
    id: "workouts",
    label: "Workouts",
    src: "/previews/workouts.jpg",
    thumb: "/previews/workouts-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The Workouts screen showing four short guided sessions, each listing its length and number of exercises.",
    caption:
      "Follow short guided movement sessions as they unlock from Day 29, with standard and knee-friendly options.",
  },
  {
    id: "learn",
    label: "Learn",
    src: "/previews/learn.jpg",
    thumb: "/previews/learn-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The Learn screen showing the library of written educational guides.",
    caption:
      "Read educational guides when you want additional context without being buried under another giant course.",
  },
  {
    id: "ask",
    label: "Ask & Community",
    src: "/previews/ask.jpg",
    thumb: "/previews/ask-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The Ask screen where a member can submit a question, alongside the optional community area.",
    caption:
      "Ask educational questions, read published answers, and participate in the member community if you choose.",
  },
  {
    id: "report",
    label: "Printable Report",
    src: "/previews/report.jpg",
    thumb: "/previews/report-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "A printable summary report of a member's own recorded entries, prepared for a healthcare visit.",
    caption:
      "Turn selected entries and questions into a printable summary for a healthcare conversation.",
  },
];
