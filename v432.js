// V4.3.2: multi-select status filtering.
const STATUS_KEY='flashcardsSelectedStatuses';
let selectedStatuses=new Set(JSON.parse(localStorage.getItem(STATUS_KEY)||'[]'));
const STATUS_OPTIONS=[
  ['known','Known'],
  ['review','Review'],
  ['unmarked','Unmarked'],
  ['missed','Missed most often']
];

function saveStatuses(){localStorage.setItem(STATUS_KEY,JSON.stringify([...selectedStatuses]));}
function matchesSelectedStatus(term){
  if(selectedStatuses.size===0)return true;
  return [...selectedStatuses].some(s=>{
    if(s==='known')return known.has(term);
    if(s==='review')return review.has(term);
    if(s==='unmarked')return !known.has(term)&&!review.has(term);
    if(s==='missed')return (missCounts[term]||0)>0;
    return false;
  });
}
function renderStatusChecks(){
  const root=document.getElementById('statusChecks');if(!root)return;
  root.innerHTML='';
  STATUS_OPTIONS.forEach(([key,label])=>{
    const row=document.createElement('label');row.className='status-check';
    row.innerHTML='<input type="checkbox" '+(selectedStatuses.has(key)?'checked':'')+'><span>'+label+'</span>';
    row.querySelector('input').onchange=e=>{e.target.checked?selectedStatuses.add(key):selectedStatuses.delete(key);saveStatuses();buildDeck();renderStatusChecks()};
    root.appendChild(row);
  });
}
function statusLabel(){
  if(selectedStatuses.size===0)return 'All statuses';
  return STATUS_OPTIONS.filter(([k])=>selectedStatuses.has(k)).map(([,l])=>l).join(', ');
}

// Replace deck generation with OR-combined status filtering.
// Filters define which cards enter a session; once built, that deck stays stable until
// the user changes groups/statuses, returns from Settings, or otherwise rebuilds it.
buildDeck=function(){
  const groups=allGroups();const ids=new Set();
  selected.forEach(g=>(groups[g]||[]).forEach(i=>ids.add(i)));
  deck=[...ids].filter(i=>matchesSelectedStatus(CARDS[i].term));
  if(selectedStatuses.size===1&&selectedStatuses.has('missed'))deck.sort((a,b)=>(missCounts[CARDS[b].term]||0)-(missCounts[CARDS[a].term]||0));else shuffle(deck);
  pos=0;flipped=false;renderToolbarGroups();renderStatusChecks();renderCard();
};

// Rating a card updates its permanent status but does not rebuild the active session.
// This keeps Card X of Y, percentage, order, Next, and Previous stable for every filter.
markCard=function(ok){
  if(!deck.length)return;
  const t=CARDS[deck[pos]].term;
  if(ok){known.add(t);review.delete(t)}else{review.add(t);known.delete(t);missCounts[t]=(missCounts[t]||0)+1}
  saveState();
  nextCard();
};

// Ensure initial UI reflects saved multi-status selections after base initialization.
setTimeout(()=>{renderStatusChecks();renderSummary();},0);
