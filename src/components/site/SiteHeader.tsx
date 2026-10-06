import { type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavLinks, type NavTab } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

/** Tabs on the left (they turn into a dropdown when they do not fit), language and theme on the right. */
export function SiteHeader({ lang, tabs }: { lang: Locale; tabs: NavTab[] }) {
  const t = getDictionary(lang);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-6">
        <NavLinks tabs={tabs} label={t.nav.label} menuLabel={t.nav.menu} />
        <div className="flex shrink-0 items-center gap-1">
          <LanguageSwitcher lang={lang} label={t.common.language} />
          <ThemeToggle labels={{ toLight: t.common.switchToLight, toDark: t.common.switchToDark }} />
        </div>
      </div>
    </header>
  );
}
