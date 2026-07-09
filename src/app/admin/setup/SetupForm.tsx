"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";

export function SetupForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!token) return;
    setStatus("working");
    setError(null);

    try {
      const optionsRes = await fetch("/api/admin/setup/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!optionsRes.ok) {
        const body = await optionsRes.json().catch(() => null);
        throw new Error(body?.error ?? "Could not start setup.");
      }
      const optionsJSON = await optionsRes.json();

      const attestation = await startRegistration({ optionsJSON });

      const verifyRes = await fetch("/api/admin/setup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, response: attestation }),
      });
      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => null);
        throw new Error(body?.error ?? "Setup failed.");
      }

      router.push("/admin");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Setup failed.");
    }
  }

  if (!token) {
    return <p className="opacity-70">This setup link is missing a token. Re-run the bootstrap script.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="opacity-70">
        This creates the one and only admin passkey for this site. Use your device&apos;s built-in
        authenticator (fingerprint, face, PIN, or a security key).
      </p>
      <button
        onClick={handleRegister}
        disabled={status === "working"}
        className="rounded-md bg-current px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {status === "working" ? "Waiting for passkey…" : "Create admin passkey"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
