// Section 19 — Learn accordion guides (default content; admin can override via content_items table type='guide').
export type LearnGuide = {
  slug: string;
  title: string;
  body: string;
  unlockDay?: number;
};

export const DEFAULT_LEARN_GUIDES: LearnGuide[] = [
  {
    slug: "plate-method",
    title: "The Plate Method Guide",
    body: "Fill half your plate with non-starchy vegetables, one quarter with protein, and one quarter with a complex carbohydrate. Add a small portion of healthy fat. The plate method is the simplest visual tool for stabilizing blood sugar at every meal — no counting required.",
  },
  {
    slug: "intermittent-fasting",
    title: "Intermittent Fasting Guide",
    body: "Intermittent fasting compresses your eating window to give insulin levels time to fall. Start with 12:12, then move toward 14:10. Always with your doctor's clearance if you take diabetes medication. Hydration, electrolytes, and a gentle ramp matter more than the exact schedule.",
    unlockDay: 21,
  },
  {
    slug: "supplement-guide",
    title: "Supplement Guide",
    body: "The Nature Made Diabetes Health Pack is the foundation from Day 1. Joint and neuropathy support unlock at Month 2. Apple Cider Vinegar and Ceylon Cinnamon become food-grade additions on Day 15. Open Supplements from the More menu for full details and dosage.",
  },
  {
    slug: "blood-sugar",
    title: "Blood Sugar Guide",
    body: "Fasting blood sugar under 100 mg/dL (5.6 mmol/L) is normal. 100–125 mg/dL (5.6–6.9 mmol/L) is pre-diabetic. 126 mg/dL (7.0 mmol/L) and above is diabetic. Post-meal targets are under 140 mg/dL (7.8 mmol/L) at two hours. Trends matter more than single readings.",
  },
  {
    slug: "snack-strategy",
    title: "Snack Strategy Guide",
    body: "Snacks bridge the gap between meals so your blood sugar never crashes into cravings. Pair protein with fiber: a boiled egg and cucumber, Greek yogurt and berries, almonds and an apple. Time snacks 2.5–3 hours after a meal, never within 90 minutes of one.",
  },
  {
    slug: "cheat-meal",
    title: "Cheat Meal Guide",
    body: "One planned cheat meal per week keeps the program psychologically sustainable. Eat it as the last meal of your day, then begin your overnight fast. Choose the meal you most miss — not a junk-food binge. Cheat meals do not derail biology. Daily compliance does the work.",
  },
  {
    slug: "measurement",
    title: "Measurement Guide",
    body: "Waist: at the navel, tape parallel to the floor, relaxed exhale. Hips: at the widest point. Chest: at the nipple line. Thigh: at the midpoint between hip and knee. Arm: at the midpoint between shoulder and elbow. Same time of day, same conditions, every month.",
  },
  {
    slug: "acv-cinnamon",
    title: "ACV and Cinnamon Guide",
    body: "Apple Cider Vinegar (1–2 tbsp in water, 15–30 minutes before meals) blunts the post-meal glucose spike. Use organic, with the mother. Ceylon Cinnamon (½–1 tsp daily) supports insulin sensitivity over weeks. Must be Ceylon — Cassia in high doses is hard on the liver.",
  },
];
