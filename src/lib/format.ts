import type { Locale } from "@/lib/i18n/config";

const formatters: Partial<Record<Locale, Intl.DateTimeFormat>> = {};
function monthYear(lang: Locale) {
  return (formatters[lang] ??= new Intl.DateTimeFormat(lang === "nl" ? "nl-NL" : "en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }));
}

/** Empty string when neither date is known, so callers can skip the line entirely. */
export function formatDateRange(
  start: Date | null,
  end: Date | null,
  lang: Locale,
  labels: { present: string; until: string },
): string {
  const fmt = monthYear(lang);
  if (!start && !end) return "";
  if (!start && end) return `${labels.until} ${fmt.format(end)}`;
  const endLabel = end ? fmt.format(end) : labels.present;
  return `${fmt.format(start as Date)} \u2014 ${endLabel}`;
}
