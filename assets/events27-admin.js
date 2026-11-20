/* SPORTIVRA 2.7. All event writes are authorized and validated by Supabase RPCs. */
(()=>{'use strict';
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n};
 const btn=(text,click)=>{const n=el('button',text);n.type='button';n.addEventListener('click',click);return n};
 const start=document.getElementById('fz25admin-launch');if(!start)return;start.textContent='🎪 Eventy';
 start.onclick=async()=>{
  if(typeof db==='undefined'||!db||typeof user==='undefined'||!user){if(typeof note==='function')note('Najpierw zaloguj się jako administrator.',true);return}
  if(document.getElementById('fz27-admin-events'))return;
  const root=el('section');root.id='fz27-admin-events';root.setAttribute('role','dialog');root.setAttribute('aria-label','Zarządzanie eventami');Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'100050',overflow:'auto',background:'#07101d',color:'#f5f8ff',padding:'20px'});
  const wrap=el('div');wrap.style.cssText='max-width:760px;margin:auto';root.append(wrap);const close=btn('✕ Zamknij',()=>root.remove());const title=el('h1','🎪 Zarządzanie eventami');const status=el('p','Wczytywanie…');status.setAttribute('role','status');
  const info=el('p','Nowe wydarzenie jest początkowo wyłączone. Po zapisaniu wybierz je ponownie i włącz. Usunięcie ukrywa wydarzenie, zachowując historię uczestników.');
  const create=btn('➕ Nowy event',()=>setForm(null));const listLabel=el('label','Wybierz event');const select=el('select');listLabel.append(select);
  const form=el('form');const label=(caption,type,name)=>{const l=el('label',caption),i=el(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;i.name=name;i.id='fz27-event-'+name;l.append(i);form.append(l);return i};
  const id=label('Identyfikator (małe litery, cyfry, _ lub -)','text','id');id.pattern='[a-z0-9_-]{1,80}';id.maxLength=80;id.required=true;
  const name=label('Nazwa','text','title');name.required=true;name.maxLength=120;
  const cl=el('label','Kategoria'),category=el('select');for(const [value,text] of [['sport','Sport'],['season','Sezon'],['special','Inne']]){const o=el('option',text);o.value=value;category.append(o)}cl.append(category);form.append(cl);
  const description=label('Opis','textarea','description');description.maxLength=2000;
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'lokalna';const from=label('Początek ('+tz+')','datetime-local','start'),to=label('Koniec ('+tz+')','datetime-local','end');from.required=true;to.required=true;
  const reward=label('Nagroda za dołączenie (wirtualne monety, 0–1000)','number','reward');reward.min='0';reward.max='1000';reward.step='1';reward.required=true;
  const enableLabel=el('label','Włączony '),enabled=el('input');enabled.type='checkbox';enableLabel.append(enabled);form.append(enableLabel);
  const save=el('button','💾 Zapisz');save.type='submit';const remove=btn('🗑 Usuń event',async()=>{const key=id.value;if(!key||!confirm('Usunąć event z listy? Historia uczestników zostanie zachowana.'))return;remove.disabled=true;try{const r=await db.rpc('fz27_event_admin_cancel',{p_id:key});if(r.error)throw r.error;status.textContent='Usunięto event z listy.';await load();setForm(null)}catch(e){status.textContent='Nie udało się usunąć: '+(e.message||String(e))}finally{remove.disabled=false}});form.append(save,remove);
  wrap.append(close,title,info,status,create,listLabel,form);document.body.append(root);
  let rows=[],editing=false;
  const local=v=>{if(!v)return '';const d=new Date(v);if(!Number.isFinite(d.valueOf()))return '';const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())};
  function setForm(row){editing=!!row;id.value=row?.id||'';id.readOnly=editing;name.value=row?.title||'';category.value=['sport','season','special'].includes(row?.category)?row.category:'special';description.value=row?.description||'';from.value=local(row?.starts_at);to.value=local(row?.ends_at);reward.value=String(row?.reward_coins??0);enabled.checked=!!row?.enabled;enabled.disabled=!editing;remove.hidden=!editing;select.value=row?.id||''}
  async function load(){const r=await db.from('fz25_events').select('id,title,category,description,starts_at,ends_at,reward_coins,enabled,cancelled_at').order('title');if(r.error)throw r.error;rows=(r.data||[]).filter(x=>!x.cancelled_at);select.replaceChildren();const blank=el('option','— nowy event —');blank.value='';select.append(blank);for(const row of rows){const opt=el('option',row.title+' ('+row.id+')');opt.value=row.id;select.append(opt)}}
  select.addEventListener('change',()=>setForm(rows.find(x=>x.id===select.value)||null));
  form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const begin=new Date(from.value),end=new Date(to.value),amount=Number(reward.value);if(!Number.isFinite(begin.valueOf())||!Number.isFinite(end.valueOf())||end<=begin){status.textContent='Koniec musi być późniejszy niż początek.';return}if(!Number.isInteger(amount)||amount<0||amount>1000){status.textContent='Nagroda musi wynosić od 0 do 1000 monet.';return}
   save.disabled=true;status.textContent='Zapisywanie…';try{const key=id.value.trim(),wasEditing=editing;const args={p_id:key,p_title:name.value.trim(),p_category:category.value,p_description:description.value.trim(),p_start:begin.toISOString(),p_end:end.toISOString(),p_reward:amount};if(wasEditing)args.p_enabled=enabled.checked;const r=await db.rpc(wasEditing?'fz27_event_admin_save':'fz27_event_admin_create',args);if(r.error)throw r.error;await load();setForm(rows.find(x=>x.id===key)||null);status.textContent=wasEditing?'Zapisano event.':'Nowy event jest wyłączony — zaznacz „Włączony” i zapisz, aby go uruchomić.'}catch(err){status.textContent='Nie udało się zapisać: '+(err.message||String(err))}finally{save.disabled=false}
  });
  try{await load();setForm(null);status.textContent='Wybierz event lub dodaj nowy.'}catch(err){status.textContent='Nie udało się wczytać eventów: '+(err.message||String(err))+'. Sprawdź uprawnienia i migrację 27_EVENTS.sql.';form.hidden=true}
 };
})();
