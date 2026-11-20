/* SPORTIVRA: simplify navigation while keeping each existing screen and its data. */
(function(){
 'use strict';
 if(typeof tabs!=='function')return;
 const player=typeof renderPlayer==='function';
 const groups=player?{
  'FOOT AI':['🤖 FOOT AI 2.5','Inne opcje FOOT AI'],
  '🔔 Powiadomienia':['🔔 Powiadomienia 2.5','Aktywność na tym urządzeniu'],
  '🎁 Nagrody':['🎁 Start i nagrody','Odznaki i misje startowe']
 }:{};
 const parentFor=Object.fromEntries(Object.entries(groups).map(([parent,entry])=>[entry[0],parent]));
 const label=text=>String(text).replace(/^\s*\d{1,2}\.\s+/,'').replace(/\s+(?:v\s*)?2\.[4567](?:\.\d+)?\s*$/i,'').trim();
 const originalTabs=tabs;
 tabs=function(pages,render){
  // Only merge known related screens and exact duplicate entries: similarly named
  // screens may represent different data and must remain accessible.
  const visible=[...new Set(pages)].filter(p=>!parentFor[p]||!pages.includes(parentFor[p]));
  originalTabs(visible,render);
  const nav=document.getElementById('nav');if(!nav)return;
  const activeParent=parentFor[typeof active==='undefined'?'':active];
  nav.querySelectorAll('button[data-page]').forEach(button=>{
   button.textContent=label(button.textContent);
   if(activeParent&&button.dataset.page===activeParent)button.classList.add('active');
  });
 };
 if(player){
  const prior=renderPlayer;
  renderPlayer=function(){
   const result=prior.apply(this,arguments);
   const view=document.getElementById('view');if(!view)return result;
   const entry=groups[active];const parent=parentFor[active];
   if(!entry&&!parent)return result;
   const card=document.createElement('div');card.className='card';
   const button=document.createElement('button');button.type='button';
   button.textContent=entry?entry[1]:'← Powrót';
   button.addEventListener('click',()=>{active=entry?entry[0]:parent;renderPlayer()});
   card.append(button);view.prepend(card);return result;
  };
 }
})();
