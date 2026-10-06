"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavTab = { href: string; label: string };

// useLayoutEffect warns during server rendering; the measurement only matters in the browser.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const tabClass = (active: boolean) =>
  `whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors ${
    active ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
  }`;

/**
 * Tab-style primary navigation. All tabs are always visible when they fit; the bar never scrolls. When the
 * screen is too narrow for every tab it turns into a "Menu" dropdown (like on phones). Before the browser has
 * measured anything, CSS decides: tabs from the `sm` breakpoint up, the menu below it.
 */
export function NavLinks({ tabs, label, menuLabel }: { tabs: NavTab[]; label: string; menuLabel: string }) {
  const pathname = usePathname();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLUListElement>(null);
  const [mode, setMode] = useState<"auto" | "tabs" | "menu">("auto");
  // The dropdown is open for one specific page; navigating to another page closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (value: boolean | ((v: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(open) : value;
    setOpenPath(next ? pathname : null);
  };

  const home = tabs[0]?.href;
  const isActive = (href: string) => (href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const current = tabs.find((tab) => isActive(tab.href));

  // Compare the width every tab needs (a hidden copy of the bar) with the room that is available.
  useIsoLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;
    const update = () => setMode(measure.offsetWidth > container.clientWidth ? "menu" : "tabs");
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [tabs]);

  // Close the dropdown on Escape and on a click elsewhere.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenPath(null);
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpenPath(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const barClass = mode === "menu" ? "hidden" : mode === "tabs" ? "flex" : "hidden sm:flex";
  const menuClass = mode === "menu" ? "block" : mode === "tabs" ? "hidden" : "sm:hidden";

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <nav aria-label={label} className={`-mb-px gap-1 ${barClass}`}>
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Hidden copy of the bar, only used to measure how much width the tabs need. */}
      <ul ref={measureRef} aria-hidden="true" className="pointer-events-none invisible absolute top-0 left-0 flex h-0 gap-1 overflow-hidden whitespace-nowrap">
        {tabs.map((tab) => (
          <li key={tab.href} className={tabClass(false)}>
            {tab.label}
          </li>
        ))}
      </ul>

      <div className={menuClass}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={menuId}
          className="flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm text-ink hover:text-accent"
        >
          <span>{menuLabel}</span>
          {current && <span className="text-ink-muted">· {current.label}</span>}
          <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
        {open && (
          <nav id={menuId} aria-label={label} className="absolute top-full left-0 z-40 mt-px flex min-w-56 flex-col rounded-b-lg border border-line bg-paper p-1 shadow-lg">
            {tabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-2.5 text-sm ${active ? "bg-accent/10 text-ink" : "text-ink-muted hover:bg-accent/5 hover:text-ink"}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
