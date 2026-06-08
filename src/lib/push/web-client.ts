"use client";

/**
 * Browser-side Web Push helpers: register the service worker, subscribe with the
 * VAPID public key, and sync the subscription to the server. Used by the
 * useWebPush hook (subscribe) and the logout flow (unsubscribe).
 */

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Convert a base64url VAPID key into the Uint8Array the Push API expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Register the service worker (safe to call repeatedly). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.error("[push] SW registration failed:", e);
    return null;
  }
}

/**
 * Ensure this browser is subscribed and the subscription is synced to the
 * server. Idempotent: reuses an existing subscription if present. Returns true
 * once a subscription has been synced, false if not possible yet (unsupported,
 * permission not granted, or no VAPID key configured).
 */
export async function ensureWebPushSubscribed(): Promise<boolean> {
  if (!isSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast: the DOM lib types applicationServerKey as BufferSource over a
      // plain ArrayBuffer, but our Uint8Array is typed over ArrayBufferLike.
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform: "web", subscription: sub.toJSON() }),
  });

  return res.ok;
}

/** Remove this browser's subscription locally and on the server. */
export async function unsubscribeWebPush(): Promise<void> {
  if (!isSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
      keepalive: true,
    });
    await sub.unsubscribe();
  } catch (e) {
    console.error("[push] unsubscribe failed:", e);
  }
}
