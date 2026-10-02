import path from "node:path";
import sharp from "sharp";

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

export type ProcessedImage = { full: Buffer; thumb: Buffer; width: number; height: number };

const FULL_MAX = 2000;
const THUMB_MAX = 640;

/**
 * Normalises an uploaded image: applies EXIF orientation, strips all metadata
 * (sharp drops EXIF/GPS unless asked to keep it), caps the size and re-encodes
 * to WebP, plus a small thumbnail for cards. Re-encoding also means a file
 * that merely *looks* like an image by its magic bytes can't be served as-is.
 * Animated GIF/WebP stay animated in the full size; the thumbnail is a still.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const limits = { limitInputPixels: 50_000_000 };
  const full = await sharp(input, { ...limits, animated: true })
    .rotate()
    .resize({ width: FULL_MAX, height: FULL_MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await sharp(input, limits)
    .rotate()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  // For animated images sharp reports the whole strip height; use page height when present.
  const height = full.info.pageHeight ?? full.info.height;
  return { full: full.data, thumb, width: full.info.width, height };
}
