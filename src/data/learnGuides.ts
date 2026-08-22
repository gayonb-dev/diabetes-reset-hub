// Section 19 — Learn accordion guides (default content; admin can override via content_items table type='guide').
//
// Guides removed in the S2/S3 clinical remediation phase (also deactivated in the
// database by migration, not left as locked copies):
//   intermittent-fasting, fasting-and-meal-timing, cheat-meal, supplement-guide, acv-cinnamon
export type LearnLink = {
  label: string;
  url: string;
};

export type LearnGuide = {
  slug: string;
  title: string;
  body: string;
  unlockDay?: number;
  /** Optional category label, e.g. "Safety". */
  category?: string;
  /** Optional source card rendered below the body. */
  sourceCard?: {
    title: string;
    body: string;
    links: LearnLink[];
  };
  /** Optional in-app call to action. `to` is a react-router path. */
  cta?: { label: string; to: string };
};

/** Slugs deactivated in this phase — never re-added to the default list. */
export const DEACTIVATED_GUIDE_SLUGS = [
  "intermittent-fasting",
  "fasting-and-meal-timing",
  "cheat-meal",
  "supplement-guide",
  "acv-cinnamon",
] as const;

export const DEFAULT_LEARN_GUIDES: LearnGuide[] = [
  {
    slug: "plate-method",
    title: "The Plate Method Guide",
    body: "Fill half your plate with non-starchy vegetables, one quarter with protein, and one quarter with a complex carbohydrate. Add a small portion of healthy fat. The plate method is a general educational framework, not a personal prescription.",
  },
  {
    slug: "fasting-and-diabetes-read-this-first",
    title: "Fasting and diabetes: read this first",
    category: "Safety",
    body: [
      "Fasting is not required to use DRM. You can build useful routines with meals, movement, tracking, and visit preparation without fasting.",
      "",
      "Fasting schedules and timers are not available right now. We are keeping those tools off while the safety screening and instructions are reviewed. The app cannot decide whether fasting is safe for you.",
      "",
      "Open the fasting page for the full safety explanation, what to do if your glucose is low, and the tools you can use instead.",
    ].join("\n"),
    cta: { label: "Open the fasting page", to: "/app/fasting" },
  },
  {
    slug: "supplements-and-diabetes-safety",
    title: "Supplements and diabetes: questions to ask first",
    category: "Safety",
    body: [
      "You do not need supplements to use DRM.",
      "",
      "Research has tested many supplements for Type 2 diabetes. For most supplements, there is not enough reliable evidence to show that they help manage diabetes or its complications. A result from one product or study may not apply to a different brand, formula, or dose.",
      "",
      "Supplements can cause side effects. Some can interact with diabetes medicines, affect lab tests, or create extra risk for people with kidney disease or another health condition. “Natural” does not always mean safe.",
      "",
      "Never use a supplement instead of prescribed diabetes care, and never stop or change medicine because of a supplement claim.",
      "",
      "Questions to take to a prescriber or pharmacist",
      "",
      "• What am I hoping this supplement will help with?",
      "• Is there good evidence for this exact ingredient and product?",
      "• Could it interact with my medicines or affect my blood sugar?",
      "• Does my kidney, liver, pregnancy, or surgery history change the risk?",
      "• What side effects should make me stop and seek advice?",
      "• How can I check the label and product quality?",
      "",
      "Bring a list or photos of every supplement and medicine you use. Include the product name, ingredients, dose, and how often you take it. A prescriber or pharmacist can review the complete list with you.",
      "",
      "DRM does not sell, prescribe, or require supplements.",
    ].join("\n"),
    sourceCard: {
      title: "Read the official guidance",
      body: "This DRM summary is based on guidance from the National Center for Complementary and Integrative Health and the U.S. Food and Drug Administration.",
      links: [
        {
          label: "NCCIH: Diabetes and Dietary Supplements",
          url: "https://www.nccih.nih.gov/health/diabetes-and-dietary-supplements-what-you-need-to-know",
        },
        {
          label: "FDA 101: Dietary Supplements",
          url: "https://www.fda.gov/consumers/consumer-updates/fda-101-dietary-supplements",
        },
      ],
    },
    cta: { label: "Return to Guides", to: "/app/learn" },
  },
  {
    slug: "everyday-foot-care",
    title: "Everyday foot care with diabetes",
    category: "Safety",
    body: [
      "Diabetes can make a foot problem harder to feel or slower to heal. A short daily check can help you notice a problem early.",
      "",
      "Check every day",
      "",
      "Look at the tops, bottoms, heels, and between the toes. Look for cuts, sores, blisters, red spots, swelling, warm areas, or changes in the nails. Use a mirror or ask someone you trust if part of your foot is hard to see.",
      "",
      "Wash and dry carefully",
      "",
      "Wash your feet with soap and warm—not hot—water. Do not soak your feet. Dry them well, especially between the toes.",
      "",
      "Protect your skin",
      "",
      "If the skin is dry, use a thin layer of lotion on the tops and bottoms of your feet. Do not put lotion between the toes. Do not cut corns or calluses or use medicated corn-removal products unless a foot-care professional tells you how.",
      "",
      "Wear shoes and socks",
      "",
      "Wear clean socks and shoes that fit well. Check inside your shoes for rough areas, pebbles, or other objects before putting them on.",
      "",
      "When to contact a healthcare professional",
      "",
      "Contact a healthcare professional promptly if you notice a cut, blister, or bruise that is not starting to heal after a few days; redness, warmth, swelling, or pain; loss of feeling; or another change that concerns you. Contact a healthcare professional right away for a black, foul-smelling, or rapidly worsening area.",
    ].join("\n"),
    sourceCard: {
      title: "Read the official guidance",
      body: "This DRM summary is based on the National Institute of Diabetes and Digestive and Kidney Diseases guide to diabetes and foot problems.",
      links: [
        {
          label: "NIDDK: Diabetes & Foot Problems",
          url: "https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/foot-problems",
        },
      ],
    },
    cta: { label: "Return to Guides", to: "/app/learn" },
  },
  {
    slug: "blood-sugar",
    title: "Blood Sugar Guide",
    body: "These are general laboratory reference points, not a diagnosis or personal target. A healthcare professional should interpret results in context. For many nonpregnant adults, targets are individualized; use the target your healthcare team gave you.",
  },
  {
    slug: "snack-strategy",
    title: "Snack Strategy Guide",
    body: "Snacks are optional. If a snack fits your care plan, choose a time and food that work with your hunger, medicines, activity and daily schedule. Options some members like include a boiled egg and cucumber, yogurt and berries, or almonds and an apple.",
  },
  {
    slug: "measurement",
    title: "Measurement Guide",
    body: "Waist: at the navel, tape parallel to the floor, relaxed exhale. Hips: at the widest point. Chest: at the nipple line. Thigh: at the midpoint between hip and knee. Arm: at the midpoint between shoulder and elbow. Same time of day, same conditions, every month.",
  },
];
