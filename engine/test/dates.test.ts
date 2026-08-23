import { describe, expect, it } from "vitest";
import { addDays, compareDates, dateRange, diffDays, isDateStr } from "../src/dates.js";

describe("calendar arithmetic", () => {
  it("adds and subtracts days across month ends", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("survives a daylight-saving change without shifting a day", () => {
    // Central European summer time starts on 29 March 2026. A date-only
    // representation must not care. This is risk 3 from TECHNIK.md.
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
  });

  it("counts days in both directions", () => {
    expect(diffDays("2026-03-02", "2026-03-09")).toBe(7);
    expect(diffDays("2026-03-09", "2026-03-02")).toBe(-7);
    expect(diffDays("2026-03-02", "2026-03-02")).toBe(0);
  });

  it("rejects impossible dates", () => {
    expect(isDateStr("2026-02-30")).toBe(false);
    expect(isDateStr("2026-13-01")).toBe(false);
    expect(isDateStr("2026-3-1")).toBe(false);
    expect(isDateStr("2026-03-01")).toBe(true);
  });

  it("orders dates, including the equal case", () => {
    expect(compareDates("2026-03-02", "2026-03-03")).toBe(-1);
    expect(compareDates("2026-03-03", "2026-03-02")).toBe(1);
    expect(compareDates("2026-03-02", "2026-03-02")).toBe(0);
  });

  it("builds inclusive ranges", () => {
    expect(dateRange("2026-03-02", "2026-03-05")).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
    ]);
  });
});
