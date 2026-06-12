"use client";

import { FileText, FileSpreadsheet, FileIcon, FileCode, Download, FileArchive, Music } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { formatFileSize } from "@/lib/file-validation";
import type { MessageFile } from "@/types";

interface FileCardProps {
  file: MessageFile;
  isOwn: boolean;
}

const FILE_ICONS: Record<string, { icon: typeof FileText; color: string }> = {
  "application/pdf": { icon: FileText, color: "#f87171" },
  "application/msword": { icon: FileText, color: "#60a5fa" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    icon: FileText,
    color: "#60a5fa",
  },
  "application/vnd.ms-excel": { icon: FileSpreadsheet, color: "#34d399" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    icon: FileSpreadsheet,
    color: "#34d399",
  },
  "application/vnd.ms-powerpoint": { icon: FileText, color: "#fb923c" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    icon: FileText,
    color: "#fb923c",
  },
  "application/zip": { icon: FileArchive, color: "#fbbf24" },
  "application/x-rar-compressed": { icon: FileArchive, color: "#fbbf24" },
  "application/vnd.rar": { icon: FileArchive, color: "#fbbf24" },
  "audio/mpeg": { icon: Music, color: "#f472b6" },
  "audio/wav": { icon: Music, color: "#f472b6" },
  "audio/ogg": { icon: Music, color: "#f472b6" },
};

// Code / plain-text extensions get a code icon (their MIME is unreliable).
const CODE_EXTENSIONS = new Set([
  "md", "markdown", "txt", "rtf", "csv", "tsv", "log",
  "json", "yaml", "yml", "toml", "xml", "ini",
  "js", "jsx", "mjs", "cjs", "ts", "tsx", "py", "pyi",
  "css", "scss", "less",
  "java", "kt", "go", "rs", "c", "cpp", "h", "cs", "rb", "php", "swift", "dart", "sql", "html", "svg",
]);

function getFileIconInfo(mimeType: string | null, fileName: string) {
  if (mimeType && FILE_ICONS[mimeType]) return FILE_ICONS[mimeType];
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (CODE_EXTENSIONS.has(ext)) return { icon: FileCode, color: "#22d3ee" };
  return { icon: FileIcon, color: "#94a3b8" };
}

export function FileCard({ file, isOwn }: FileCardProps) {
  const { icon: Icon, color } = getFileIconInfo(file.mime_type, file.file_name);

  const handleOpenFile = () => {
    window.open(file.file_url, "_blank");
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(file.file_url, "_blank");
    }
  };

  return (
    <div
      onClick={handleOpenFile}
      className="file-card-root"
      data-own={isOwn ? "" : undefined}
    >
      {/* File icon */}
      <div className="file-card-icon" data-own={isOwn ? "" : undefined}>
        <Icon style={{ color }} className="h-5 w-5" />
      </div>

      {/* File info */}
      <div className="file-card-info">
        <p className="file-card-name">{file.file_name}</p>
        {file.file_size && (
          <p className="file-card-size">{formatFileSize(file.file_size)}</p>
        )}
      </div>

      {/* Download button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleDownload}
            className="file-card-download"
            data-own={isOwn ? "" : undefined}
          >
            <Download className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Download</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
