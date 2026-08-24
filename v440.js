// V4.4.0: multi-library architecture with CSV import/export and complete backup.
const LIBRARIES_KEY='flashcardsLibrariesV440';
const ACTIVE_LIBRARY_KEY='flashcardsActiveLibraryV440';
let libraries={};
let activeLibraryId='';
let librarySystemReady=false;

function makeLibraryId(){return 'lib_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function currentLibrary(){return libraries[activeLibraryId]||null}
function cloneJson(v){return JSON.parse(JSON.stringify(v))}
function safeLibraryName(name){return String(name||'Untitled Library').trim()||'Untitled Library'}
function uniqueLibraryName(base){
  base=safeLibraryName(base);const names=new Set(Object.values(libraries).map(l=>l.name.toLowerCase()));
  if(!names.has(base.toLowerCase()))return base;
  let n=2;while(names.has((base+' '+n).toLowerCase()))n++;return base+' '+n;
}
function snapshotCurrentLibrary(){
  const lib=currentLibrary();if(!lib||!librarySystemReady)return;
  lib.cards=cloneJson(CARDS);
  lib.customGroups=cloneJson(custom);
  lib.selectedGroups=cloneJson(selected);
  lib.known=[...known];lib.review=[...review];lib.missCounts=cloneJson(missCounts);
  lib.selectedStatuses=typeof selectedStatuses!=='undefined'?[...selectedStatuses]:[];
  lib.updatedAt=new Date().toISOString();
  persistLibraries();
}
function persistLibraries(){
  localStorage.setItem(LIBRARIES_KEY,JSON.stringify(libraries));
  localStorage.setItem(ACTIVE_LIBRARY_KEY,activeLibraryId);
}
function applyLibrary(lib,rebuild=true){
  if(!lib)return;
  CARDS=cloneJson(lib.cards||[]);custom=cloneJson(lib.customGroups||{});selected=cloneJson(lib.selectedGroups||['All']);
  if(!selected.length)selected=['All'];known=new Set(lib.known||[]);review=new Set(lib.review||[]);missCounts=cloneJson(lib.missCounts||{});
  if(typeof selectedStatuses!=='undefined')selectedStatuses=new Set(lib.selectedStatuses||[]);
  editing=null;deck=[];pos=0;flipped=false;
  updateLibraryLabels();renderLibraries();renderGroups();renderToolbarGroups();if(typeof renderStatusChecks==='function')renderStatusChecks();
  if(rebuild)buildDeck();
}

const saveStatePre440=saveState;
saveState=function(){
  if(librarySystemReady&&currentLibrary())snapshotCurrentLibrary();
  else saveStatePre440();
};
if(typeof saveStatuses==='function'){
  saveStatuses=function(){
    if(librarySystemReady&&currentLibrary())snapshotCurrentLibrary();
    else localStorage.setItem(STATUS_KEY,JSON.stringify([...selectedStatuses]));
  };
}

function initializeLibraries(){
  try{libraries=JSON.parse(localStorage.getItem(LIBRARIES_KEY)||'{}')||{}}catch{libraries={}}
  activeLibraryId=localStorage.getItem(ACTIVE_LIBRARY_KEY)||'';
  if(!Object.keys(libraries).length){
    const id=makeLibraryId();
    libraries[id]={id,name:'Medical Terminology',cards:cloneJson(CARDS),customGroups:cloneJson(custom),selectedGroups:cloneJson(selected.length?selected:['All']),known:[...known],review:[...review],missCounts:cloneJson(missCounts),selectedStatuses:typeof selectedStatuses!=='undefined'?[...selectedStatuses]:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    activeLibraryId=id;
  }
  if(!libraries[activeLibraryId])activeLibraryId=Object.keys(libraries)[0];
  librarySystemReady=true;persistLibraries();applyLibrary(currentLibrary(),true);
}

function updateLibraryLabels(){
  const lib=currentLibrary();const name=lib?lib.name:'Flashcards';
  document.querySelectorAll('[data-library-name]').forEach(el=>el.textContent=name);
  const current=document.getElementById('currentLibrarySummary');if(current&&lib)current.textContent=lib.name+' · '+(lib.cards||[]).length+' cards';
}
function renderLibraries(){
  const root=document.getElementById('librariesList');if(!root)return;root.innerHTML='';
  Object.values(libraries).sort((a,b)=>a.name.localeCompare(b.name)).forEach(lib=>{
    const row=document.createElement('div');row.className='library-row'+(lib.id===activeLibraryId?' active':'');
    const left=document.createElement('button');left.className='library-select';left.innerHTML='<strong>'+esc(lib.name)+'</strong><span>'+(lib.cards||[]).length+' cards · '+Object.keys(lib.customGroups||{}).length+' groups'+(lib.id===activeLibraryId?' · Active':'')+'</span>';
    left.onclick=()=>switchLibrary(lib.id);
    const del=document.createElement('button');del.className='danger library-delete';del.textContent='Delete';del.onclick=()=>deleteLibraryById(lib.id);
    row.append(left,del);root.appendChild(row);
  });
  updateLibraryLabels();
}
function switchLibrary(id){
  if(!libraries[id]||id===activeLibraryId)return;
  snapshotCurrentLibrary();activeLibraryId=id;persistLibraries();applyLibrary(libraries[id],true);
}
function deleteLibraryById(id){
  const lib=libraries[id];if(!lib)return;
  if(Object.keys(libraries).length<=1){alert('You must keep at least one library.');return}
  if(!confirm('Delete “'+lib.name+'”? This removes its cards, groups, and progress from this device.'))return;
  const wasActive=id===activeLibraryId;delete libraries[id];
  if(wasActive)activeLibraryId=Object.keys(libraries)[0];persistLibraries();applyLibrary(currentLibrary(),true);
}

function csvCell(value){const s=String(value??'');return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s}
function parseCSV(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}else if(ch==='"')quoted=false;else cell+=ch}
    else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell=''}else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(ch!=='\r')cell+=ch;
  }
  if(cell.length||row.length){row.push(cell);rows.push(row)}return rows.filter(r=>r.some(c=>String(c).trim()));
}
async function deliverFile(content,name,type,title){
  const blob=new Blob([content],{type});const file=new File([blob],name,{type});
  if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({title,files:[file]});return}catch(e){if(e.name==='AbortError')return}}
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function slug(s){return safeLibraryName(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'flashcards'}
async function exportCurrentLibraryCSV(){
  snapshotCurrentLibrary();const lib=currentLibrary();if(!lib)return;
  const memberships={};Object.entries(lib.customGroups||{}).forEach(([g,ids])=>(ids||[]).forEach(i=>{(memberships[i]||(memberships[i]=[])).push(g)}));
  const lines=[['Term','Meaning','Groups','Status','Misses'].map(csvCell).join(',')];
  (lib.cards||[]).forEach((c,i)=>{const status=(lib.known||[]).includes(c.term)?'Known':(lib.review||[]).includes(c.term)?'Review':'';lines.push([c.term,c.meaning,(memberships[i]||[]).join(';'),status,(lib.missCounts||{})[c.term]||0].map(csvCell).join(','))});
  await deliverFile(lines.join('\r\n'),slug(lib.name)+'.csv','text/csv;charset=utf-8','Export '+lib.name);
}
async function downloadCSVTemplate(){await deliverFile('Term,Meaning,Groups,Status,Misses\r\ncardi/o,heart,Roots;Cardio,Known,0\r\nhepat/o,liver,Roots;GI,Review,2\r\n','flashcards-template.csv','text/csv;charset=utf-8','Flashcards CSV Template')}
function chooseLibraryImport(){document.getElementById('libraryImport').click()}
async function importLibraryCSV(event){
  const file=event.target.files?.[0];if(!file)return;
  try{
    const rows=parseCSV(await file.text());if(rows.length<2)throw new Error('No card rows found.');
    const headers=rows[0].map(h=>h.trim().toLowerCase());const col=n=>headers.indexOf(n);const ti=col('term'),mi=col('meaning');if(ti<0||mi<0)throw new Error('CSV must contain Term and Meaning columns.');
    const gi=col('groups'),si=col('status'),xi=col('misses');const cards=[],groups={},k=[],r=[],miss={};
    rows.slice(1).forEach(row=>{const term=String(row[ti]||'').trim(),meaning=String(row[mi]||'').trim();if(!term||!meaning)return;const idx=cards.length;cards.push({term,meaning});
      if(gi>=0)String(row[gi]||'').split(';').map(x=>x.trim()).filter(Boolean).forEach(g=>(groups[g]||(groups[g]=[])).push(idx));
      const status=si>=0?String(row[si]||'').trim().toLowerCase():'';if(status==='known')k.push(term);else if(status==='review')r.push(term);
      const misses=xi>=0?parseInt(row[xi]||'0',10)||0:0;if(misses>0)miss[term]=misses;
    });
    if(!cards.length)throw new Error('No valid cards found.');
    const base=file.name.replace(/\.csv$/i,'').replace(/[-_]+/g,' ').trim()||'Imported Library';const requested=prompt('Library name',base);if(requested===null)return;const name=uniqueLibraryName(requested);
    snapshotCurrentLibrary();const id=makeLibraryId();libraries[id]={id,name,cards,customGroups:groups,selectedGroups:['All'],known:k,review:r,missCounts:miss,selectedStatuses:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};activeLibraryId=id;persistLibraries();applyLibrary(libraries[id],true);
    alert('Imported '+cards.length+' cards into “'+name+'”.');
  }catch(e){alert(e.message||'Could not import that CSV file.')}finally{event.target.value=''}
}

exportProgress=async function(){
  snapshotCurrentLibrary();const backup={app:'Flashcards',version:'4.4.0',format:'complete-library-backup',exportedAt:new Date().toISOString(),activeLibraryId,libraries,darkMode:localStorage.getItem(K.dark)!=='0'};
  await deliverFile(JSON.stringify(backup,null,2),'flashcards-complete-backup-'+new Date().toISOString().slice(0,10)+'.json','application/json','Flashcards Complete Backup');
};
importProgress=async function(event){
  const file=event.target.files?.[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(data?.format==='complete-library-backup'&&data.libraries&&Object.keys(data.libraries).length){libraries=data.libraries;activeLibraryId=data.activeLibraryId&&libraries[data.activeLibraryId]?data.activeLibraryId:Object.keys(libraries)[0];if(typeof data.darkMode==='boolean')localStorage.setItem(K.dark,data.darkMode?'1':'0');librarySystemReady=true;persistLibraries();applyDarkMode(localStorage.getItem(K.dark)!=='0');applyLibrary(currentLibrary(),true);alert('Complete backup restored.');return}
    if(data&&(!data.customGroups&&!data.known&&!data.review))throw new Error();
    // Legacy single-library backup: restore it into the active library without deleting other libraries.
    custom=data.customGroups||{};selected=(data.selectedGroups||['All']).map(g=>g==='All cards'?'All':g);known=new Set(data.known||[]);review=new Set(data.review||[]);missCounts=data.missCounts||{};if(typeof data.darkMode==='boolean')localStorage.setItem(K.dark,data.darkMode?'1':'0');snapshotCurrentLibrary();applyDarkMode(localStorage.getItem(K.dark)!=='0');renderGroups();buildDeck();alert('Legacy progress restored into the current library.');
  }catch{alert('That file is not a valid Flashcards backup.')}finally{event.target.value=''}
};

// Settings view should always reflect the active library.
const showGroupsPre440=showGroups;showGroups=function(){snapshotCurrentLibrary();showGroupsPre440();renderLibraries();updateLibraryLabels()};

// Base initialization loads the legacy medical card database first. Once it finishes,
// migrate that exact state into the first V4.4.0 library or restore an existing library set.
(function waitForBase(){if(CARDS.length){initializeLibraries()}else setTimeout(waitForBase,30)})();
