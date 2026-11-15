import JSZip from "jszip";

// Safety limits for the public upload (build step 4). Pure logic, no network.

export const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB, as in the spec (Vercel also caps request bodies at ~4.5 MB)
export const MAX_UNZIPPED_BYTES = 120 * 1024 * 1024; // guards against "zip bombs"
export const MAX_ZIP_ENTRIES = 400;

export type UploadCheck = { ok: true } | { ok: false; status: number; error: string };

/** Quick checks on a file's name, size and first bytes - before anything is parsed. */
export function checkUploadBasics(name: string, bytes: Uint8Array): UploadCheck {
  if (!/\.xlsx$/i.test(name)) return { ok: false, status: 415, error: "Please upload an Excel workbook ending in .xlsx." };
  if (bytes.length === 0) return { ok: false, status: 400, error: "The file is empty." };
  if (bytes.length > MAX_FILE_BYTES) return { ok: false, status: 413, error: "The file is larger than 4 MB." };
  // .xlsx files are zip archives: they start with "PK\x03\x04".
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04)) {
    return { ok: false, status: 415, error: "That does not look like an .xlsx workbook." };
  }
  return { ok: true };
}

/** Looks inside the zip (without unpacking it) and refuses absurdly large contents. */
export async function checkZipSize(bytes: Uint8Array): Promise<UploadCheck> {
  try {
    const zip = await JSZip.loadAsync(bytes);
    const entries = Object.values(zip.files);
    if (entries.length > MAX_ZIP_ENTRIES) return { ok: false, status: 413, error: "The workbook has too many parts to process." };
    let total = 0;
    for (const e of entries) total += (e as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    if (total > MAX_UNZIPPED_BYTES) return { ok: false, status: 413, error: "The workbook is too large once unpacked." };
    return { ok: true };
  } catch {
    return { ok: false, status: 415, error: "That does not look like a valid .xlsx workbook." };
  }
}

// ---------------------------------------------------------------------------
// Rate limiting. In memory, so it is best-effort on serverless hosting (each
// server instance keeps its own counts) - it stops casual repeated use, but is
// not a hard cap. The real spending cap is the monthly limit set in the
// Anthropic Console.
// ---------------------------------------------------------------------------

export function createLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    take(key: string, now = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
      return { ok: true };
    },
  };
}
