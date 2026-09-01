// Part B, one canonical, honest statement of where the member is in the
// 180-day programme. Used on the dashboard so the day number, the phase and
// the phase position always agree with each other.
import { phaseFor, dayInPhase, PROGRAM_TOTAL_DAYS } from "@/lib/phase";

interface Props {
  currentProgramDay: number;
}

export function ProgramProgressLine({ currentProgramDay }: Props) {
  const day = Math.max(1, currentProgramDay);
  const completed = day > PROGRAM_TOTAL_DAYS;

  if (completed) {
    return (
      <p className="text-[13px] text-secondary-fg tabular-nums">
        <span className="font-semibold text-foreground">
          All {PROGRAM_TOTAL_DAYS} days complete.
        </span>{" "}
        You can keep logging every day and revisit any day from Progress.
      </p>
    );
  }

  const phase = phaseFor(day);
  const inPhase = dayInPhase(day);

  return (
    <p className="text-[13px] text-secondary-fg tabular-nums">
      <span className="font-semibold text-foreground">
        Day {day} of {PROGRAM_TOTAL_DAYS}
      </span>{" "}
      · {phase.name}: day {inPhase} of {phase.total}
    </p>
  );
}
