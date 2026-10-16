import { describe, expect, it } from "vitest";
import { fitWithin, sourceRect } from "./resize";

describe("fitWithin", () => {
  it("shrinks the long edge to the limit and keeps the ratio", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 512)).toEqual({ width: 384, height: 512 });
  });

  it("never upscales", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("sourceRect", () => {
  it("uses the whole image unless square", () => {
    expect(sourceRect(4000, 3000, false)).toEqual({ sx: 0, sy: 0, sw: 4000, sh: 3000 });
  });

  it("center-crops landscape and portrait photos to a square", () => {
    expect(sourceRect(4000, 3000, true)).toEqual({ sx: 500, sy: 0, sw: 3000, sh: 3000 });
    expect(sourceRect(3000, 4000, true)).toEqual({ sx: 0, sy: 500, sw: 3000, sh: 3000 });
  });
});
