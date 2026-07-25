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

// How many calendar days between two YYYY-MM-DD keys. 1 = consecutive.
export function dayGap(fromKey, toKey) {
  if (!fromKey) return Infinity; // never completed before
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86400000);
}