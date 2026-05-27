// Workout library — Standard Track A and Knee-Friendly Track B.
// Track B contains zero high-impact movements (no jumping jacks, skips, jumps).

export type RestStyle = "cardio" | "strength" | "compound";

export interface WorkoutExercise {
  name: string;
  reps?: string; // e.g. "3 × 12"
  duration?: string; // e.g. "45 sec"
  modification: string;
  rest: RestStyle;
}

export interface Workout {
  slug: string;
  name: string;
  focus: string;
  durationMin: number;
  difficulty: 1 | 2 | 3; // 3-dot indicator
  track: "A" | "B";
  exercises: WorkoutExercise[];
}

const TRACK_A: Workout[] = [
  {
    slug: "full-body-foundation-a",
    name: "Full-Body Foundation",
    focus: "Total body • Build the base",
    durationMin: 25,
    difficulty: 1,
    track: "A",
    exercises: [
      { name: "March in place", duration: "60 sec", modification: "Can't do this? Step side to side instead.", rest: "cardio" },
      { name: "Jumping jacks", reps: "3 × 30 sec", modification: "Can't do this? Step jacks — tap one foot out at a time.", rest: "cardio" },
      { name: "Bodyweight squat", reps: "3 × 12", modification: "Can't do this? Sit-to-stand from a sturdy chair.", rest: "strength" },
      { name: "Wall push-up", reps: "3 × 10", modification: "Can't do this? Stand closer to the wall.", rest: "strength" },
      { name: "Standing knee lift", reps: "3 × 10 each side", modification: "Can't do this? Hold a chair for balance.", rest: "compound" },
    ],
  },
  {
    slug: "lower-body-strength-a",
    name: "Lower-Body Strength",
    focus: "Legs & glutes • Insulin-sensitivity boost",
    durationMin: 30,
    difficulty: 2,
    track: "A",
    exercises: [
      { name: "March in place + arm swings", duration: "90 sec", modification: "Can't do this? Slow steady march.", rest: "cardio" },
      { name: "Goblet squat (water bottle)", reps: "3 × 12", modification: "Can't do this? Bodyweight squat to a chair.", rest: "strength" },
      { name: "Reverse lunge", reps: "3 × 8 each side", modification: "Can't do this? Hold a wall for balance.", rest: "strength" },
      { name: "Glute bridge", reps: "3 × 15", modification: "Can't do this? Hold the bridge for 5 seconds at the top.", rest: "strength" },
      { name: "Calf raise", reps: "3 × 20", modification: "Can't do this? Hold a counter for balance.", rest: "compound" },
    ],
  },
  {
    slug: "upper-body-core-a",
    name: "Upper Body + Core",
    focus: "Push, pull, brace",
    durationMin: 25,
    difficulty: 2,
    track: "A",
    exercises: [
      { name: "Arm circles", duration: "60 sec", modification: "Can't do this? Smaller circles.", rest: "cardio" },
      { name: "Incline push-up (counter)", reps: "3 × 10", modification: "Can't do this? Wall push-up.", rest: "strength" },
      { name: "Bent-over row (water bottles)", reps: "3 × 12", modification: "Can't do this? One arm at a time, hand on a chair.", rest: "strength" },
      { name: "Dead bug", reps: "3 × 10 each side", modification: "Can't do this? Move arms only, legs stay down.", rest: "strength" },
      { name: "Standing side bend", reps: "3 × 10 each side", modification: "Can't do this? Slow tempo, smaller range.", rest: "compound" },
    ],
  },
  {
    slug: "cardio-circuit-a",
    name: "Cardio Circuit",
    focus: "Heart rate • Blood-sugar clearance",
    durationMin: 20,
    difficulty: 3,
    track: "A",
    exercises: [
      { name: "Jumping jacks", duration: "45 sec", modification: "Can't do this? Step jacks.", rest: "cardio" },
      { name: "High knees", duration: "45 sec", modification: "Can't do this? Marching knees.", rest: "cardio" },
      { name: "Skip in place", duration: "45 sec", modification: "Can't do this? Toe taps in place.", rest: "cardio" },
      { name: "Squat punches", duration: "45 sec", modification: "Can't do this? Half squat with punches.", rest: "compound" },
      { name: "Mountain climber", duration: "30 sec", modification: "Can't do this? Standing mountain climber with knee drives.", rest: "cardio" },
    ],
  },
];

