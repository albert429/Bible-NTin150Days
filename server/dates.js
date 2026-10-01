export function cairoDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function dayForDate(start, date) {
  return (
    Math.floor(
      (Date.parse(date + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) /
        86400000,
    ) + 1
  );
}
export function validDate(s) {
  return (
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s &&
    s >= "2000-01-01" &&
    s <= "2100-12-31"
  );
}
