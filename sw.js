const CACHE = "med-term-cards-v3";
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
  const response = await fetch("./index.html?app=v3", { cache: "no-store" });
  let html = await response.text();

  // Remove the manual Shuffle button; normal decks auto-shuffle when generated.
  html = html.replace(
    `<div style="display:flex;gap:8px">\n      <button class="primary" onclick="shuffleDeck()">🔀 Shuffle</button>\n      <button onclick="openGroups()">Groups</button>\n    </div>`,
    `<div style="display:flex;gap:8px">\n      <button onclick="openGroups()">Groups</button>\n    </div>`
  );

  // Remove redundant Flip button. Tapping the card still flips it.
  html = html.replace(
    `<div class="nav"><button onclick="prev()">← Previous</button><button class="primary" onclick="flip()">Flip</button><button onclick="next()">Next →</button></div>`,
    `<div class="nav"><button onclick="prev()">← Previous</button><button onclick="next()">Next →</button></div>`
  );

  // Automatic shuffle for generated decks, except the ranked "Missed most often" view.
  html = html.replace(
    `  if(status==="missed"){\n    deck.sort((a,b)=>(missCounts[CARDS[b].term]||0)-(missCounts[CARDS[a].term]||0));\n  }\n\n  pos=0;flipped=false;render();renderQuick();`,
    `  if(status==="missed"){\n    deck.sort((a,b)=>(missCounts[CARDS[b].term]||0)-(missCounts[CARDS[a].term]||0));\n  } else {\n    for(let i=deck.length-1;i>0;i--){\n      const j=Math.floor(Math.random()*(i+1));\n      [deck[i],deck[j]]=[deck[j],deck[i]];\n    }\n  }\n\n  pos=0;flipped=false;render();renderQuick();`
  );

  // Make Groups a dedicated full-screen app view instead of a bottom-sheet popup.
  html = html.replace(
    `</style>`,
    `.modal{position:fixed!important;inset:0!important;background:var(--bg)!important;display:block!important;padding:0!important;overflow:auto!important;z-index:50!important}\n.modal.hidden{display:none!important}\n.sheet{background:var(--bg)!important;border-radius:0!important;width:100%!important;max-width:760px!important;min-height:100vh!important;max-height:none!important;margin:0 auto!important;padding:calc(18px + env(safe-area-inset-top)) 16px calc(32px + env(safe-area-inset-bottom))!important;overflow:visible!important;box-shadow:none!important}\n.groups-card{background:white;border:1px solid var(--border);border-radius:18px;padding:15px;margin-top:15px}\n.backup-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}\n.backup-note{font-size:12px;color:var(--muted);line-height:1.4;margin-top:8px}\n@media(max-width:520px){.backup-actions{grid-template-columns:1fr}}\n</style>`
  );

  // Rename Done to Back for the dedicated Groups screen.
  html = html.replace(
    `<h2 style="margin:0">Study Groups</h2><button onclick="closeGroups()">Done</button>`,
    `<div><div class="sub">Study setup</div><h2 style="margin:2px 0 0">Groups</h2></div><button onclick="closeGroups()">← Back</button>`
  );

  // Add backup/restore controls to the Groups screen.
  html = html.replace(
    `<div id="groups"></div>`,
    `<div id="groups"></div>\n\n    <div class="groups-card">\n      <h3 style="margin:0 0 4px">Progress Backup</h3>\n      <div class="sub">Save your groups and study progress before reinstalling or clearing website data.</div>\n      <div class="backup-actions">\n        <button class="primary" onclick="exportProgress()">Save Backup</button>\n        <button onclick="document.getElementById('progressImport').click()">Restore Backup</button>\n      </div>\n      <input id="progressImport" type="file" accept="application/json,.json" style="display:none" onchange="importProgress(event)">\n      <div class="backup-note">Backup includes custom groups, selected groups, Known/Review status, and miss counts. It does not contain anything outside this flashcard app.</div>\n    </div>`
  );

  // Inject backup/restore functions before keyboard handlers.
  html = html.replace(
    `document.addEventListener("keydown",e=>{`,
    `async function exportProgress(){\n  const backup={\n    app:"Med Term Cards",\n    version:1,\n    exportedAt:new Date().toISOString(),\n    customGroups:JSON.parse(localStorage.getItem("medCustomGroups")||"{}"),\n    selectedGroups:JSON.parse(localStorage.getItem("medSelectedGroups")||"[\\"All cards\\"]"),\n    known:JSON.parse(localStorage.getItem("medKnown")||"[]"),\n    review:JSON.parse(localStorage.getItem("medReview")||"[]"),\n    missCounts:JSON.parse(localStorage.getItem("medMissCounts")||"{}")\n  };\n  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});\n  const fileName="med-term-progress-"+new Date().toISOString().slice(0,10)+".json";\n  const file=new File([blob],fileName,{type:"application/json"});\n  if(navigator.canShare&&navigator.canShare({files:[file]})){\n    try{await navigator.share({title:"Med Term Cards Backup",files:[file]});return;}catch(e){if(e.name==="AbortError")return;}\n  }\n  const url=URL.createObjectURL(blob);\n  const a=document.createElement("a");a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);\n}\n\nasync function importProgress(event){\n  const file=event.target.files&&event.target.files[0];\n  if(!file)return;\n  try{\n    const data=JSON.parse(await file.text());\n    if(!data||data.app!=="Med Term Cards")throw new Error("Not a Med Term Cards backup");\n    localStorage.setItem("medCustomGroups",JSON.stringify(data.customGroups||{}));\n    localStorage.setItem("medSelectedGroups",JSON.stringify(data.selectedGroups||["All cards"]));\n    localStorage.setItem("medKnown",JSON.stringify(data.known||[]));\n    localStorage.setItem("medReview",JSON.stringify(data.review||[]));\n    localStorage.setItem("medMissCounts",JSON.stringify(data.missCounts||{}));\n    alert("Progress restored successfully. The app will reload now.");\n    location.reload();\n  }catch(err){\n    alert("That backup could not be restored. Please choose a Med Term Cards backup file.");\n  }finally{event.target.value="";}\n}\n\ndocument.addEventListener("keydown",e=>{`
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
