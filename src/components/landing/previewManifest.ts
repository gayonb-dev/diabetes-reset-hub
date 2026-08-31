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

export const PREVIEWS: PreviewItem[] = [
  {
    id: "today",
    label: "Today",
    src: "/previews/today.jpg",
    thumb: "/previews/today-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The Today screen showing one action for the day, a short mindset reflection, and habit logging for water, meals and movement.",
    caption: "Today: one action for the day, plus water, meal and movement logging.",
  },
  {
    id: "meals",
    label: "Meals",
    src: "/previews/meals.jpg",
    thumb: "/previews/meals-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The Meals screen showing meal ideas for the day with recipes and a shopping list that can be grouped by meal.",
    caption: "Meals: a weekly plan with recipes, swaps and a shopping list you can group by meal.",
  },
  {
    id: "progress",
    label: "Progress",
    src: "/previews/progress.jpg",
    thumb: "/previews/progress-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "The Progress screen showing entries a member has recorded, such as blood glucose readings, weight and measurements, with example values only.",
    caption: "Progress: your own entries for glucose, A1C, weight and measurements.",
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
    caption: "Learn: written educational guides. Educational only, not medical advice.",
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
      "Ask: submit a question and read published answers. Community participation is optional.",
  },
  {
    id: "report",
    label: "Printable report",
    src: "/previews/report.jpg",
    thumb: "/previews/report-thumb.jpg",
    width: 1280,
    height: 1400,
    alt: "A printable summary report of a member's own recorded entries, prepared for a healthcare visit.",
    caption: "Printable report: your own entries, laid out to take to a healthcare visit.",
  },
];
