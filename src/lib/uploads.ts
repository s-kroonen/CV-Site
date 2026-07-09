import path from "node:path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

export function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data", "uploads");
}

const SIGNATURES: Array<{ ext: string; mime: string; matches: (buf: Buffer) => boolean }> = [
  {
    ext: "png",
    mime: "image/png",
    matches: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  {
    ext: "jpg",
    mime: "image/jpeg",
    matches: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    ext: "webp",
    mime: "image/webp",
    matches: (buf) =>
      buf.length >= 12 &&
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    ext: "gif",
    mime: "image/gif",
    matches: (buf) => buf.length >= 6 && ["GIF87a", "GIF89a"].includes(buf.subarray(0, 6).toString("ascii")),
  },
];

export function sniffImageType(buf: Buffer): { ext: string; mime: string } | null {
  const match = SIGNATURES.find((sig) => sig.matches(buf));
  return match ? { ext: match.ext, mime: match.mime } : null;
}
