"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageLightbox } from "@/components/chat/ImageLightbox";
import { formatFileSize } from "@/lib/file-validation";
import { formatDate } from "@/lib/utils";
import {
  Loader2,
  FileText,
  Video,
  Music,
  FolderOpen,
  ImageIcon,
} from "lucide-react";
import type { MessageFile } from "@/types";

export type SharedAttachment = MessageFile & { sender_name: string };

/** Fetch every attachment shared in a conversation (newest first). */
function useConversationFiles(conversationId: string) {
  const [files, setFiles] = useState<SharedAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/conversations/${conversationId}/files`);
        const data = await res.json();
        if (!cancelled && res.ok && data.data) {
          setFiles(data.data as SharedAttachment[]);
        }
      } catch (error) {
        console.error("Failed to load shared files:", error);
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  return { files, loading };
}

function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: typeof FileText;
  text: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Icon className="h-10 w-10 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

const FILE_TYPE_ICONS = {
  video: Video,
  audio: Music,
  file: FileText,
} as const;

/** Files tab — every non-photo attachment (documents, videos, audio). */
export function ConversationFiles({
  conversationId,
}: {
  conversationId: string;
}) {
  const { files, loading } = useConversationFiles(conversationId);
  const docs = files.filter((f) => f.file_type !== "image");

  if (loading) return <LoadingState />;
  if (docs.length === 0)
    return <EmptyState icon={FolderOpen} text="No files shared yet" />;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      <div className="chat-content-col space-y-1">
        {docs.map((file) => {
          const Icon =
            FILE_TYPE_ICONS[file.file_type as keyof typeof FILE_TYPE_ICONS] ||
            FileText;
          return (
            <button
              key={file.id}
              onClick={() => window.open(file.file_url, "_blank")}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-primary/[0.06]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {file.sender_name} · {formatDate(file.created_at)}
                </p>
              </div>
              {file.file_size != null && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatFileSize(file.file_size)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Photos tab — grid of every shared image, opens the fullscreen lightbox. */
export function ConversationPhotos({
  conversationId,
}: {
  conversationId: string;
}) {
  const { files, loading } = useConversationFiles(conversationId);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const photos = files.filter((f) => f.file_type === "image");

  if (loading) return <LoadingState />;
  if (photos.length === 0)
    return <EmptyState icon={ImageIcon} text="No photos shared yet" />;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      <div className="chat-content-col">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setLightboxIndex(i)}
              className="relative aspect-square overflow-hidden rounded-lg group"
              aria-label={`View ${photo.file_name}`}
            >
              <Image
                src={photo.file_url}
                alt={photo.file_name}
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                unoptimized
              />
            </button>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          files={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
