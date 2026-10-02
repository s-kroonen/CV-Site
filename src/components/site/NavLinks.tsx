"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavTab = { href: string; label: string };

/** Tab-style primary navigation. Scrolls sideways on narrow screens instead of wrapping. */
export function NavLinks({ tabs, label }: { tabs: NavTab[]; label: string }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  // On narrow screens the tab bar scrolls; keep the current tab in view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  const home = tabs[0]?.href;
  const isActive = (href: string) => (href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label={label} className="-mb-px flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            ref={active ? activeRef : undefined}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors ${
              active ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
