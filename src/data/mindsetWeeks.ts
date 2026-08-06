// Section 15 — Mindset and Psychology Module.
// Full verbatim copy from the approved S3 content appendix (person-centered,
// non-stigmatizing, no predicted outcomes). Week numbers, titles, unlock days,
// card counts, and postures are preserved; Week 6 intentionally has no assignment.
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
        body: "Starting does not require certainty. You only need one useful next step. Today, choose the action that feels most realistic and begin there.",
      },
      {
        posture: "encouraging",
        body: "A diagnosis is part of your health story; it is not your identity. You are a person learning what supports your daily life.",
      },
      {
        posture: "celebrating",
        body: "You opened the program and began. That counts. Small actions become useful when you repeat, review, and adjust them.",
      },
    ],
    assignment:
      "Write one reason you want daily diabetes care to feel easier. Keep the sentence somewhere you can return to on a hard day.",
  },
  {
    weekNumber: 2,
    title: "Week 2 — Agency",
    unlockDay: 8,
    cards: [
      {
        posture: "neutral",
        body: "Past habits were shaped by stress, time, cost, culture, and what felt possible. You can understand those influences without blaming yourself.",
      },
      {
        posture: "encouraging",
        body: "You are not weak or broken. You are building skills with the information and support available to you now.",
      },
      {
        posture: "encouraging",
        body: "Treat each action as a small experiment. Notice what fits your life, record what happened, and bring health questions to your care team.",
      },
    ],
    assignment:
      "Choose one routine you want to make easier. Write the smallest version you could still do on a busy day.",
  },
  {
    weekNumber: 3,
    title: "Week 3 — Evidence",
    unlockDay: 15,
    cards: [
      {
        posture: "encouraging",
        body: "Your records can help you notice patterns over time. One reading, one meal, or one missed day does not tell the whole story.",
      },
      {
        posture: "celebrating",
        body: "Small actions count: logging a reading, building one balanced plate, taking an appropriate walk, or preparing a question for a visit.",
      },
      {
        posture: "neutral",
        body: "Look beyond a single number. Notice which routines felt practical, what got in the way, and what you want to discuss with your healthcare professional.",
      },
    ],
    assignment:
      "Write down one pattern you noticed this week. It can be about your schedule, meals, movement, mood, or what helped you follow through.",
  },
  {
    weekNumber: 4,
    title: "Week 4 — Identity",
    unlockDay: 22,
    cards: [
      {
        posture: "encouraging",
        body: "You are more than a diagnosis or a set of readings. You are a person learning how to care for yourself in a way that fits your life.",
      },
      {
        posture: "neutral",
        body: "Use language that leaves room for real life: “I am building routines that support my diabetes care.” Progress does not require perfection.",
      },
      {
        posture: "encouraging",
        body: "Identity follows repeated choices. Every time you return to a useful action, you practice being someone who keeps showing up for their health.",
      },
    ],
    assignment:
      "Say or write: “I can return to one useful action today.” Choose the action before you close this card.",
  },
  {
    weekNumber: 5,
    title: "Week 5 — Resilience",
    unlockDay: 29,
    cards: [
      {
        posture: "neutral",
        body: "Hard days and missed routines happen. A change in your week is information, not a verdict on your effort or character.",
      },
      {
        posture: "encouraging",
        body: "Restarting is a skill. You do not need to catch up on everything; choose the next useful action and begin again.",
      },
      {
        posture: "encouraging",
        body: "Make the plan smaller when life gets crowded. A version you can do is more useful than a perfect version you avoid.",
      },
    ],
    assignment:
      "Think of one situation that usually interrupts your routine. Write a simple backup action for that situation.",
  },
  {
    weekNumber: 6,
    title: "Week 6 — Momentum",
    unlockDay: 36,
    cards: [
      {
        posture: "celebrating",
        body: "You have spent six weeks practicing. Pause and notice which tools you actually used—not which ones you think you should have used.",
      },
      {
        posture: "encouraging",
        body: "Keep what helps. Change what does not fit. A useful routine is allowed to grow with your needs.",
      },
      {
        posture: "encouraging",
        body: "Momentum comes from returning, not from being perfect. The next small action still matters after an easy week or a hard one.",
      },
      {
        posture: "celebrating",
        body: "You now have real experience with the program. Use it to choose what you want to continue and what questions to take to your healthcare team.",
      },
    ],
  },
];
