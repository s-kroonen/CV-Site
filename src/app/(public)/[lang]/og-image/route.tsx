import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { resolveLang } from "@/lib/i18n/params";

// Generated social preview card (used by every page that has no image of its own).
// A plain route rather than Next's opengraph-image file convention: the convention
// injects its own og:image tag built from the request host, not from SITE_URL.
export const dynamic = "force-dynamic";
const size = { width: 1200, height: 630 };

export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const lang = await resolveLang(params);
  const profile = await getProfile(lang);
  const name = profile?.name || "CV";
  const line = [profile?.tagline, profile?.location].filter(Boolean).join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #f6f1e7 0%, #efdcc8 100%)",
          color: "#211d1a",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(179,80,42,0.35), rgba(179,80,42,0))",
          }}
        />
        <div style={{ fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: "#b3502a" }}>{getDictionary(lang).meta.role}</div>
        <div style={{ fontSize: 112, fontWeight: 700, lineHeight: 1.05, marginTop: 24 }}>{name}</div>
        {line && <div style={{ fontSize: 40, marginTop: 28, color: "#57504a" }}>{line}</div>}
      </div>
    ),
    size,
  );
}
