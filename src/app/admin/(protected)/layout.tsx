import Link from "next/link";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <Link href="/admin" className="font-medium">
          Admin
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm underline underline-offset-4">
            View site
          </Link>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
