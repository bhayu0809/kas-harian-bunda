// Local (no-server) notification helpers using the Web Notification API and the
// existing service worker. Reliable while the app is open; closed-app delivery
// is best-effort via Periodic Background Sync where supported.

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  await registerPeriodicBudgetSync();
  return result === "granted";
}

export async function showLocalNotification(title: string, body: string): Promise<void> {
  if (notificationPermission() !== "granted") return;
  const options: NotificationOptions = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "budget-alert",
  };
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, options);
  } catch {
    new Notification(title, options);
  }
}

/** Best-effort: ask the browser to wake the SW ~daily to re-check (Chrome/Android,
 *  installed PWA). Silently ignored where unsupported (e.g. iOS, desktop Safari). */
export async function registerPeriodicBudgetSync(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    // periodicSync is not in the standard SW types yet.
    const periodicSync = (reg as unknown as { periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> } }).periodicSync;
    if (!periodicSync) return;
    await periodicSync.register("budget-check", { minInterval: 12 * 60 * 60 * 1000 });
  } catch {
    // not supported / permission not granted — fine, we still alert on app open
  }
}

/** Cache the latest budget status so the SW's periodicsync handler can read it
 *  without running sql.js. */
export async function cacheBudgetStatus(status: { shouldAlert: boolean; message: string; monthKey: string }): Promise<void> {
  try {
    const cache = await caches.open("kas-harian-meta");
    await cache.put("/__budget_status", new Response(JSON.stringify(status), { headers: { "Content-Type": "application/json" } }));
  } catch {
    // caches unavailable — ignore
  }
}
