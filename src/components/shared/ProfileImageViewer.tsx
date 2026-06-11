"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowLeft, ZoomIn, ZoomOut } from "lucide-react";

interface ProfileImageViewerProps {
  url: string;
  name: string;
  onClose: () => void;
}

/**
 * Fullscreen viewer for profile pictures with zoom in/out and drag-to-pan.
 * Rendered via a portal to <body> — ancestors with backdrop-filter (e.g. the
 * glass chat header) create a containing block that would otherwise trap
 * position:fixed children inside them.
 */
export function ProfileImageViewer({
  url,
  name,
  onClose,
}: ProfileImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
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
  }, []);

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

  return createPortal(
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

        <p className="text-sm text-white/70 truncate max-w-[200px]">{name}</p>

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
        </div>
      </div>

      {/* Image area — click on the dark backdrop closes */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
          if (e.target === e.currentTarget && zoom <= 1) onClose();
        }}
        style={{
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        <div
          className="transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
          }}
        >
          <Image
            src={url}
            alt={name}
            width={800}
            height={800}
            className="max-h-[calc(100vh-120px)] w-auto object-contain pointer-events-none"
            unoptimized
            priority
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
