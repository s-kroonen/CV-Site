import { ContactForm } from "@/components/sections/ContactForm";
import { RevealContactInfo } from "@/components/sections/RevealContactInfo";
import { SectionHeading } from "@/components/site/SectionHeading";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import { FadeInView } from "@/components/motion/FadeInView";

export function ContactSection({
  publicEmail,
  hasPrivateContact,
  turnstileSiteKey,
  asPage = false,
  lang,
}: {
  publicEmail: string;
  hasPrivateContact: boolean;
  turnstileSiteKey?: string;
  asPage?: boolean;
  lang: Locale;
}) {
  const t = getDictionary(lang);
  return (
    <FadeInView>
      <section id="contact" className="flex flex-col gap-6 py-16 pb-28">
        <SectionHeading title={t.sections.contact} asPage={asPage} />
        <p className="max-w-md text-ink-muted">
          {publicEmail ? (
            <>
              {t.contact.introWithEmail}{" "}
              <a href={`mailto:${publicEmail}`} className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
                {publicEmail}
              </a>
              .
            </>
          ) : (
            t.contact.introNoEmail
          )}
        </p>
        {hasPrivateContact && <RevealContactInfo turnstileSiteKey={turnstileSiteKey} />}
        <ContactForm turnstileSiteKey={turnstileSiteKey} />
      </section>
    </FadeInView>
  );
}
