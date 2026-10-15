import { describe, expect, it } from "vitest";
import { groupByCategory } from "@/src/lib/data/store";

const p = (id: number, category: string) => ({ id, category });

describe("groupByCategory", () => {
  it("orders groups by CATEGORIES and keeps item order inside each group", () => {
    const groups = groupByCategory([
      p(1, "Víveres"),
      p(2, "Frutas"),
      p(3, "Víveres"),
      p(4, "Café y cacao"),
    ]);
    expect(groups.map((g) => g.category)).toEqual(["Frutas", "Víveres", "Café y cacao"]);
    expect(groups[1].items.map((i) => i.id)).toEqual([1, 3]);
  });

  it("puts unknown categories last, alphabetically, instead of dropping them", () => {
    const groups = groupByCategory([p(1, "Zeta"), p(2, "Alfa"), p(3, "Frutas")]);
    expect(groups.map((g) => g.category)).toEqual(["Frutas", "Alfa", "Zeta"]);
  });

  it("returns no groups for no items", () => {
    expect(groupByCategory([])).toEqual([]);
  });
});
