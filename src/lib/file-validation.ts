// ============================================
// File Validation for Setu Chat Application
// ============================================

// Allowed MIME types for each category
const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
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
