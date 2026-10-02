"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormError, readApiError } from "@/components/admin/fields";

type Counts = { total: number; create: number; skip: number };
type Report = {
  mode: "add" | "replace";
  summary: Record<"experience" | "education" | "projects" | "skills", Counts> & { profile: boolean };
  errors: string[];
  errorCount: number;
  uploads: { found: number; missing: number };
  hasPrivateContact: boolean;
  applied: boolean;
};

const LABELS = { experience: "Experience", education: "Education", projects: "Projects", skills: "Skills" } as const;
const buttonClass =
  "w-fit rounded-md bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50";
const secondaryClass = "w-fit rounded-md border border-line px-5 py-2 text-sm transition-colors hover:border-accent";

export function DataTools() {
  const router = useRouter();
  const [includePrivate, setIncludePrivate] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [includeProfile, setIncludeProfile] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const resetPreview = () => {
    setReport(null);
    setError(null);
    setDone(false);
  };

  async function run(dryRun: boolean) {
    if (!file) return;
    if (!dryRun && mode === "replace") {
      const ok = window.confirm(
        "Replace everything? All current experience, education, projects and skills (including archived and trashed items) will be deleted and replaced by the file. This cannot be undone - export a backup first.",
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    form.append("includeProfile", includeProfile ? "1" : "0");
    form.append("dryRun", dryRun ? "1" : "0");

    const res = await fetch("/api/admin/import", { method: "POST", body: form });
    setBusy(false);
    const body = await res.json().catch(() => null);
    if (body?.summary) setReport(body);
    if (!res.ok) {
      setError(typeof body?.error === "string" ? body.error : await readApiError(res, "Import failed."));
      return;
    }
    if (!dryRun) {
      setDone(true);
      router.refresh();
    }
  }

  const canImport = report && !report.applied && report.errorCount === 0 && !done;

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Export</h2>
        <p className="text-sm text-ink-muted">
          A full backup of your content, including archived and trashed items. The ZIP also contains uploaded images and
          is what you want for restoring on another host.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includePrivate}
            onChange={(e) => setIncludePrivate(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Include private email and phone
        </label>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/admin/export?format=zip&private=${includePrivate ? 1 : 0}`} className={buttonClass}>
            Download ZIP (with images)
          </a>
          <a href={`/api/admin/export?format=json&private=${includePrivate ? 1 : 0}`} className={secondaryClass}>
            Download JSON only
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Import</h2>
        <p className="text-sm text-ink-muted">
          Upload a <code>.zip</code> or <code>.json</code> export. You&apos;ll see exactly what would change before anything is
          written.
        </p>

        <input
          type="file"
          accept=".zip,.json,application/zip,application/json"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            resetPreview();
          }}
          className="text-sm"
        />

        <fieldset className="flex flex-col gap-2 text-sm" onChange={resetPreview}>
          <legend className="mb-1 text-ink-muted">How to import</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="mode" checked={mode === "add"} onChange={() => setMode("add")} className="mt-1 accent-[var(--accent)]" />
            <span>
              <strong>Add new items</strong> - keeps what you have and skips entries that already exist (same title and
              company, school and degree, project slug, or skill name and category).
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="mode"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
              className="mt-1 accent-[var(--accent)]"
            />
            <span>
              <strong>Replace everything</strong> - deletes all current items first, then imports the file. Use this to
              restore a backup.
            </span>
          </label>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeProfile}
            onChange={(e) => {
              setIncludeProfile(e.target.checked);
              resetPreview();
            }}
            className="accent-[var(--accent)]"
          />
          Also import profile and private contact details (overwrites the current ones)
        </label>

        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={!file || busy} onClick={() => run(true)} className={secondaryClass}>
            {busy && !report ? "Checking…" : "Check file"}
          </button>
          {canImport && (
            <button type="button" disabled={busy} onClick={() => run(false)} className={buttonClass}>
              {busy ? "Importing…" : mode === "replace" ? "Replace and import" : "Import"}
            </button>
          )}
        </div>

        <FormError message={error} />

        {report && (
          <div className="flex flex-col gap-3 rounded-md border border-line p-4 text-sm">
            <p className="font-medium">
              {done ? "Imported." : report.errorCount ? "Problems found - nothing will be imported." : "Ready to import:"}
            </p>
            <table className="w-full max-w-md text-left">
              <thead className="text-ink-muted">
                <tr>
                  <th className="py-1 font-normal">Section</th>
                  <th className="py-1 font-normal">In file</th>
                  <th className="py-1 font-normal">{done ? "Added" : "Will add"}</th>
                  <th className="py-1 font-normal">Skipped</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((key) => (
                  <tr key={key}>
                    <td className="py-0.5">{LABELS[key]}</td>
                    <td>{report.summary[key].total}</td>
                    <td>{report.summary[key].create}</td>
                    <td>{report.summary[key].skip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {includeProfile && report.summary.profile && (
              <p>
                Profile will be {done ? "updated" : "overwritten"}
                {report.hasPrivateContact ? ", including private contact details" : ""}.
              </p>
            )}
            <p className="text-ink-muted">
              Images in file: {report.uploads.found}
              {report.uploads.missing > 0 && ` - ${report.uploads.missing} referenced but not included (they will show as broken until uploaded again)`}
            </p>
            {report.errors.length > 0 && (
              <ul className="list-disc pl-5 text-red-600 dark:text-red-400">
                {report.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {report.errorCount > report.errors.length && <li>…and {report.errorCount - report.errors.length} more</li>}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
