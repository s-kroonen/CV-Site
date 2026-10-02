import { ContactForm } from "@/components/sections/ContactForm";
import { RevealContactInfo } from "@/components/sections/RevealContactInfo";
import { FadeInView } from "@/components/motion/FadeInView";

export function ContactSection({
  publicEmail,
  hasPrivateContact,
  turnstileSiteKey,
}: {
  publicEmail: string;
  hasPrivateContact: boolean;
  turnstileSiteKey?: string;
}) {
  return (
    <FadeInView>
      <section id="contact" className="flex flex-col gap-6 py-16 pb-28">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">Contact</h2>
        <p className="max-w-md text-ink-muted">
          {publicEmail ? (
            <>
              For business inquiries, use the form below or email{" "}
              <a href={`mailto:${publicEmail}`} className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
                {publicEmail}
              </a>
              .
            </>
          ) : (
            "For business inquiries, use the form below."
          )}
        </p>
        {hasPrivateContact && <RevealContactInfo turnstileSiteKey={turnstileSiteKey} />}
        <ContactForm turnstileSiteKey={turnstileSiteKey} />
      </section>
    </FadeInView>
  );
}
