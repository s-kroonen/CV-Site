import { ContactSection } from "@/components/sections/ContactSection";
import { HideOnContactPage } from "@/components/site/HideOnContactPage";
import { asSocialLinks } from "@/lib/json";
import { fmt, getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { ProfileModel as Profile } from "@/generated/prisma/models";

/**
 * Footer on every public page: the contact form (and the reveal button for private details), then a row with
 * links, the copyright line and the last-updated date. Add further footer blocks here.
 */
export function SiteFooter({
  lang,
  profile,
  hasPrivateContact,
  turnstileSiteKey,
  updatedLabel,
}: {
  lang: Locale;
  profile: Profile | null;
  hasPrivateContact: boolean;
  turnstileSiteKey?: string;
  updatedLabel: string | null;
}) {
  const t = getDictionary(lang);
  const links = profile ? asSocialLinks(profile.socialLinks) : [];
  return (
    <footer className="mt-8 border-t border-line">
      <div className="mx-auto w-full max-w-3xl px-6">
        {/* The /contact page shows the same form as its main content, so it is left out of the footer there. */}
        <HideOnContactPage>
          <ContactSection lang={lang} publicEmail={profile?.publicEmail ?? ""} hasPrivateContact={hasPrivateContact} turnstileSiteKey={turnstileSiteKey} />
        </HideOnContactPage>
        <div className="flex flex-col items-center gap-2 border-t border-line py-8 text-center text-xs text-ink-muted">
          {links.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {links.map((link) => (
                <li key={link.url}>
                  <a href={link.url} rel="me noopener" className="underline decoration-line underline-offset-4 hover:text-ink">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {profile?.name ? <span>{fmt(t.common.footer, { year: new Date().getFullYear(), name: profile.name })}</span> : null}
          {updatedLabel && <span>{updatedLabel}</span>}
        </div>
      </div>
    </footer>
  );
}
