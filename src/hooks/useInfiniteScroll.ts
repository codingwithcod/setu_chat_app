"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  direction?: "up" | "down";
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  direction = "up",
}: UseInfiniteScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || isLoading || !hasMore) return;

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
  }, [onLoadMore, hasMore, isLoading, direction]);

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

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  return { containerRef, scrollToBottom };
}
