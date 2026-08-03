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
    body: "See the full guide below — 'Fasting and meal timing' covers why timing matters, why we start at twelve hours, when a snack helps, and the medication warning. Your own window and schedule live on the Fasting tab.",
    unlockDay: 21,
  },
  {
    slug: "fasting-and-meal-timing",
    title: "Fasting and Meal Timing",
    unlockDay: 21,
    body: [
      "1. WHY WHEN YOU EAT AFFECTS BLOOD SUGAR",
      "Every time you eat, your blood sugar rises and your body releases insulin to bring it back down. If you eat often, insulin is working almost all day and never really gets a break. Longer stretches without food give insulin time to fall. Lower insulin makes it easier for your body to use stored fat and easier for your cells to respond to insulin again. So it is not only what is on your plate. It is also the clock.",
      "",
      "2. WHY EARLIER EATING WINDOWS SUIT TYPE 2 DIABETES BETTER",
      "Your body handles food better in the morning and early afternoon than late at night. The same meal eaten at 7pm raises blood sugar more than it would at noon for most people. Late eating also overlaps with sleep, and blood sugar tends to run higher the next morning. That is why we ask you to finish your last meal at least three hours before bed, and why we nudge the start of your eating window earlier when we can. If an earlier window does not fit your life, keep the one you can actually stick to. A schedule you keep beats a perfect one you do not.",
      "",
      "3. WHY WE START AT TWELVE HOURS INSTEAD OF SIXTEEN",
      "A longer fast is not automatically a better fast. Benefit shows up across a wide range of windows, and the bigger risk with a long fast is that you abandon it or that your blood sugar drops too low. So everyone starts at twelve hours for the first week, no matter which target they pick. It is a safety buffer, not a test. If a medication was missed during screening, a gentle first week catches the problem before a sixteen-hour fast would. From week two, your chosen window begins. If your screening said you need a doctor's input first, your ramp is slower on purpose: twelve hours for two weeks, then fourteen for two weeks, then your target.",
      "",
      "4. WHEN A SNACK HELPS AND WHEN IT DOES NOT",
      "A snack has one job: to bridge a long gap so your blood sugar does not crash into cravings. Snacks work best 3–4 hours after a main meal, and are mainly for bridging gaps longer than 5 hours. If your meals are already spaced four or five hours apart, a snack is not doing that job, and eating one just adds another insulin response to your day. The app works this out for you: on days when your meals are close together, no snack rows appear. If you are genuinely hungry, eat something with protein and fiber. Hunger is information, not failure.",
      "",
      "5. THE MEDICATION WARNING, AND WHY A DOCTOR MUST BE INVOLVED",
      "Some diabetes medications lower blood sugar on a schedule, whether or not you have eaten. Insulin does this. So do sulfonylureas — glipizide, glyburide, glimepiride, gliclazide — and repaglinide and nateglinide. If you fast while one of those is still working, your blood sugar can fall dangerously low. That is not a reason you can never fast. It is a reason your doctor has to adjust your doses first. Know the signs of low blood sugar: shakiness, sweating, confusion, a racing heart, or sudden intense hunger. If you feel them, stop fasting and eat something, then tell your doctor. This app will never suggest, calculate, or display a dose change. Never adjust a dose yourself.",
      "",
      "6. WHAT THE RESEARCH SHOWS",
      "Research on time-restricted eating in type 2 diabetes is promising and growing — studies show improvements in fasting glucose, A1C, and time in range. It is not yet a formal recommendation in the American Diabetes Association's Standards of Care, which is why we treat it as optional and start gently.",
      "Most of the studies so far are small and short. The strongest and most consistent finding is not that a longer fast is better, but that a regular eating pattern with an earlier window helps. Sources by name: the American Diabetes Association Standards of Care; the National Institute of Diabetes and Digestive and Kidney Diseases; and published trials of time-restricted eating from research groups at the Salk Institute and the University of Alabama at Birmingham. We name sources rather than cite titles so you can look them up yourself and see what they actually say.",
    ].join("\n"),
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
    body: "Snacks bridge the gap between meals so your blood sugar never crashes into cravings. Pair protein with fiber: a boiled egg and cucumber, Greek yogurt and berries, almonds and an apple. Snacks work best 3–4 hours after a main meal, and are mainly for bridging gaps longer than 5 hours.",
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
