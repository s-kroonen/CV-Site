const monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

export function formatDateRange(start: Date, end: Date | null): string {
  const startLabel = monthYear.format(start);
  const endLabel = end ? monthYear.format(end) : "Present";
  return `${startLabel} — ${endLabel}`;
}
