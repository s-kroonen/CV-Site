import type { Dictionary } from "@/lib/i18n/dictionary";

const STYLES: Record<string, string> = {
  ongoing: "border-accent/50 bg-accent/15 text-ink",
  completed: "border-line text-ink-muted",
  experiment: "border-dashed border-line text-ink-muted",
  discontinued: "border-dashed border-line text-ink-muted opacity-80",
};

/** Small pill showing a project's progress (ongoing, completed, experiment, discontinued). Nothing for "". */
export function StatusBadge({ status, labels }: { status: string; labels: Dictionary["status"] }) {
  const label = (labels as Record<string, string>)[status];
  if (!label || !STYLES[status]) return null;
  return <span className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${STYLES[status]}`}>{label}</span>;
}
