"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowLeft, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { MessageFile } from "@/types";

interface ImageLightboxProps {
  files: MessageFile[];
  initialIndex: number;
  onClose: () => void;
}

export function ImageLightbox({ files, initialIndex, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const currentFile = files[currentIndex];
  const isMultiple = files.length > 1;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (isMultiple) goToPrev();
          break;
        case "ArrowRight":
          if (isMultiple) goToNext();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % files.length);
    resetZoom();
  }, [files.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
    resetZoom();
  }, [files.length]);

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentFile.file_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentFile.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(currentFile.file_url, "_blank");
    }
  };

  // Drag to pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({
      x: posStart.current.x + dx,
      y: posStart.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        <p className="text-sm text-white/70 truncate max-w-[200px]">
          {currentFile.file_name}
        </p>

        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30"
            disabled={zoom <= 1}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={handleZoomIn}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30"
            disabled={zoom >= 4}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5 text-white" />
          </button>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <button
            onClick={handleDownload}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Download"
          >
            <Download className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        {/* Left arrow */}
        {isMultiple && (
          <button
            onClick={goToPrev}
            className="absolute left-4 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}

        {/* Image */}
        <div
          className="transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
          }}
        >
          <Image
            src={currentFile.file_url}
            alt={currentFile.file_name}
            width={800}
            height={600}
            className="max-h-[calc(100vh-180px)] w-auto object-contain pointer-events-none"
            unoptimized
            priority
          />
        </div>

        {/* Right arrow */}
        {isMultiple && (
          <button
            onClick={goToNext}
            className="absolute right-4 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      {/* Thumbnail strip (multi-image only) */}
      {isMultiple && (
        <div className="px-4 py-3 bg-black/50">
          <div className="flex items-center justify-center gap-2 overflow-x-auto">
            {files.map((file, i) => (
              <button
                key={file.id}
                onClick={() => {
                  setCurrentIndex(i);
                  resetZoom();
                }}
                className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 transition-all duration-200 ${
                  i === currentIndex
                    ? "ring-2 ring-primary scale-110"
                    : "opacity-50 hover:opacity-80"
                }`}
              >
                <Image
                  src={file.file_url}
                  alt={file.file_name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
