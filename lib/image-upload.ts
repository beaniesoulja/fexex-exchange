const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/]+=*)$/i;

/**
 * The data-URI prefix a client sends is just a string it typed — it proves
 * nothing about what the bytes after it actually are. A request can claim
 * "image/jpeg" while the payload is an HTML/SVG/script polyglot. This checks
 * the real file signature (magic bytes) of the decoded content instead of
 * trusting the declared type, so only genuine JPEG/PNG/WebP bytes are ever
 * accepted and stored.
 */
export function validateImageDataUrl(value: unknown, maxBytes: number): string | null {
  if (typeof value !== "string") return null;

  const match = DATA_URL_PATTERN.exec(value);
  if (!match) return null;

  let bytes: Buffer;
  try {
    bytes = Buffer.from(match[2], "base64");
  } catch {
    return null;
  }

  if (bytes.length === 0 || bytes.length > maxBytes) return null;

  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte);
  const isWebp = bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";

  return isJpeg || isPng || isWebp ? value : null;
}
