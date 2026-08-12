const CACHE_NAME = "interval-timer-v7";
// Only the default voice's clips are precached up front; the other voices'
// clips get cached on demand the first time each is fetched (the fetch
// handler below caches every successful response automatically).
const DEFAULT_VOICE_CLIPS = (function () {
  const names = [];
  for (let i = 0; i <= 59; i++) { names.push("sec_" + i); names.push("min_" + i); }
  names.push("begin", "restfor");
  return names.map((n) => "./voices/jenny/" + n + ".mp3");
})();
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png"
].concat(DEFAULT_VOICE_CLIPS);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  // Always take over immediately on install, regardless of whether any
  // already-open tab's JS asks us to. Waiting for a postMessage from the
  // client created a deadlock: the client code that would send it only
  // exists in the NEW page, which an old, still-active service worker keeps
  // preventing from ever loading. Unconditional skipWaiting breaks that.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Take over immediately when told to, instead of waiting for all tabs to close.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Network-first: always serve the freshest copy when online (so deploys show
// up immediately), falling back to the cache only when offline.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
