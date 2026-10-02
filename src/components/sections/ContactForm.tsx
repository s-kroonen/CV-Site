"use client";

import { useState, type FormEvent } from "react";
import { Turnstile } from "@/components/Turnstile";
import { useLocale } from "@/components/i18n/LocaleProvider";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const { t } = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          website: data.get("website"), // honeypot - real users never fill this
          turnstileToken,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t.contact.error);
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : t.contact.error);
    }
  }

  if (status === "success") {
    return <p className="max-w-md text-ink-muted">{t.contact.thanks}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm text-ink-muted">
          {t.contact.name}
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={200}
          className="rounded-md border border-line bg-transparent px-3 py-2 outline-none transition-colors focus:border-accent"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm text-ink-muted">
          {t.contact.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={320}
          className="rounded-md border border-line bg-transparent px-3 py-2 outline-none transition-colors focus:border-accent"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="text-sm text-ink-muted">
          {t.contact.message}
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={5000}
          rows={5}
          className="rounded-md border border-line bg-transparent px-3 py-2 outline-none transition-colors focus:border-accent"
        />
      </div>

      {/* Honeypot: hidden from real users via CSS, bots that fill every field trip it */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} onVerify={setTurnstileToken} />}

      {status === "error" && <p className="text-sm text-red-500">{errorMessage}</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? t.contact.sending : t.contact.send}
      </button>
    </form>
  );
}
