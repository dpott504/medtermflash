// v4.4.4: bulk unmarking and filtered-deck refresh at end of session.
function unmarkGroup(g){
  const ids=(allGroups()[g]||[]);
  if(!ids.length)return;
  if(!confirm('Set all '+ids.length+' cards in “'+g+'” to Unmarked?'))return;
  ids.forEach(i=>{
    const term=CARDS[i]?.term;
    if(!term)return;
    known.delete(term);
    review.delete(term);
  });
  saveState();
  renderGroups();
  renderToolbarGroups();
  renderCard();
}

const renderGroupsPre444=renderGroups;
renderGroups=function(){
  renderGroupsPre444();
  const root=document.getElementById('groupsList');
  if(!root)return;
  [...root.children].forEach((row,index)=>{
    const groupName=Object.keys(allGroups())[index];
    if(!groupName)return;
    const button=document.createElement('button');
    button.className='bulk-unmark';
    button.textContent='Unmark all';
    button.onclick=()=>unmarkGroup(groupName);
    row.appendChild(button);
  });
};

// Keep a filtered study deck stable during a pass, then reapply the active status
// filter when advancing beyond the final card. Cards whose status changed no longer
// appear in the next pass.
nextCard=function(){
  if(!deck.length)return;
  if(pos+1>=deck.length){
    if(typeof selectedStatuses!=='undefined'&&selectedStatuses.size>0){
      buildDeck();
    }else{
      pos=0;flipped=false;renderCard();
    }
    return;
  }
  pos++;flipped=false;renderCard();
};

setTimeout(()=>renderGroups(),0);
