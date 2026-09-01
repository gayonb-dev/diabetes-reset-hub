import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { approxMl, formatVolume, toStoredFlOz, type VolumeUnit } from "@/lib/units";

/**
 * Water entry, logging only.
 *
 * DRM publishes no universal fluid target, so there is no denominator, no
 * percentage, no ring and no default amount here. Storage is whole US fluid
 * ounces (public.water_logs.ounces is an integer): the entered quantity stays
 * exactly as typed while units are switched, and the storage rounding is
 * applied once, at submission. Whenever the saved amount differs from what was
 * entered the member sees the exact amount that will be saved first.
 */

const QUICK_ADDS = [8, 12, 16];

interface Props {
  /** Resolves true only once the row is persisted. */
  addWater: (oz: number) => Promise<boolean>;
}

const WaterEntry = ({ addWater }: Props) => {
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<VolumeUnit>("floz");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ kind: "saved" | "error" | "invalid"; text: string } | null>(
    null,
  );

  const entered = Number(amount);
  const enteredValid = amount.trim() !== "" && Number.isFinite(entered) && entered > 0;
  const willStore = enteredValid ? toStoredFlOz(entered, unit) : 0;
  const showsRoundingNotice =
    enteredValid && willStore > 0 && (unit === "ml" || willStore !== entered);

  const submit = async (oz: number, label: string) => {
    setPending(true);
    setStatus(null);
    const ok = await addWater(oz);
    setPending(false);
    if (ok) {
      setStatus({ kind: "saved", text: `Saved ${label}` });
      return true;
    }
    setStatus({
      kind: "error",
      text: `${label} was not saved. Check your connection and try again.`,
    });
    return false;
  };

  const submitCustom = async () => {
    if (!enteredValid) {
      setStatus({ kind: "invalid", text: "Enter an amount greater than zero." });
      return;
    }
    if (willStore <= 0) {
      setStatus({
        kind: "invalid",
        text: `That amount is smaller than the smallest amount this log can store (1 fl oz, about ${approxMl(1)} mL). Nothing was saved.`,
      });
      return;
    }
    const ok = await submit(willStore, formatVolume(willStore));
    if (ok) setAmount("");
  };

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_ADDS.map((oz) => (
          <Button
            key={oz}
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={pending}
            onClick={() => submit(oz, formatVolume(oz))}
          >
            {`+${oz} fl oz (≈ ${approxMl(oz)} mL)`}
          </Button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="water-custom-amount" className="text-sm text-foreground">
          Other amount
        </label>
        <Input
          id="water-custom-amount"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder={unit === "ml" ? "e.g. 250" : "e.g. 10"}
          className="w-28 min-h-11"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setStatus(null);
          }}
        />
        {/* Switching units never rewrites the typed quantity. */}
        <div
          className="inline-flex rounded-lg border border-border overflow-hidden"
          role="group"
          aria-label="Amount unit"
        >
          {(["floz", "ml"] as VolumeUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={cn(
                "min-h-11 px-3 text-sm",
                unit === u ? "bg-primary text-primary-foreground font-semibold" : "text-foreground",
              )}
            >
              {u === "floz" ? "fl oz" : "mL"}
            </button>
          ))}
        </div>
        <Button size="sm" className="min-h-11" disabled={pending} onClick={submitCustom}>
          {pending ? "Saving…" : "Add"}
        </Button>
      </div>

      {showsRoundingNotice && (
        <p className="text-xs text-tertiary-fg mt-2">
          {`Saves ${formatVolume(willStore)}, this log stores whole fluid ounces.`}
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        {status?.text ?? ""}
      </p>
      {status && (
        <p
          className={cn(
            "text-xs mt-2",
            status.kind === "saved" ? "text-primary font-medium" : "text-destructive",
          )}
        >
          {status.text}
        </p>
      )}

      <p className="text-xs text-tertiary-fg mt-3">
        Log the amount you actually drank. Check your glass or bottle size if you're unsure. This log
        records what you drank; it is not a target. If a healthcare professional has given you a
        fluid limit or different advice, follow that advice.
      </p>
    </div>
  );
};

export default WaterEntry;
