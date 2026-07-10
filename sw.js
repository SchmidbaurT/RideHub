/* RIDEHUB Service Worker v2 */
const CACHE = "ridehub-v7";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Wetter-API: immer live, nie cachen
  if (url.hostname.includes("api.open-meteo.com")) return;

  // Kartenkacheln: Netz zuerst, Cache als Fallback (Tile-Server nicht zumüllen)
  if (url.hostname.includes("tile.openstreetmap.org")) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // App-Shell + CDN (Fonts, Leaflet): Cache zuerst, im Hintergrund aktualisieren
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request)
        .then(r => { if (r && r.status === 200) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
