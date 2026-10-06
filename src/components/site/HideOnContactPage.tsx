"use client";

import { usePathname } from "next/navigation";

/** Renders its children everywhere except on the /contact page (where the same form is the page itself). */
export function HideOnContactPage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (/^\/(en|nl)\/contact\/?$/.test(pathname)) return null;
  return <>{children}</>;
}
