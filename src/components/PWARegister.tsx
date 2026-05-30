"use client";

import { useEffect } from "react";

// Registers the offline service worker once on the client.
export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("Pendaftaran service worker gagal:", err));
    }
  }, []);

  return null;
}
