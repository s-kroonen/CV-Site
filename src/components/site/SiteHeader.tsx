import Link from "next/link";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavLinks, type NavTab } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({
  lang,
  name,
  avatarPath,
  tabs,
}: {
  lang: Locale;
  name: string;
  avatarPath?: string | null;
  tabs: NavTab[];
}) {
  const t = getDictionary(lang);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-6">
        <Link
          href={localizedPath(lang, "/")}
          className="flex shrink-0 items-center gap-2 py-3 font-[family-name:var(--font-display)] text-lg font-medium"
        >
          {avatarPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPath} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
          )}
          <span className="hidden sm:inline">{name}</span>
        </Link>
        <div className="min-w-0 flex-1">
          <NavLinks tabs={tabs} label={t.nav.label} />
        </div>
        <LanguageSwitcher lang={lang} label={t.common.language} />
        <ThemeToggle labels={{ toLight: t.common.switchToLight, toDark: t.common.switchToDark }} />
      </div>
    </header>
  );
}
