import { describe, it, expect } from "vitest";
import { progressPercent, milestoneTags } from "./internshipProgress";

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();
}
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 24 * 3600 * 1000).toISOString();
}

describe("progressPercent", () => {
  it("returns 0 right at the start date", () => {
    expect(progressPercent(daysAgo(0), daysFromNow(10))).toBe(0);
  });

  it("returns ~50 at the midpoint", () => {
    expect(progressPercent(daysAgo(5), daysFromNow(5))).toBe(50);
  });

  it("clamps to 100 once past the end date rather than going over", () => {
    expect(progressPercent(daysAgo(20), daysAgo(10))).toBe(100);
  });

  it("clamps to 0 for a not-yet-started internship (start date in the future)", () => {
    expect(progressPercent(daysFromNow(5), daysFromNow(15))).toBe(0);
  });

  it("returns 0 rather than dividing by zero when end <= start", () => {
    const same = daysAgo(0);
    expect(progressPercent(same, same)).toBe(0);
  });
});

describe("milestoneTags", () => {
  it("tags nothing in the first week at low progress", () => {
    expect(milestoneTags(daysAgo(2), daysFromNow(28))).toEqual([]);
  });

  it("adds 'Week 1 milestone' once 7 days have elapsed since start", () => {
    expect(milestoneTags(daysAgo(7), daysFromNow(23))).toContain("Week 1 milestone");
  });

  it("adds 'Mid-term review' once progress reaches 50%, independent of elapsed days", () => {
    // 5 of 10 days elapsed: 50% progress, but well under the 7-day mark.
    const tags = milestoneTags(daysAgo(5), daysFromNow(5));
    expect(tags).toContain("Mid-term review");
    expect(tags).not.toContain("Week 1 milestone");
  });

  it("can carry both tags at once for a long-running internship past the midpoint", () => {
    const tags = milestoneTags(daysAgo(30), daysFromNow(10));
    expect(tags).toEqual(["Week 1 milestone", "Mid-term review"]);
  });
});
