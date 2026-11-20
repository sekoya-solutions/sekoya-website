import { describe, expect, it } from "vitest";
import { numericDate } from "./dates";

describe("numericDate", () => {
  it("shows a date as day, month and year", () => {
    expect(numericDate("2026-11-17")).toBe("17/11/2026");
    expect(numericDate("2022-05-01")).toBe("01/05/2022");
  });

  it.each(["2026-11-7", "17/11/2026", "2026-11-17T10:00", ""])("rejects %j", (value) => {
    expect(() => numericDate(value)).toThrow();
  });
});
