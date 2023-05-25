self.addEventListener("install", function (event) {
    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    self.clients.claim();
});

self.addEventListener("fetch", function (event) {
    var request = event.request;
    var accept = request.headers.get("accept");
    if (request.mode !== "navigate" || request.method !== "GET" || (accept && !accept.includes("text/html"))) {
        return;
    }
    var response = Promise.resolve(event.preloadResponse).then(function (r) {
        return r || fetch(request);
    });
    event.respondWith(response.catch(function (error) {
        return new Response(
            '<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
            '<body style="background:#1b2a41; color:white; text-align:center">You are offline.</body>' +
            '<script>window.addEventListener("online", e => location.reload());</script>',
            {headers: {"Content-Type": "text/html"}}
        );
    }));
});
