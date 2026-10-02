import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <Link href="/admin" className="font-medium">
          Admin
        </Link>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
