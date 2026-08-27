// v4.4.3: normalize Excel-safe leading apostrophes on CSV import.
function normalizeImportedTerm(value){
  const term=String(value??'').trim();
  return term.startsWith("'-")?term.slice(1):term;
}

importLibraryCSV=async function(event){
  const file=event.target.files?.[0];if(!file)return;
  try{
    const rows=parseCSV(await file.text());if(rows.length<2)throw new Error('No card rows found.');
    const headers=rows[0].map(h=>h.trim().toLowerCase());const col=n=>headers.indexOf(n);const ti=col('term'),mi=col('meaning');if(ti<0||mi<0)throw new Error('CSV must contain Term and Meaning columns.');
    const gi=col('groups'),si=col('status'),xi=col('misses');const cards=[],groups={},k=[],r=[],miss={};
    rows.slice(1).forEach(row=>{
      const term=normalizeImportedTerm(row[ti]),meaning=String(row[mi]||'').trim();
      if(!term||!meaning)return;
      const idx=cards.length;cards.push({term,meaning});
      if(gi>=0)String(row[gi]||'').split(';').map(x=>x.trim()).filter(Boolean).forEach(g=>(groups[g]||(groups[g]=[])).push(idx));
      const status=si>=0?String(row[si]||'').trim().toLowerCase():'';if(status==='known')k.push(term);else if(status==='review')r.push(term);
      const misses=xi>=0?parseInt(row[xi]||'0',10)||0:0;if(misses>0)miss[term]=misses;
    });
    if(!cards.length)throw new Error('No valid cards found.');
    const base=file.name.replace(/\.csv$/i,'').replace(/[-_]+/g,' ').trim()||'Imported Library';const requested=prompt('Library name',base);if(requested===null)return;const name=uniqueLibraryName(requested);
    snapshotCurrentLibrary();const id=makeLibraryId();libraries[id]={id,name,cards,customGroups:groups,selectedGroups:['All'],known:k,review:r,missCounts:miss,selectedStatuses:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};activeLibraryId=id;persistLibraries();applyLibrary(libraries[id],true);
    alert('Imported '+cards.length+' cards into “'+name+'”.');
  }catch(e){alert(e.message||'Could not import that CSV file.')}finally{event.target.value=''}
};
