/* Setu Chat — Service Worker for Web Push background notifications.
 *
 * Lifecycle: skipWaiting + clients.claim so an updated worker activates fast.
 *
 * Dedup rule: if the app is open in ANY window (focused OR backgrounded), the
 * page itself shows the in-app notification / plays the sound, so the worker
 * stays silent to avoid a double toast. The worker only shows an OS toast when
 * the app is fully closed (no window clients) — that's the case the page can't
 * handle on its own. When focused on the same chat you get sound only.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "New message";
  const conversationId = data.conversationId || null;
  const url =
    data.url || (conversationId ? `/chat/${conversationId}` : "/");

  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/setu-logo.png",
    badge: data.badge || "/icons/setu-badge.png",
    tag: conversationId || "setu-chat",
    renotify: true,
    data: { url, conversationId },
  };

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // App open anywhere → the page handles it. Only notify when closed.
        if (clients.length > 0) return undefined;
        return self.registration.showNotification(title, options);
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client && url) client.navigate(url);
            return undefined;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
        return undefined;
      })
  );
});
