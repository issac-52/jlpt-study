// Kotoba PWA: online-only initial release. Do not cache private/auth responses.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
