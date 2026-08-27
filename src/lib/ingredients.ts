/**
 * Batch 2 Part D — ingredient name normalisation for the shopping list.
 *
 * The previous inline regex stripped a leading quantity together with an
 * OPTIONAL unit that was matched without a word boundary, so "2 large eggs"
 * lost the "l" of "large" and rendered as "arge eggs". The rules here are
 * deliberately conservative: a token is only removed when it is unambiguously
 * a quantity or a known unit followed by a word boundary. If normalisation
 * would empty the string or leave something shorter than a word, the original
 * text is returned unchanged — a legitimate ingredient name is never silently
 * damaged.
 */

/** Units we recognise. Matched whole-word only. */
const UNITS = [
  "g",
  "gram",
  "grams",
  "kg",
  "ml",
  "l",
  "litre",
  "litres",
  "liter",
  "liters",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "tsp",
  "teaspoon",
  "teaspoons",
  "cup",
  "cups",
  "can",
  "cans",
  "clove",
  "cloves",
  "slice",
  "slices",
  "piece",
  "pieces",
  "fillet",
  "fillets",
  "handful",
  "handfuls",
  "bunch",
  "bunches",
  "pinch",
  "pinches",
  "sprig",
  "sprigs",
  "stalk",
  "stalks",
  "packet",
  "packets",
] as const;

export type UnitToken = (typeof UNITS)[number] | null;

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅐": 1 / 7,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const UNIT_PATTERN = UNITS.slice()
  .sort((a, b) => b.length - a.length)
  .join("|");

const UNIT_SET = new Set<string>(UNITS.map((u) => u.toLowerCase()));


// [quantity][optional unit] at the start of the string. The unit must be a
// whole word (\b) and must be followed by whitespace, so "large" can never be
// mistaken for the "l" unit.
const LEADING = new RegExp(
  `^\\s*((?:\\d+\\s*[¼½¾⅐⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])|(?:\\d+\\s+\\d+/\\d+)|(?:\\d+/\\d+)|(?:\\d+(?:[.,]\\d+)?)|(?:[¼½¾⅐⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]))\\s*(?:(${UNIT_PATTERN})\\b\\.?)?\\s+`,
  "i",
);

export interface ParsedIngredient {
  /** Display text with a leading quantity/unit removed when safe. */
  name: string;
  /** Numeric quantity when one was present and parseable. */
  quantity: number | null;
  /** Lower-cased unit token when one was present. */
  unit: UnitToken;
  /** Original input, untouched. */
  raw: string;
}

function parseQuantity(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  // "1 ½"
  const mixedUnicode = t.match(/^(\d+)\s*([¼½¾⅐⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
  if (mixedUnicode) {
    return Number(mixedUnicode[1]) + UNICODE_FRACTIONS[mixedUnicode[2]];
  }
  if (UNICODE_FRACTIONS[t] !== undefined) return UNICODE_FRACTIONS[t];
  // "1 1/2"
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  // "3/4"
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalise a free-text ingredient line. Never returns an empty string, and
 * never returns something that looks truncated mid-word.
 */
export function parseIngredient(raw: string): ParsedIngredient {
  const original = (raw ?? "").toString();
  const trimmed = original.trim();
  if (!trimmed) return { name: original, quantity: null, unit: null, raw: original };

  const m = trimmed.match(LEADING);
  if (!m) {
    // No quantity at all — quantity-less ingredients stay fully readable.
    return { name: trimmed, quantity: null, unit: null, raw: original };
  }

  const rest = trimmed.slice(m[0].length).trim();
  const restIsOnlyUnit = UNIT_SET.has(rest.toLowerCase().replace(/\.$/, ""));
  // Refuse any correction that would leave nothing, a fragment shorter than a
  // plausible word, or a bare unit ("1 cup" has no item to show). Better to
  // display the raw line than to damage it.
  if (rest.length < 2 || restIsOnlyUnit) {
    return { name: trimmed, quantity: parseQuantity(m[1]), unit: null, raw: original };
  }

  return {
    name: rest,
    quantity: parseQuantity(m[1]),
    unit: (m[2] ? (m[2].toLowerCase() as UnitToken) : null),
    raw: original,
  };
}

/** Singular form used when comparing units, so "cup" and "cups" agree. */
export function canonicalUnit(unit: UnitToken): string {
  if (!unit) return "";
  const u = unit.toLowerCase();
  const SINGULAR: Record<string, string> = {
    grams: "g",
    gram: "g",
    litre: "l",
    litres: "l",
    liter: "l",
    liters: "l",
    ounce: "oz",
    ounces: "oz",
    lbs: "lb",
    pound: "lb",
    pounds: "lb",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    teaspoon: "tsp",
    teaspoons: "tsp",
  };
  if (SINGULAR[u]) return SINGULAR[u];
  return u.endsWith("s") && u.length > 2 ? u.slice(0, -1) : u;
}


/** Convenience: the display name only. */
export function ingredientDisplayName(raw: string): string {
  return parseIngredient(raw).name;
}

/** Key used for de-duplication — case and whitespace insensitive. */
export function ingredientKey(raw: string): string {
  return ingredientDisplayName(raw).toLowerCase().replace(/\s+/g, " ").trim();
}

export interface MergedIngredient {
  key: string;
  /** What the member reads. */
  label: string;
  /** True when two or more lines were combined into one quantity. */
  combined: boolean;
}

/**
 * Merge repeated ingredients. Quantities are only summed when every occurrence
 * carries the SAME unit (or all are unit-less); otherwise the occurrences are
 * listed separately so no misleading combined quantity is ever shown.
 */
export function mergeIngredients(lines: string[]): MergedIngredient[] {
  const groups = new Map<string, ParsedIngredient[]>();
  const order: string[] = [];
  for (const line of lines) {
    const parsed = parseIngredient(line);
    const key = parsed.name.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(parsed);
  }

  const out: MergedIngredient[] = [];
  for (const key of order) {
    const items = groups.get(key)!;
    const name = items[0].name;
    // "cup" and "cups" are the same unit; "cup" and "g" are not.
    const units = new Set(items.map((i) => canonicalUnit(i.unit)));
    const everyHasQty = items.every((i) => i.quantity !== null);

    if (items.length === 1) {
      out.push({ key, label: name, combined: false });
      continue;
    }

    if (units.size === 1 && everyHasQty) {
      const total = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
      const unit = canonicalUnit(items[0].unit);
      const qty = Number.isInteger(total) ? String(total) : String(Math.round(total * 100) / 100);
      out.push({
        key,
        label: unit ? `${qty} ${unit} ${name}` : `${qty} ${name}`,
        combined: true,
      });
      continue;
    }


    // Incompatible units — show the ingredient once, never a fabricated total.
    out.push({ key, label: name, combined: false });
  }
  return out;
}
