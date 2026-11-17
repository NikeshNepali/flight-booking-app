/**
 * Parses an ISO 8601 duration such as "PT2H26M" or "P1DT2H5M" into minutes.
 * Returns null when the value is missing or malformed.
 */
export function isoDurationToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(value);
  if (!match) return null;
  const [, days, hours, minutes] = match;
  return Number(days ?? 0) * 1440 + Number(hours ?? 0) * 60 + Number(minutes ?? 0);
}

/**
 * Minutes between two *local* datetimes that are in the same time zone
 * (e.g. arrival and next departure at the same connecting airport).
 */
export function minutesBetweenLocal(startLocal: string, endLocal: string): number {
  const start = Date.parse(`${startLocal.slice(0, 19)}Z`);
  const end = Date.parse(`${endLocal.slice(0, 19)}Z`);
  return Math.round((end - start) / 60_000);
}

/** Whole years between a YYYY-MM-DD birth date and a YYYY-MM-DD reference date. */
export function ageOnDate(bornOn: string, onDate: string): number {
  const [by, bm, bd] = bornOn.split('-').map(Number) as [number, number, number];
  const [ry, rm, rd] = onDate.split('-').map(Number) as [number, number, number];
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age;
}
