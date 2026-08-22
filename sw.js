const CACHE = "med-term-cards-v2";
const ASSETS = ["./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

async function transformedIndex() {
  const response = await fetch("./index.html?app=v2", { cache: "no-store" });
  let html = await response.text();

  html = html.replace(
    `<div style="display:flex;gap:8px">\n      <button class="primary" onclick="shuffleDeck()">🔀 Shuffle</button>\n      <button onclick="openGroups()">Groups</button>\n    </div>`,
    `<div style="display:flex;gap:8px">\n      <button onclick="openGroups()">Groups</button>\n    </div>`
  );

  html = html.replace(
    `  if(status==="missed"){\n    deck.sort((a,b)=>(missCounts[CARDS[b].term]||0)-(missCounts[CARDS[a].term]||0));\n  }\n\n  pos=0;flipped=false;render();renderQuick();`,
    `  if(status==="missed"){\n    deck.sort((a,b)=>(missCounts[CARDS[b].term]||0)-(missCounts[CARDS[a].term]||0));\n  } else {\n    for(let i=deck.length-1;i>0;i--){\n      const j=Math.floor(Math.random()*(i+1));\n      [deck[i],deck[j]]=[deck[j],deck[i]];\n    }\n  }\n\n  pos=0;flipped=false;render();renderQuick();`
  );

  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(html, { status: 200, headers });
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isAppPage = event.request.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/medtermflash/");

  if (isAppPage) {
    event.respondWith(
      transformedIndex().catch(async () => {
        const cached = await caches.match("./index.html");
        return cached || Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }))
  );
});
