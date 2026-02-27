"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  direction?: "up" | "down";
}

const BOTTOM_THRESHOLD = 150; // px from bottom to consider "at bottom"

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  direction = "up",
}: UseInfiniteScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < BOTTOM_THRESHOLD;
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    // Update isAtBottom state
    setIsAtBottom(checkIfAtBottom());

    if (isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    if (direction === "up") {
      // Load more when scrolled to top
      if (scrollTop < 100) {
        onLoadMore();
      }
    } else {
      // Load more when scrolled to bottom
      if (scrollHeight - scrollTop - clientHeight < 100) {
        onLoadMore();
      }
    }
  }, [onLoadMore, hasMore, isLoading, direction, checkIfAtBottom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (initialLoad && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setInitialLoad(false);
    }
  }, [initialLoad]);

  const scrollToBottom = useCallback((smooth = false) => {
    if (containerRef.current) {
      if (smooth) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      } else {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
      // Immediately set isAtBottom since we're scrolling there
      setIsAtBottom(true);
    }
  }, []);

  return { containerRef, scrollToBottom, isAtBottom, checkIfAtBottom };
}
