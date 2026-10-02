import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";

// Admin and OAuth pages: English only, never indexed.
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>;
}
