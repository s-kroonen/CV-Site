const monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

/** Empty string when neither date is known, so callers can skip the line entirely. */
export function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return "";
  if (!start && end) return `Until ${monthYear.format(end)}`;
  const startLabel = monthYear.format(start as Date);
  const endLabel = end ? monthYear.format(end) : "Present";
  return `${startLabel} — ${endLabel}`;
}
