"use client";

import { useState } from "react";
import Image from "next/image";
import type { MessageFile } from "@/types";

interface ImageCollageProps {
  files: MessageFile[];
  onImageClick: (index: number) => void;
}

export function ImageCollage({ files, onImageClick }: ImageCollageProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const count = files.length;

  const handleLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  };

  if (count === 0) return null;

  // Single image
  if (count === 1) {
    return (
      <div
        className="relative rounded-lg overflow-hidden cursor-pointer group max-w-[400px]"
        onClick={() => onImageClick(0)}
      >
        <Image
          src={files[0].file_url}
          alt={files[0].file_name}
          width={400}
          height={300}
          className={`w-full h-auto max-h-80 object-cover transition-opacity duration-200 group-hover:opacity-90 ${
            loadedImages.has(0) ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => handleLoad(0)}
          unoptimized
        />
        {!loadedImages.has(0) && (
          <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
        )}
      </div>
    );
  }

  // 2 images
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden max-w-[400px]">
        {files.slice(0, 2).map((file, i) => (
          <div
            key={file.id}
            className="relative aspect-square cursor-pointer group"
            onClick={() => onImageClick(i)}
          >
            <Image
              src={file.file_url}
              alt={file.file_name}
              fill
              className="object-cover transition-opacity duration-200 group-hover:opacity-90"
              onLoad={() => handleLoad(i)}
              unoptimized
            />
            {!loadedImages.has(i) && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
          </div>
        ))}
      </div>
    );
  }

  // 3 images: 1 large left + 2 stacked right
  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden max-w-[400px]">
        <div
          className="relative row-span-2 cursor-pointer group"
          onClick={() => onImageClick(0)}
        >
          <Image
            src={files[0].file_url}
            alt={files[0].file_name}
            fill
            className="object-cover transition-opacity duration-200 group-hover:opacity-90"
            onLoad={() => handleLoad(0)}
            unoptimized
          />
          {!loadedImages.has(0) && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
        </div>
        {files.slice(1, 3).map((file, i) => (
          <div
            key={file.id}
            className="relative aspect-square cursor-pointer group"
            onClick={() => onImageClick(i + 1)}
          >
            <Image
              src={file.file_url}
              alt={file.file_name}
              fill
              className="object-cover transition-opacity duration-200 group-hover:opacity-90"
              onLoad={() => handleLoad(i + 1)}
              unoptimized
            />
            {!loadedImages.has(i + 1) && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
          </div>
        ))}
      </div>
    );
  }

  // 4+ images: 2x2 grid, last cell shows +N if more than 4
  const displayFiles = files.slice(0, 4);
  const extraCount = count - 4;

  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden max-w-[400px]">
      {displayFiles.map((file, i) => (
        <div
          key={file.id}
          className="relative aspect-square cursor-pointer group"
          onClick={() => onImageClick(i)}
        >
          <Image
            src={file.file_url}
            alt={file.file_name}
            fill
            className="object-cover transition-opacity duration-200 group-hover:opacity-90"
            onLoad={() => handleLoad(i)}
            unoptimized
          />
          {!loadedImages.has(i) && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}

          {/* +N overlay on 4th image */}
          {i === 3 && extraCount > 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                +{extraCount}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
