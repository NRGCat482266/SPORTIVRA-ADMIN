/* SPORTIVRA 2.7 account directory. Account deletion is server-side only. */
(()=>{'use strict';
 if(typeof renderAdmin!=='function'||typeof ADMIN_PAGES==='undefined')return;
 if(!ADMIN_PAGES.includes('👥 Konta'))ADMIN_PAGES.push('👥 Konta');
 const deleting = new Set();
 async function deletionError(result, userId) {
  const response = result.error?.context ?? result.response;
  const status = response?.status;
  let body = result.data;
  try {
   if (response && !body) {
    const raw = (await response.clone().text()).trim();
    try { body = JSON.parse(raw); }
    catch { if (raw && !raw.startsWith('<')) body = {message: raw}; }
   }
  } catch { /* The response may have already been consumed by the SDK. */ }
  const reason = [body?.error, body?.message, body?.msg, body?.error_description, body?.code]
   .find(value => typeof value === 'string' && value.trim());
  const hint = /database error deleting user/i.test(reason || '')
   ? 'Sprawdź szczegóły tej próby w Supabase → Logs → Auth.'
   : ({
   401: 'Zaloguj się ponownie w panelu Admin.',
   403: 'Sprawdź uprawnienia konta w panelu Admin.',
   404: 'Sprawdź nazwę funkcji delete-account i wybrane konto.'
  })[status];
  const detail = reason?.slice(0, 400) || (!status && result.error?.message);
  const fallback = status
   ? 'Sprawdź to wywołanie w Supabase → Edge Functions → delete-account → Invocations.'
   : 'Sprawdź połączenie i odśwież listę kont, aby ustalić wynik.';
  const parts = [status && ('HTTP ' + status), detail, hint || (!detail && fallback)];
  if (body?.context?.other_file_count > 0) parts.push('Identyfikator konta w Storage: ' + userId);
  for (const value of [body?.utc, body?.request_id]) {
   if (typeof value === 'string' && /^[0-9a-fTZ:.+-]{10,40}$/i.test(value) && !detail?.includes(value)) parts.push(value);
  }
  return new Error(parts.filter(Boolean).join(' · '));
 }
 const prior=renderAdmin,el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n},button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b};
 renderAdmin=function(...args){if(active!=='👥 Konta')return prior.apply(this,args);tabs(ADMIN_PAGES,renderAdmin);const view=document.getElementById('view');if(!view)return;const client=(typeof db!=='undefined'&&db)||window.supabase?.createClient?.(window.SPORTIVRA_CONFIG?.supabaseUrl,window.SPORTIVRA_CONFIG?.supabasePublishableKey);if(!client){view.textContent='Brak połączenia z Supabase.';return}
  const root=el('section',null,'card'),status=el('p','Wczytywanie…'),search=el('input');search.type='search';search.placeholder='E-mail lub nick';search.maxLength=120;const list=el('div');root.append(el('h2','👥 Konta graczy'),el('p','Wyszukaj konto, sprawdź salda i postępy. Supabase nie pozwala na zduplikowany e-mail; znacznik ostrzega wyłącznie o powtórzonym nicku.'),search,button('Szukaj',()=>load()),status,list);view.replaceChildren(root);
  const money=v=>Number.isFinite(Number(v))?String(v):'—';
  async function erase(row) {
   if (!row.email) throw Error('To konto nie ma adresu e-mail wymaganego do potwierdzenia.');
   const typed = prompt('Trwałe usunięcie: wpisz dokładnie e-mail konta:\n' + row.email);
   if (typed === null) return;
   if (typed.trim().toLowerCase() !== row.email.toLowerCase()) {
    status.textContent = 'E-mail nie zgadza się — nic nie usunięto.';
    return;
   }
   if (!confirm('Usunąć trwale konto ' + row.email + ', jego dane i prywatne awatary?\n\nAwatary zostaną usunięte jako pierwsze. Jeśli Supabase później zablokuje usunięcie konta, tych zdjęć nie będzie można odzyskać.')) return;
   const {data, error} = await client.auth.getSession();
   if (error || !data?.session?.access_token) throw Error('Sesja wygasła. Zaloguj się ponownie w panelu Admin.');
   if (data.session.user?.id === row.user_id) throw Error('Nie można usunąć własnego konta administratora.');
   status.textContent = 'Usuwanie konta…';
   const result = await client.functions.invoke('delete-account', {
    headers: {Authorization: 'Bearer ' + data.session.access_token},
    body: {user_id: row.user_id, confirm_email: typed.trim(), remove_avatars: true}
   });
   if (result.error || result.data?.error) throw await deletionError(result, row.user_id);
   if (result.data?.deleted !== true) throw Error('Brak potwierdzenia usunięcia. Odśwież listę kont.');
   await load('Konto zostało usunięte.');
  }
  async function handleDelete(event, row) {
   const control = event.currentTarget;
   if (control.disabled || deleting.has(row.user_id)) return;
   deleting.add(row.user_id);
   control.disabled = true;
   try { await erase(row); }
   catch (err) { status.textContent = 'Nie udało się usunąć: ' + (err.message || String(err)); }
   finally {
    deleting.delete(row.user_id);
    for (const b of document.querySelectorAll('[data-sv27-delete]')) {
     if (b.dataset.sv27Delete === row.user_id) b.disabled = false;
    }
   }
  }
  async function load(successMessage = 'Gotowe.') {
   status.textContent = 'Wczytywanie…';
   list.replaceChildren();
   try {
    const result = await client.rpc('sv27_admin_accounts', {p_search: search.value.trim() || null, p_limit: 100});
    if (result.error) throw result.error;
    for (const row of result.data || []) {
     const card = el('article', null, 'card');
     const remove = button('🗑 Usuń konto trwale', event => handleDelete(event, row));
     remove.dataset.sv27Delete = row.user_id;
     remove.disabled = deleting.has(row.user_id);
     card.append(
      el('h3', row.nickname || 'Bez nicku'), el('p', row.email),
      el('p', 'Punkty: '+money(row.points)+' • monety profilu: '+money(row.profile_coins)+' • portfel: '+money(row.wallet_coins)+' • Fantasy: '+money(row.fantasy_balance)),
      el('p', 'Utworzono: '+new Date(row.created_at).toLocaleString()+(row.duplicate_nickname?' • ⚠️ powtórzony nick':'')),
      remove
     );
     list.append(card);
    }
    if (!list.children.length) list.append(el('p', 'Nie znaleziono kont.'));
    status.textContent = successMessage;
   } catch (err) {
    status.textContent = (successMessage === 'Gotowe.' ? '' : successMessage + ' ') +
     'Nie udało się pobrać kont: ' + (err.message || String(err));
   }
  }
  search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();load()}});load();
 };
})();
