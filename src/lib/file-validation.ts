// ============================================
// File Validation for Setu Chat Application
// ============================================

// Allowed MIME types for each category
// Raster images only — safe to render inline via <img>. SVG is deliberately
// excluded: it can carry <script> and is handled as a neutralised download
// instead (see CODE_TEXT_EXTENSIONS / safeUploadContentType).
const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
];

const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-rar-compressed",
  "application/vnd.rar",
];

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const AUDIO_TYPES = [
  "audio/mpeg",       // .mp3
  "audio/wav",        // .wav
  "audio/ogg",        // .ogg
  "audio/webm",       // .webm audio
  "audio/aac",        // .aac
  "audio/mp4",        // .m4a (sometimes reported as audio/mp4)
  "audio/x-m4a",      // .m4a (alternative)
  "audio/flac",       // .flac
  "audio/x-flac",     // .flac (alternative)
];

const CHAT_FILE_TYPES = [
  ...IMAGE_TYPES,
  ...DOCUMENT_TYPES,
  ...VIDEO_TYPES,
  ...AUDIO_TYPES,
];

// Code / plain-text source files accepted as downloadable attachments.
// Keyed by EXTENSION because their MIME types are unreliable: .ts reports as
// video/mp2t, and .md / .py / .json often arrive with an empty or
// application/octet-stream type. `html` is intentionally included but is
// neutralised on upload (stored as text/plain) so embedded scripts can never
// run — see safeUploadContentType().
const CODE_TEXT_EXTENSIONS = [
  // docs / markup
  "md", "markdown", "txt", "rtf", "csv", "tsv", "log",
  // data / config
  "json", "yaml", "yml", "toml", "xml", "ini",
  // javascript / typescript
  "js", "jsx", "mjs", "cjs", "ts", "tsx",
  // python
  "py", "pyi",
  // web styles
  "css", "scss", "less",
  // other languages
  "java", "kt", "go", "rs", "c", "cpp", "h", "cs", "rb", "php", "swift", "dart", "sql",
  // markup that can carry scripts — accepted but stored as text/plain so it
  // can't execute (shown as a download card, never rendered inline)
  "html", "svg",
];

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** True if `name` is one of the accepted code / plain-text source files. */
export function isCodeTextFile(name: string): boolean {
  return CODE_TEXT_EXTENSIONS.includes(getExtension(name));
}

// MIME types we are willing to serve as-is from the PUBLIC bucket: raster
// images, audio, video and document/archive types. None of these execute
// scripts when opened in a browser. This is an explicit allowlist — anything
// not on it is neutralised below.
const SAFE_TO_SERVE_MIME = new Set<string>([
  ...IMAGE_TYPES,
  ...VIDEO_TYPES,
  ...AUDIO_TYPES,
  ...DOCUMENT_TYPES,
]);

/**
 * Content-Type the object should be STORED with in Supabase Storage.
 *
 * Default-deny stored-XSS guard: only known inline-safe types keep their real
 * MIME. EVERYTHING else — SVG, HTML, XML, code/text, unknown binaries — is
 * forced to `text/plain` so that opening the public URL in a browser renders it
 * as plain text and never executes embedded markup/script.
 */
export function safeUploadContentType(
  name: string,
  mime: string | null | undefined
): string {
  if (isCodeTextFile(name)) return "text/plain; charset=utf-8";
  if (mime && SAFE_TO_SERVE_MIME.has(mime)) return mime;
  return "text/plain; charset=utf-8";
}

// Size limit from env (in MB), default 5 MB
function getMaxChatFileSizeBytes(): number {
  const envMB = process.env.NEXT_PUBLIC_MAX_CHAT_FILE_SIZE_MB;
  const mb = envMB ? parseFloat(envMB) : 5;
  return mb * 1024 * 1024;
}

// Size limits in bytes
const SIZE_LIMITS = {
  avatar: 1 * 1024 * 1024, // 1 MB — fixed
};

type UploadContext = "avatar" | "chatFile";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file before upload.
 * Returns { valid: true } or { valid: false, error: "..." }
 */
export function validateFile(
  file: File,
  context: UploadContext
): ValidationResult {
  // Size check
  const maxSize =
    context === "avatar" ? SIZE_LIMITS.avatar : getMaxChatFileSizeBytes();

  if (file.size > maxSize) {
    const limitMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File is too large. Maximum size is ${limitMB} MB`,
    };
  }

  // Type check
  const allowedTypes = context === "avatar" ? IMAGE_TYPES : CHAT_FILE_TYPES;

  if (!allowedTypes.includes(file.type)) {
    // Code / plain-text source files validate by extension, since their MIME
    // type is unreliable (e.g. .ts → video/mp2t, .md / .py often empty).
    if (context === "chatFile" && isCodeTextFile(file.name)) {
      return { valid: true };
    }
    if (context === "avatar") {
      return {
        valid: false,
        error: "Only image files (JPEG, PNG, GIF, WebP) are allowed",
      };
    }
    return {
      valid: false,
      error:
        "This file type is not supported. Allowed: images, videos, audio, PDF, Word, Excel, PowerPoint, ZIP/RAR",
    };
  }

  return { valid: true };
}

/**
 * Determine file category from a File object
 */
export function getFileCategory(
  file: File
): "image" | "video" | "audio" | "file" {
  // Code/text files always render as a downloadable file card (never inline),
  // regardless of whatever MIME the browser guessed for them.
  if (isCodeTextFile(file.name)) return "file";
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (VIDEO_TYPES.includes(file.type)) return "video";
  if (AUDIO_TYPES.includes(file.type)) return "audio";
  return "file";
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
