/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (!ev.data) return;
    if (ev.data.type === "deregister") {
      self.registration.unregister().then(() => self.clients.matchAll().then(clients => clients.forEach(client => client.navigate(client.url))));
    }
  });

  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") return;

    const request = (coepCredentialless && r.mode === "no-cors" && r.destination === "image") ?
      new Request(r.url, { ...r, credentials: "omit", mode: "no-cors" }) : r;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) return response;

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
          if (!coepCredentialless) newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
    window.sessionStorage.removeItem("coiReloadedBySelf");
    const coepNew = window.sessionStorage.getItem("coiCoepCredentialless");
    window.sessionStorage.removeItem("coiCoepCredentialless");

    if (reloadedBySelf) return;

    const n = navigator;
    if (n.serviceWorker && n.serviceWorker.controller) {
      n.serviceWorker.controller.postMessage({ type: "coepCredentialless", value: (coepCredentialless || coepNew) });
    } else {
      if (window.isSecureContext) {
        n.serviceWorker && n.serviceWorker.register(window.document.currentScript.src).then(
          (registration) => {
            window.sessionStorage.setItem("coiReloadedBySelf", "true");
            window.sessionStorage.setItem("coiCoepCredentialless", coepCredentialless);
            window.location.reload();
          },
          (err) => console.error("COI Service Worker failed to register:", err)
        );
      } else {
        console.log("COI Service Worker requires a secure context (HTTPS/localhost).");
      }
    }
  })();
}
