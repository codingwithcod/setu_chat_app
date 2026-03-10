"use client";

import { useState, useEffect } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { WifiOff, Wifi, X } from "lucide-react";

/**
 * A slim, non-intrusive connectivity banner.
 *
 * - Offline  → persistent amber/red bar (dismissible by user)
 * - Reconnected → green bar that auto-hides after 3s
 * - Online  → hidden
 */
export function NetworkBanner() {
  const { status, isOffline, isReconnected } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed when going offline again
  useEffect(() => {
    if (isOffline) {
      setDismissed(false);
    }
  }, [isOffline]);

  // Don't render anything when fully online
  if (status === "online") return null;

  // User manually dismissed the offline banner
  if (dismissed && isOffline) return null;

  return (
    <div
      className={`network-banner ${
        isOffline ? "network-banner--offline" : "network-banner--reconnected"
      }`}
    >
      <div className="network-banner__content">
        {/* Pulsing indicator dot */}
        <span
          className={`network-banner__dot ${
            isOffline ? "network-banner__dot--offline" : "network-banner__dot--online"
          }`}
        />

        {/* Icon */}
        {isOffline ? (
          <WifiOff className="network-banner__icon" />
        ) : (
          <Wifi className="network-banner__icon" />
        )}

        {/* Text */}
        <span className="network-banner__text">
          {isOffline
            ? "No internet connection"
            : "Back online"}
        </span>

        {/* Subtext — only for offline */}
        {isOffline && (
          <span className="network-banner__subtext">
            Messages will be sent when you reconnect
          </span>
        )}
      </div>

      {/* Dismiss button — only for offline banner */}
      {isOffline && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setDismissed(true)}
              className="network-banner__dismiss"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Hide banner</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
