self.addEventListener("install", function (event) {
    self.skipWaiting();
    event.waitUntil(caches.open("sgmnow").then(function (cache) {
        return cache.addAll(["./", "./index.css", "./index.js"]);
    }));
});

self.addEventListener("activate", function (event) {
    event.waitUntil(clients.claim());
});

self.addEventListener("fetch", function (event) {
    var request = event.request;
    var url = new URL(request.url);
    if (request.method !== "GET" || !(url.host == location.host || url.host == "www.gstatic.com")) {
        return;
    }
    var response = Promise.resolve(event.preloadResponse).then(function (r) {
        return r || fetch(request);
    });
    event.respondWith(caches.open("sgmnow").then(function (cache) {
        return response.then(function (r) {
            if (r.ok || r.type == "opaque") {
                cache.put(request, r.clone());
            }
            return r;
        }).catch(function (error) {
            return cache.match(request).then(function (match) {
                if (!match || !(match.ok || match.type == "opaque")) {
                    return Response.error();
                }
                return match;
            });
        });
    }));
});
