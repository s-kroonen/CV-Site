"use client";

import { useState } from "react";
import { Turnstile } from "@/components/Turnstile";

type State = "hidden" | "verifying" | "revealed" | "error";

export function RevealContactInfo() {
  const [state, setState] = useState<State>("hidden");
  const [info, setInfo] = useState<{ email: string; phone: string } | null>(null);

  async function handleVerified(token: string) {
    setState("verifying");
    try {
      const res = await fetch("/api/contact-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken: token }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInfo(data);
      setState("revealed");
    } catch {
      setState("error");
    }
  }

  if (state === "revealed" && info) {
    return (
      <p className="text-sm text-ink-muted">
        {info.email} · {info.phone}
      </p>
    );
  }

  if (state === "hidden") {
    return (
      <button
        onClick={() => setState("verifying")}
        className="w-fit text-sm text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
      >
        Show phone / private email
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Turnstile onVerify={handleVerified} />
      {state === "error" && <p className="text-sm text-red-500">Could not verify. Please try again.</p>}
    </div>
  );
}
