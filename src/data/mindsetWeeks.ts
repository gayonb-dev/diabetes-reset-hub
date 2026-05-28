// Section 15 — Mindset and Psychology Module. Full verbatim copy.
export type MindsetCard = {
  body: string;
  posture: "encouraging" | "celebrating" | "neutral";
};

export type MindsetWeek = {
  weekNumber: number;
  title: string;
  unlockDay: number;
  cards: MindsetCard[];
  assignment?: string;
};

export const MINDSET_WEEKS: MindsetWeek[] = [
  {
    weekNumber: 1,
    title: "Week 1 — Hope",
    unlockDay: 1,
    cards: [
      {
        posture: "encouraging",
        body: "You are not here because diabetes is your destiny. You are here because you made a decision that most people never make. That decision alone separates you from where you were.",
      },
      {
        posture: "encouraging",
        body: "Type 2 diabetes is not a life sentence. It is a metabolic condition — and metabolic conditions respond to metabolic interventions. Diet, movement, and time. That is the entire equation.",
      },
      {
        posture: "celebrating",
        body: "People have reversed this in 6 months. Not managed it — reversed it. Their A1C went from the diabetic range to the normal range. Their doctors reduced their medication. Some stopped entirely. You are on the same path.",
      },
    ],
    assignment:
      "Write one sentence describing what your life looks like when you have reversed this. Not if. When. Keep it somewhere you see it every day.",
  },
  {
    weekNumber: 2,
    title: "Week 2 — Agency",
    unlockDay: 8,
    cards: [
      {
        posture: "neutral",
        body: "The habits that contributed to your diagnosis were not character flaws. They were responses — to stress, to your environment, to what was available and what felt possible. Understanding that is not an excuse. It is the starting point.",
      },
      {
        posture: "encouraging",
        body: "You are not broken. You are not weak. You are someone who is now making better decisions with better information. That is all this is.",
      },
      {
        posture: "encouraging",
        body: "Blood sugar responds to food and movement within hours. Not weeks. Not months. Hours. Every compliant meal and every walk after eating is already working, even when you cannot feel it yet.",
      },
    ],
    assignment:
      "Identify the one habit that most contributed to where your health is today. Name it without judgment. Understanding it is where change starts. Judging it is where change stops.",
  },
  {
    weekNumber: 3,
    title: "Week 3 — Evidence",
    unlockDay: 15,
    cards: [
      {
        posture: "encouraging",
        body: "Your body is responding right now. The changes inside you — insulin sensitivity improving, inflammation reducing, blood sugar stabilizing — are ahead of any number on a screen. The numbers will catch up to your effort.",
      },
      {
        posture: "celebrating",
        body: "Small wins are not small. Every consecutive day of drinking your water is a metabolic win. Every compliant plate is a hormone response. Every post-meal walk is a glucose management event. These things compound.",
      },
      {
        posture: "neutral",
        body: "This week, pay attention to something other than the scale. Energy levels. Sleep quality. How you feel two hours after eating. Cravings getting quieter. These are your first signals.",
      },
    ],
    assignment:
      "Write down one thing that has changed — physically or mentally — since Day 1. It does not have to be dramatic. It just has to be real.",
  },
  {
    weekNumber: 4,
    title: "Week 4 — Identity",
    unlockDay: 22,
    cards: [
      {
        posture: "encouraging",
        body: "There is a version of you that does not have diabetes anymore. That version is not a fantasy. It is the person this program is building. You are not becoming something foreign — you are becoming who you were supposed to be before the condition took hold.",
      },
      {
        posture: "neutral",
        body: "Language matters. Start saying: 'I am reversing my diabetes.' Not 'I am trying.' Not 'I hope to.' Present tense. Active voice. Your brain does not know the difference between something you are doing and something you tell it you are doing — so tell it the true story.",
      },
      {
        posture: "encouraging",
        body: "Identity follows behavior. Every day you complete your habits, you cast a vote for the person you are becoming. Not one massive transformation — one daily vote.",
      },
    ],
    assignment:
      "Say this out loud today, once: 'I am someone who is reversing diabetes.' Notice how it feels. Uncomfortable is fine. Uncomfortable means it's new.",
  },
  {
    weekNumber: 5,
    title: "Week 5 — Resilience",
    unlockDay: 29,
    cards: [
      {
        posture: "neutral",
        body: "You are going to have a hard week. Maybe you already have. A family event, a stressful month, a week where compliance slipped. That is not failure. That is life.",
      },
      {
        posture: "encouraging",
        body: "The only way to fail this program is to quit after a setback. And that is entirely your choice. One bad week does not undo six good ones. Biology does not work that way.",
      },
      {
        posture: "encouraging",
        body: "What separates people who reverse diabetes from people who don't is not willpower. It is what they do the day after a hard week. That next day is the most important day in the program.",
      },
    ],
    assignment:
      "Think about the last time you quit something. What triggered it? What would have needed to happen differently for you to keep going? That answer is your resilience strategy.",
  },
  {
    weekNumber: 6,
    title: "Week 6 — Momentum",
    unlockDay: 36,
    cards: [
      {
        posture: "celebrating",
        body: "You have been at this for 6 weeks. Most people who start a health program are gone by now. You are not most people.",
      },
      {
        posture: "encouraging",
        body: "At this point the question is not whether you can do this. You have already proven you can. The question is whether you will keep choosing it — even on the days it doesn't feel like a choice.",
      },
      {
        posture: "encouraging",
        body: "Momentum is real. The longer you build it, the harder it becomes to stop — in the best possible way. You are past the hardest part.",
      },
      {
        posture: "celebrating",
        body: "What gets you through the remaining months is not inspiration. It is the identity you have built. You are someone who does this. Keep being that person.",
      },
    ],
  },
];
