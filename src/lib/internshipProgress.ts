import { differenceInCalendarDays } from "date-fns";

// Frontend Day F5 Intern Lifecycle page's Progress % bar — computed
// client-side against startDate/endDate (already-resolved actual-over-
// proposed fallback from the backend, see GET /internships), clamped to
// [0, 100] since "now" can fall outside the window for a not-yet-started
// or overdue-but-not-yet-closed internship.
export function progressPercent(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

// Milestone tags are computed client-side against elapsed time only —
// there's no backend field for these, per the build plan ("the tags
// themselves don't need a new backend field").
export function milestoneTags(startDate: string, endDate: string): string[] {
  const daysElapsed = differenceInCalendarDays(new Date(), new Date(startDate));
  const percent = progressPercent(startDate, endDate);
  const tags: string[] = [];
  if (daysElapsed >= 7) tags.push("Week 1 milestone");
  if (percent >= 50) tags.push("Mid-term review");
  return tags;
}
