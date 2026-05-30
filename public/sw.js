// Lightweight offline service worker for Kas Harian Rumah.
// Strategy: network-first for navigations (fresh HTML when online, cached shell
// when offline); cache-first for same-origin static assets + the SQLite wasm;
// cache-then-network for cross-origin fonts.

const CACHE = "kas-harian-v2";
const PRECACHE = [
  "/",
  "/login",
  "/manifest.webmanifest",
  "/sql-wasm.wasm",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Navigations: network-first, fall back to cached page then app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Same-origin assets + wasm: cache-first with background fill.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Cross-origin (e.g. Google Fonts): cache, then network.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          })
          .catch(() => cached)
    )
  );
});

// Focus the app (or open it) when a notification is clicked.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing) return existing.focus();
      return self.clients.openWindow("/");
    })
  );
});

// Best-effort background check (Chrome/Android, installed PWA). Reads the budget
// status the app cached on its last run — avoids running sql.js inside the SW.
self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "budget-check") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open("kas-harian-meta");
      const res = await cache.match("/__budget_status");
      if (!res) return;
      const status = await res.json();
      const notified = await cache.match("/__budget_notified");
      const lastMonth = notified ? await notified.text() : "";
      if (status.shouldAlert && lastMonth !== status.monthKey) {
        await self.registration.showNotification("Batas Pengeluaran", {
          body: status.message,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "budget-alert",
        });
        await cache.put("/__budget_notified", new Response(status.monthKey));
      }
    })()
  );
});
