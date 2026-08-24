// V4.4.1: Excel-safe CSV exports.
// Prefix formula-like text with an apostrophe. Excel displays the intended term as text.
function excelSafe(value){
  const s=String(value??'');
  return /^[=+\-@]/.test(s)?"'"+s:s;
}
exportCurrentLibraryCSV=async function(){
  snapshotCurrentLibrary();const lib=currentLibrary();if(!lib)return;
  const memberships={};Object.entries(lib.customGroups||{}).forEach(([g,ids])=>(ids||[]).forEach(i=>{(memberships[i]||(memberships[i]=[])).push(g)}));
  const lines=[['Term','Meaning','Groups','Status','Misses'].map(csvCell).join(',')];
  (lib.cards||[]).forEach((c,i)=>{
    const status=(lib.known||[]).includes(c.term)?'Known':(lib.review||[]).includes(c.term)?'Review':'';
    lines.push([excelSafe(c.term),excelSafe(c.meaning),(memberships[i]||[]).join(';'),status,(lib.missCounts||{})[c.term]||0].map(csvCell).join(','));
  });
  await deliverFile('\ufeff'+lines.join('\r\n'),slug(lib.name)+'.csv','text/csv;charset=utf-8','Export '+lib.name);
};
downloadCSVTemplate=async function(){
  await deliverFile('\ufeffTerm,Meaning,Groups,Status,Misses\r\n\'-ac,pertaining to,Suffixes,,0\r\ncardi/o,heart,Roots;Cardio,Known,0\r\nhepat/o,liver,Roots;GI,Review,2\r\n','flashcards-template.csv','text/csv;charset=utf-8','Flashcards CSV Template');
};
