"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkReadButton({ id, read }: { id: string; read: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    await fetch(`/api/admin/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: !read }),
    });
    router.refresh();
  }

  return (
    <button onClick={toggle} disabled={pending} className="text-sm underline underline-offset-4 disabled:opacity-50">
      {read ? "Mark unread" : "Mark read"}
    </button>
  );
}
