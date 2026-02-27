import { describe, expect, it } from "vitest";

import { calculateSm2 } from "@/server/review/sm2";

describe("calculateSm2", () => {
  it("resets repetition when quality < 3", () => {
    const result = calculateSm2(
      {
        ef: 2.5,
        repetition: 4,
        intervalDays: 15,
      },
      2,
    );

    expect(result.repetition).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.ef).toBeGreaterThanOrEqual(1.3);
  });

  it("sets interval to 1 on first successful review", () => {
    const result = calculateSm2(
      {
        ef: 2.5,
        repetition: 0,
        intervalDays: 0,
      },
      4,
    );

    expect(result.repetition).toBe(1);
    expect(result.intervalDays).toBe(1);
  });

  it("sets interval to 6 on second successful review", () => {
    const result = calculateSm2(
      {
        ef: 2.5,
        repetition: 1,
        intervalDays: 1,
      },
      5,
    );

    expect(result.repetition).toBe(2);
    expect(result.intervalDays).toBe(6);
  });

  it("uses rounded interval * EF from third review", () => {
    const result = calculateSm2(
      {
        ef: 2.5,
        repetition: 2,
        intervalDays: 6,
      },
      5,
    );

    expect(result.repetition).toBe(3);
    expect(result.intervalDays).toBeGreaterThan(6);
  });

  it("throws on out-of-range quality", () => {
    expect(() =>
      calculateSm2(
        {
          ef: 2.5,
          repetition: 0,
          intervalDays: 0,
        },
        9,
      ),
    ).toThrow("quality must be between 0 and 5");
  });
});