const TRACK_B: Workout[] = [
  {
    slug: "full-body-foundation-b",
    name: "Full-Body Foundation",
    focus: "Total body • Joint-friendly base",
    durationMin: 25,
    difficulty: 1,
    track: "B",
    exercises: [
      { name: "Seated march", duration: "60 sec", modification: "Can't do this? Slower tempo.", rest: "cardio" },
      { name: "Step side to side", reps: "3 × 30 sec", modification: "Can't do this? Hold a wall for balance.", rest: "cardio" },
      { name: "Sit-to-stand", reps: "3 × 12", modification: "Can't do this? Use chair arms to assist.", rest: "strength" },
      { name: "Wall push-up", reps: "3 × 10", modification: "Can't do this? Stand closer to the wall.", rest: "strength" },
      { name: "Standing hip abduction", reps: "3 × 10 each side", modification: "Can't do this? Hold a chair for balance.", rest: "compound" },
    ],
  },
  {
    slug: "lower-body-strength-b",
    name: "Lower-Body Strength",
    focus: "Legs & glutes • No knee load",
    durationMin: 30,
    difficulty: 2,
    track: "B",
    exercises: [
      { name: "Seated march + arm swings", duration: "90 sec", modification: "Can't do this? Arms only.", rest: "cardio" },
      { name: "Sit-to-stand (slow tempo)", reps: "3 × 10", modification: "Can't do this? Use chair arms to assist.", rest: "strength" },
      { name: "Glute bridge", reps: "3 × 15", modification: "Can't do this? Hold for 5 sec at the top.", rest: "strength" },
      { name: "Standing hip extension", reps: "3 × 10 each side", modification: "Can't do this? Hold a counter for balance.", rest: "strength" },
      { name: "Seated calf raise", reps: "3 × 20", modification: "Can't do this? Slower tempo.", rest: "compound" },
    ],
  },
  {
    slug: "upper-body-core-b",
    name: "Upper Body + Core",
    focus: "Push, pull, brace — seated-friendly",
    durationMin: 25,
    difficulty: 2,
    track: "B",
    exercises: [
      { name: "Seated arm circles", duration: "60 sec", modification: "Can't do this? Smaller circles.", rest: "cardio" },
      { name: "Wall push-up", reps: "3 × 10", modification: "Can't do this? Stand closer to the wall.", rest: "strength" },
      { name: "Seated row (water bottles)", reps: "3 × 12", modification: "Can't do this? One arm at a time.", rest: "strength" },
      { name: "Seated dead bug", reps: "3 × 10 each side", modification: "Can't do this? Arms only.", rest: "strength" },
      { name: "Seated side bend", reps: "3 × 10 each side", modification: "Can't do this? Smaller range.", rest: "compound" },
    ],
  },
  {
    slug: "low-impact-cardio-b",
    name: "Low-Impact Cardio",
    focus: "Heart rate • Zero impact",
    durationMin: 20,
    difficulty: 3,
    track: "B",
    exercises: [
      { name: "Step side to side", duration: "45 sec", modification: "Can't do this? Hold a wall.", rest: "cardio" },
      { name: "Marching in place (tall)", duration: "45 sec", modification: "Can't do this? Seated march.", rest: "cardio" },
      { name: "Standing toe taps (front)", duration: "45 sec", modification: "Can't do this? Slower tempo.", rest: "cardio" },
      { name: "Half-squat punches", duration: "45 sec", modification: "Can't do this? Standing punches only.", rest: "compound" },
      { name: "Seated knee drives", duration: "30 sec", modification: "Can't do this? Single leg at a time.", rest: "cardio" },
    ],
  },
];

export const ALL_WORKOUTS: Workout[] = [...TRACK_A, ...TRACK_B];

export function getWorkoutsByTrack(track: "A" | "B"): Workout[] {
  return ALL_WORKOUTS.filter((w) => w.track === track);
}

export function getWorkoutBySlug(slug: string): Workout | undefined {
  return ALL_WORKOUTS.find((w) => w.slug === slug);
}

export const REST_SECONDS: Record<RestStyle, number> = {
  cardio: 30,
  strength: 60,
  compound: 120,
};

export const COOL_DOWN_ITEMS: { key: string; label: string }[] = [
  { key: "easy_walk", label: "5 minutes easy walking or marching in place" },
  { key: "breathing", label: "Deep breathing (5 slow breaths)" },
  { key: "quad_stretch", label: "Standing quad stretch, both sides" },
  { key: "hamstring_stretch", label: "Standing hamstring stretch, both sides" },
  { key: "shoulder_neck", label: "Shoulder rolls and neck tilts" },
  { key: "epsom_soak", label: "Epsom salt foot soak tonight" },
];
