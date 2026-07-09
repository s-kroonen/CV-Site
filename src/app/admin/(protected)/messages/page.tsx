import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { MarkReadButton } from "./MarkReadButton";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Contact messages</h1>
      <ul className="flex flex-col gap-4">
        {messages.map((message) => (
          <li
            key={message.id}
            className={`rounded-md border px-4 py-3 ${message.read ? "border-current/10 opacity-70" : "border-current/30"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {message.name} · <a href={`mailto:${message.email}`} className="underline underline-offset-4">{message.email}</a>
              </span>
              <span className="text-xs opacity-60">{message.createdAt.toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap opacity-80">{message.message}</p>
            <div className="mt-3 flex gap-4">
              <MarkReadButton id={message.id} read={message.read} />
              <DeleteButton endpoint={`/api/admin/messages/${message.id}`} confirmText="Delete this message?" />
            </div>
          </li>
        ))}
        {messages.length === 0 && <p className="opacity-60">No messages yet.</p>}
      </ul>
    </main>
  );
}
