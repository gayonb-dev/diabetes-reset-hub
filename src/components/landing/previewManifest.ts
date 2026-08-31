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
  "Every screen below is the real member app captured locally with illustrative example entries for a fictional member — not a real member's data, and not a promised result.";

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
      "Today: one clear daily action, plus water, meal and movement logging. Come back when you are ready for the next step.",
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
      "Meals: a weekly plan with recipes and swaps, so you can build practical meal structure around your own preferences and save useful ideas.",
  },
  {
    id: "meals-shopping",
    label: "Shopping list",
    src: "/previews/meals-shopping.jpg",
    thumb: "/previews/meals-shopping-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The shopping list generated from the week's meals, grouped by meal, with each ingredient listed as a check item.",
    caption: "Shopping list: ingredients from your plan, grouped by meal or by category.",
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
      "Progress: record the information you choose — glucose, A1C, weight and measurements — and view your own trends. The app does not diagnose them.",
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
      "Workouts: short guided sessions you can follow at home. Workouts unlock at Day 29; this preview shows a member who has reached that point.",
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
      "Learn: written educational guides, including mindset reflections. Educational only, not medical advice.",
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
      "Ask: submit a question and read labeled educational answers with clear safety boundaries and guidance on when to contact a professional. Community participation is optional.",
  },
  {
    id: "report",
    label: "Printable report",
    src: "/previews/report.jpg",
    thumb: "/previews/report-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "A printable summary report of a member's own recorded entries, prepared for a healthcare visit.",
    caption:
      "Printable report: organize selected entries and questions into a report you can bring to a healthcare visit.",
  },
];
