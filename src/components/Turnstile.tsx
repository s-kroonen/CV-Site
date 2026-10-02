"use client";

import { useRef, useState } from "react";
import Script from "next/script";
import { useLocale } from "@/components/i18n/LocaleProvider";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ) => string;
    };
  }
}

/**
 * Cloudflare Turnstile widget. `siteKey` comes from the server (see
 * lib/turnstile-config.ts) so it's a runtime value, not baked into the build.
 * Failures (blocked script, bad key/hostname) are shown instead of rendering
 * nothing.
 */
export function Turnstile({ siteKey, onVerify }: { siteKey: string; onVerify: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const { t } = useLocale();

  function renderWidget() {
    if (renderedRef.current || !containerRef.current || !window.turnstile) return;
    renderedRef.current = true;
    window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      "error-callback": () => setFailed(true),
    });
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        onLoad={renderWidget}
        onReady={renderWidget}
        onError={() => setFailed(true)}
      />
      <div ref={containerRef} />
      {failed && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t.contact.humanCheckFailed}
        </p>
      )}
    </>
  );
}
