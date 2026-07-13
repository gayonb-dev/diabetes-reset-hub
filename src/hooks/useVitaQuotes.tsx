import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VitaQuoteCategory =
  | "program_tip"
  | "mindset"
  | "science"
  | "wit"
  | "accountability"
  | "founder_says"
  | "bonus_insight";

export interface VitaQuote {
  id: string;
  text: string;
  category: VitaQuoteCategory;
}

// Weights per spec — 5 daily picks, seeded random per (member, day).
const CATEGORY_WEIGHTS: Record<VitaQuoteCategory, number> = {
  program_tip: 0.30,
  mindset: 0.25,
  science: 0.15,
  wit: 0.15,
  accountability: 0.10,
  founder_says: 0.025,
  bonus_insight: 0.025,
};

const CATEGORIES = Object.keys(CATEGORY_WEIGHTS) as VitaQuoteCategory[];

// xmur3 hash → seed
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

// mulberry32 PRNG seeded by xmur3
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeightedCategory(rand: () => number): VitaQuoteCategory {
  const r = rand();
  let acc = 0;
  for (const c of CATEGORIES) {
    acc += CATEGORY_WEIGHTS[c];
    if (r <= acc) return c;
  }
  return "program_tip";
}

function selectDaily(all: VitaQuote[], seedKey: string, count = 5): VitaQuote[] {
  if (all.length === 0) return [];
  const buckets: Record<VitaQuoteCategory, VitaQuote[]> = {
    program_tip: [], mindset: [], science: [], wit: [],
    accountability: [], founder_says: [], bonus_insight: [],
  };
  for (const q of all) buckets[q.category]?.push(q);

  const rand = mulberry32(xmur3(seedKey)());
  const chosen: VitaQuote[] = [];
  const usedIds = new Set<string>();
  let guard = 0;

  while (chosen.length < count && guard < count * 20) {
    guard++;
    let cat = pickWeightedCategory(rand);
    // Fallback if empty bucket — walk to any non-empty
    if (buckets[cat].length === 0) {
      const alt = CATEGORIES.find((c) => buckets[c].length > 0);
      if (!alt) break;
      cat = alt;
    }
    const pool = buckets[cat].filter((q) => !usedIds.has(q.id));
    if (pool.length === 0) continue;
    const pick = pool[Math.floor(rand() * pool.length)];
    usedIds.add(pick.id);
    chosen.push(pick);
  }
  return chosen;
}

/**
 * Returns 5 VITA quotes for the given member + program day. Selection is
 * deterministic per (memberId, calendar-day) so the set is stable all day.
 */
export function useVitaQuotes(memberId: string | undefined, programDay: number) {
  const [all, setAll] = useState<VitaQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("vita_quotes")
        .select("id, category, quote_text, day_range_start, day_range_end")
        .eq("is_active", true)
        .lte("day_range_start", programDay)
        .gte("day_range_end", programDay);
      if (cancelled) return;
      setAll(
        (data ?? []).map((r: any) => ({
          id: r.id,
          text: r.quote_text,
          category: r.category as VitaQuoteCategory,
        })),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [memberId, programDay]);

  const daily = useMemo(() => {
    if (!memberId) return [];
    const dateKey = new Date().toISOString().slice(0, 10);
    return selectDaily(all, `${memberId}:${dateKey}:${programDay}`, 5);
  }, [all, memberId, programDay]);

  return { quotes: daily, loading };
}
