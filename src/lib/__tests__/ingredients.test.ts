import { describe, it, expect } from "vitest";
import {
  ingredientDisplayName,
  mergeIngredients,
  parseIngredient,
} from "@/lib/ingredients";

// Batch 2 Part D — the parser fixtures. Each case is a member-visible string
// that previously rendered incorrectly, or a shape the audit named explicitly.
describe("ingredient parser", () => {
  it("does not eat the first letter of a word that starts with a unit letter", () => {
    // The exact regressions named in the audit.
    expect(ingredientDisplayName("2 large eggs")).toBe("large eggs");
    expect(ingredientDisplayName("2 cups broccoli florets")).toBe("broccoli florets");
    expect(ingredientDisplayName("3 cups shredded cabbage")).toBe("shredded cabbage");
    expect(ingredientDisplayName("4 large lettuce leaves")).toBe("large lettuce leaves");
  });

  it("never produces the previously reported damaged strings", () => {
    for (const bad of ["arge eggs", "s broccoli florets", "s shredded cabbage", "arge lettuce leaves"]) {
      const outputs = [
        ingredientDisplayName("2 large eggs"),
        ingredientDisplayName("2 cups broccoli florets"),
        ingredientDisplayName("3 cups shredded cabbage"),
        ingredientDisplayName("4 large lettuce leaves"),
      ];
      expect(outputs).not.toContain(bad);
    }
  });

  it("handles plain quantities", () => {
    expect(parseIngredient("2 tomatoes")).toMatchObject({ name: "tomatoes", quantity: 2, unit: null });
  });

  it("handles ascii fractions and mixed numbers", () => {
    expect(parseIngredient("1/2 cup oats")).toMatchObject({ name: "oats", quantity: 0.5, unit: "cup" });
    expect(parseIngredient("1 1/2 cups rice")).toMatchObject({ name: "rice", quantity: 1.5, unit: "cups" });
  });

  it("handles unicode fractions", () => {
    expect(parseIngredient("½ tsp cinnamon")).toMatchObject({ name: "cinnamon", quantity: 0.5, unit: "tsp" });
    expect(parseIngredient("1 ¼ cups spinach")).toMatchObject({ name: "spinach", quantity: 1.25 });
  });

  it("handles decimals and metric units", () => {
    expect(parseIngredient("1.5 kg pumpkin")).toMatchObject({ name: "pumpkin", quantity: 1.5, unit: "kg" });
    expect(parseIngredient("250 g chicken breast")).toMatchObject({ name: "chicken breast", unit: "g" });
  });

  it("keeps quantity-less ingredients fully readable", () => {
    expect(ingredientDisplayName("Salt to taste")).toBe("Salt to taste");
    expect(ingredientDisplayName("black pepper")).toBe("black pepper");
    expect(ingredientDisplayName("olive oil (optional)")).toBe("olive oil (optional)");
  });

  it("keeps numeric prefixes that belong to the name", () => {
    // "2% milk" — the % is not a unit, so nothing is stripped mid-token.
    expect(ingredientDisplayName("2% milk")).toBe("2% milk");
    expect(ingredientDisplayName("7-spice blend")).toBe("7-spice blend");
  });

  it("never returns an empty or fragment name", () => {
    for (const raw of ["2", "1 cup", "½", "3 g"]) {
      const out = ingredientDisplayName(raw);
      expect(out.length).toBeGreaterThan(0);
      expect(out).toBe(raw);
    }
  });
});

describe("ingredient merging", () => {
  it("sums only when units match", () => {
    const merged = mergeIngredients(["1 cup spinach", "2 cups spinach"]);
    expect(merged).toHaveLength(1);
    expect(merged[0].combined).toBe(true);
    expect(merged[0].label).toContain("spinach");
  });

  it("never fabricates a combined quantity across incompatible units", () => {
    const merged = mergeIngredients(["1 cup spinach", "200 g spinach"]);
    expect(merged).toHaveLength(1);
    expect(merged[0].combined).toBe(false);
    expect(merged[0].label).toBe("spinach");
  });

  it("does not merge different ingredients", () => {
    const merged = mergeIngredients(["2 large eggs", "1 cup oats"]);
    expect(merged.map((m) => m.label)).toEqual(["large eggs", "oats"]);
  });

  it("is case and whitespace insensitive when grouping", () => {
    const merged = mergeIngredients(["2 Large Eggs", "3 large  eggs"]);
    expect(merged).toHaveLength(1);
  });
});
