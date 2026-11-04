import { describe, expect, it } from "vitest";
import {
  DAYS_PER_YEAR,
  formatWorldDate,
  formatWorldSpan,
  monthsBetween,
  nextDay,
  parseWorldDate,
  spanDays,
  weekdayOf,
  worldDate,
} from "./calendar";

const weekday = (s: string) => weekdayOf(parseWorldDate(s)!);

describe("world calendar", () => {
  it("has a 365-day year", () => {
    expect(DAYS_PER_YEAR).toBe(365);
  });

  it("rejects days that don't exist", () => {
    expect(parseWorldDate("0560-02-29")).toBeUndefined();
    expect(parseWorldDate("0560-12-29")).toEqual({ year: 560, month: 12, day: 29 });
    expect(parseWorldDate("0560-13-01")).toBeUndefined();
    expect(parseWorldDate("560-02-01")).toBeUndefined();
  });

  it("matches the weekdays recorded in the original timeline", () => {
    // [date, weekday index with 0 = Sunday] taken from the Aeon export.
    expect(weekday("0560-02-04")).toBe(3); // Wed 4 Feb 560
    expect(weekday("0560-02-22")).toBe(0); // Sun 22 Feb 560
    expect(weekday("0560-03-06")).toBe(5); // Fri 6 Mar 560
    expect(weekday("0560-08-10")).toBe(2); // Tue 10 Aug 560
    expect(weekday("0559-12-28")).toBe(5); // Fri 28 Dec 559 (the previous year starts a day earlier)
    expect(weekday("0560-11-11")).toBe(3); // Wed 11 Nov 560
  });

  it("puts the Lost Day outside the week", () => {
    expect(weekday("0560-12-29")).toBeNull();
  });

  it("counts spans inclusively and across months and years", () => {
    expect(spanDays("0560-02-04", "0560-02-08")).toBe(5);
    expect(spanDays("0560-04-11", "0560-05-21")).toBe(39);
    expect(spanDays("0559-12-28", "0560-00-01")).toBe(3); // Dec 28, Lost Day, Ascensão 1
  });

  it("rolls the day over month and year ends", () => {
    expect(nextDay({ year: 560, month: 2, day: 28 })).toEqual({ year: 560, month: 3, day: 1 });
    expect(nextDay({ year: 559, month: 12, day: 29 })).toEqual({ year: 560, month: 0, day: 1 });
  });

  it("formats and lists months", () => {
    expect(worldDate(560, 2, 4)).toBe("0560-02-04");
    expect(formatWorldDate("0560-02-04")).toBe("4 Feb 560");
    expect(formatWorldSpan("0560-02-04", "0560-02-08")).toBe("4 Feb – 8 Feb 560");
    expect(formatWorldSpan("0559-12-28", "0560-01-02")).toBe("28 Dec 559 – 2 Jan 560");
    expect(monthsBetween("0559-11", "0560-01")).toEqual([
      "0559-11",
      "0559-12",
      "0560-00",
      "0560-01",
    ]);
  });
});
