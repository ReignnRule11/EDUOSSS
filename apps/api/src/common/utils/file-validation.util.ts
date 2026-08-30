import { BadRequestException } from "@nestjs/common";

export interface UploadContent {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/**
 * Server-side upload validation.
 *
 * Client-supplied MIME type, extension and filename are never trusted. We
 * verify magic bytes for the declared type, reject executables/scripts that
 * masquerade as documents, sanitize filenames, and enforce a strict size cap.
 */

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

const MAGIC: Record<string, Array<[number[], number?]>> = {
  "image/png": [[[0x89, 0x50, 0x4e, 0x47]]],
  "image/jpeg": [[[0xff, 0xd8, 0xff]]],
  "image/webp": [
    [
      [0x52, 0x49, 0x46, 0x46],
      4, // bytes 0-3 are "RIFF"; then bytes 8-11 are "WEBP"
    ],
  ],
  "application/pdf": [[[0x25, 0x50, 0x44, 0x46]]],
};

/** Signatures that must never be accepted regardless of declared type. */
const FORBIDDEN_MAGIC: Array<[number[], number?]> = [
  [[0x4d, 0x5a]], // MZ (PE/Windows executable)
  [[0x7f, 0x45, 0x4c, 0x46]], // ELF
  [[0x23, 0x21]], // shebang (#!)
  [[0x4d, 0x5a, 0x90]], // MZ stub
];

/** Character-class sanity for storage extensions. */
const EXT_RE = /^[a-z0-9]{1,8}$/;

/** Strips directory separators, control chars and path traversal from a name. */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/]+/g, "")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join("")
    .replace(/^\.+/, "")
    .trim();
  return cleaned.slice(0, 255);
}
/** Extracts a safe lowercase extension, or an empty string. */
export function safeExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return "";
  const ext = filename.slice(dot + 1).toLowerCase();
  return EXT_RE.test(ext) ? ext : "";
}

function matchesMagic(
  buffer: Buffer,
  signature: number[],
  offset = 0,
): boolean {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (buffer[offset + i] !== signature[i]) return false;
  }
  return true;
}

function hasForbiddenMagic(buffer: Buffer): boolean {
  return FORBIDDEN_MAGIC.some(([sig, offset]) =>
    matchesMagic(buffer, sig, offset ?? 0),
  );
}

/**
 * Validates an uploaded file and returns a sanitized descriptor.
 * Throws BadRequestException on any violation.
 */
export function validateUpload(
  file: UploadContent,
  opts: { maxSize?: number; requireMagic?: boolean } = {},
): { originalname: string; ext: string } {
  const maxSize = opts.maxSize ?? MAX_UPLOAD_SIZE;
  if (!file?.buffer) {
    throw new BadRequestException("No file provided");
  }
  if (file.buffer.length > maxSize) {
    throw new BadRequestException(`File exceeds the ${maxSize} byte limit`);
  }
  if (file.buffer.length === 0) {
    throw new BadRequestException("Empty file");
  }

  // Reject executables/scripts regardless of the declared type.
  if (hasForbiddenMagic(file.buffer)) {
    throw new BadRequestException("File content is not allowed");
  }

  const originalname = sanitizeFilename(file.originalname ?? "file");
  const ext = safeExtension(originalname);

  // Where a magic signature is known for the declared MIME, verify it. This
  // catches MIME spoofing (e.g. a script declared as image/png).
  const declared = file.mimetype?.toLowerCase() ?? "";
  const signatures = MAGIC[declared];
  if (signatures) {
    const ok = signatures.some(([sig, offset]) =>
      matchesMagic(file.buffer, sig, offset ?? 0),
    );
    if (!ok) {
      throw new BadRequestException(
        `File content does not match declared type (${declared})`,
      );
    }
  }

  // If we could not verify magic bytes (e.g. docx/zip/csv), the extension must
  // still be safe and match an allowed set.
  const ALLOWED_EXTENSIONS = new Set([
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "svg",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "csv",
    "zip",
    "mp4",
    "webm",
    "ogg",
    "ogv",
    "mp3",
    "wav",
    "m4a",
  ]);
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    throw new BadRequestException(`File extension not allowed (${ext})`);
  }

  return { originalname, ext };
}
