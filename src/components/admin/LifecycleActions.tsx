"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Entity, LifecycleAction } from "@/lib/lifecycle";

const linkBtn = "text-sm underline underline-offset-4 disabled:opacity-50";

async function send(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/lifecycle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export function LifecycleButton({
  entity,
  id,
  action,
  label,
  confirmText,
  danger,
}: {
  entity: Entity;
  id: string;
  action: LifecycleAction;
  label: string;
  confirmText?: string;
  danger?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(true);
    const ok = await send({ entity, id, action });
    setPending(false);
    if (!ok) window.alert("That didn't work - the item may already be gone.");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={`${linkBtn} ${danger ? "text-red-600 dark:text-red-400" : ""}`}
    >
      {label}
    </button>
  );
}

export function EmptyTrashButton({ entity, count }: { entity: Entity; count: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (count === 0) return null;

  async function run() {
    if (!window.confirm(`Permanently delete ${count} item${count === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setPending(true);
    await send({ entity, action: "empty-trash" });
    setPending(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={run} disabled={pending} className={`${linkBtn} text-red-600 dark:text-red-400`}>
      Empty trash
    </button>
  );
}
