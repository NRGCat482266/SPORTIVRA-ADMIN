/* Explicit source-result verification, using the existing matches panel and selector. */
(()=>{'use strict';
 if(typeof renderAdmin!=='function')return;
 const previous=renderAdmin;
 renderAdmin=function(...args){
  const result=previous.apply(this,args);
  if(active!=='⚽ Mecze 2.4')return result;
  const panel=document.querySelector('#sv27-admin-calendar details.card');
  const select=panel?.querySelector('select[aria-label="Mecz do zarządzania typowaniem"]');
  if(!panel||!select)return result;
  const section=document.createElement('section');section.className='card';
  const title=document.createElement('h4');title.textContent='Zatwierdzenie wyniku ze źródła';
  const hint=document.createElement('p');hint.textContent='Wybierz mecz powyżej. Przed zatwierdzeniem porównaj wynik bezpośrednio z wiarygodnym źródłem. Zapis rozliczy kupony automatycznie i nie może zostać cofnięty w tym panelu.';
  const status=document.createElement('p');status.setAttribute('role','status');
  const run=document.createElement('button');run.type='button';run.textContent='Sprawdź i zatwierdź wynik';
  section.append(title,hint,run,status);select.insertAdjacentElement('afterend',section);
  let request=0;
  select.addEventListener('change',()=>{request++;status.textContent=''});
  run.addEventListener('click',async()=>{
   const raw=select.value,id=Number(raw);if(!raw||!Number.isSafeInteger(id)||id<1){status.textContent='Wybierz mecz powyżej.';return}
   const token=++request;run.disabled=true;status.textContent='Pobieranie wyniku ze źródła…';
   try{
    const {data:m,error}=await db.from('fz26_fixtures').select('id,home,away,starts_at,status,source_provider,source_event_id,source_status,source_score_home,source_score_away,source_starts_at,source_needs_review,fetched_at').eq('id',id).single();
    if(error)throw error;if(token!==request||select.value!==raw||!panel.isConnected)return;
    if(!m||!m.source_provider||!m.source_event_id||!m.fetched_at||m.source_needs_review||m.source_status!=='finished'||m.source_score_home==null||m.source_score_away==null){status.textContent='Brak kompletnego, zakończonego wyniku źródła lub wymagana jest dodatkowa weryfikacja.';return}
    const text=`Czy sprawdziłeś wynik ${m.home} — ${m.away}: ${m.source_score_home} : ${m.source_score_away} bezpośrednio u wiarygodnego źródła? Potwierdzenie rozliczy zakłady i kupony. Operacji nie można cofnąć z panelu.`;
    if(!confirm(text)){status.textContent='Wynik nie został zatwierdzony.';return}
    const response=await db.rpc('sv27_admin_accept_source_result',{p_fixture:id,p_provider:m.source_provider,p_provider_event_id:m.source_event_id,p_fetched_at:m.fetched_at,p_score_home:m.source_score_home,p_score_away:m.source_score_away,p_confirm:true});
    if(response.error)throw response.error;if(token!==request||!panel.isConnected)return;
    status.textContent=`Rozliczono mecz: ${m.source_score_home} : ${m.source_score_away}. Starszych zakładów: ${response.data?.legacy_bets_settled??0}.`;
   }catch(e){if(token===request&&panel.isConnected)status.textContent='Nie udało się zatwierdzić wyniku: '+(e?.message||String(e))}
   finally{run.disabled=false}
  });
  return result;
 };
})();
