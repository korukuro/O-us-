// A "day" is a calendar date in the user's own timezone, as YYYY-MM-DD.
// Never compare raw timestamps for streaks — they break across DST and midnight.
export function dayKeyFor(tz, when = Date.now()) {
  // en-CA formats as YYYY-MM-DD, which is exactly what we want
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(when));
}