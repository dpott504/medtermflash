// V4.3 behavior overrides: pool-aware Known/Review statistics.
function selectedPoolIds(){
  const groups=allGroups();
  const ids=new Set();
  selected.forEach(g=>(groups[g]||[]).forEach(i=>ids.add(i)));
  return [...ids];
}

function renderPoolStats(){
  const ids=selectedPoolIds();
  let knownCount=0, reviewCount=0;
  ids.forEach(i=>{
    const term=CARDS[i]?.term;
    if(!term)return;
    if(known.has(term))knownCount++;
    if(review.has(term))reviewCount++;
  });
  const k=document.getElementById('known');
  const r=document.getElementById('review');
  if(k)k.textContent=knownCount;
  if(r)r.textContent=reviewCount;
}

const renderCardV42=renderCard;
renderCard=function(){
  renderCardV42();
  renderPoolStats();
};

const renderSummaryV42=renderSummary;
renderSummary=function(){
  renderSummaryV42();
  renderPoolStats();
};
