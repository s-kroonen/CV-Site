"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setStatus("working");
    setError(null);

    try {
      const optionsRes = await fetch("/api/admin/login/options", { method: "POST" });
      if (!optionsRes.ok) {
        const body = await optionsRes.json().catch(() => null);
        throw new Error(body?.error ?? "Could not start login.");
      }
      const optionsJSON = await optionsRes.json();

      const assertion = await startAuthentication({ optionsJSON });

      const verifyRes = await fetch("/api/admin/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      });
      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => null);
        throw new Error(body?.error ?? "Login failed.");
      }

      router.push("/admin");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-semibold">Admin login</h1>
      <button
        onClick={handleLogin}
        disabled={status === "working"}
        className="rounded-md bg-current px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {status === "working" ? "Waiting for passkey…" : "Sign in with passkey"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </main>
  );
}
