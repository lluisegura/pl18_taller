(() => {
  const url = 'https://acxrmvfbhedxyukbbycw.supabase.co';
  const key = 'sb_publishable_YNIrSLjAQB5VeHRyBq7b8w_x8Gh8oou';
  const sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  const vapidPublicKey = 'BGpg_p-MDJifkOS7BossO936zOjkdg9zdffzDR9JbUsdKqR7_KmQTJJAideUxggWR0OE8__9fOii4p1JEA6SG8A';
  const administrators = [
    ['Lluís Segura', 'lss@pl18.com'],
    ['lluisegura', 'lluisegura@gmail.com'],
    ['Jaume Lladó', 'jaumellabet@gmail.com'],
    ['Guillem Llompart', 'gls@pl18.com'],
    ['Maribel Martínez', 'mmm@pl18.com'],
    ['Andreu', 'prats_barcelo@hotmail.com'],
    ['Jaumet', 'jaumeb21@gmail.com'],
    ['Magdalena', 'peskymalen@hotmail.com']
  ];

  function showLogin(message = '') {
    let box = document.querySelector('#pl18-auth');
    if (!box) {
      box = document.createElement('div'); box.id = 'pl18-auth';
      box.innerHTML = '<div class="pl18-auth-card"><h1>PLAÇA 18</h1><p>Accés al tauler de personal</p><label>Administrador<select id="pl18-admin">'+administrators.map(([name,email])=>'<option value="'+email+'">'+name+'</option>').join('')+'</select></label><label>PIN de 6 dígits<input id="pl18-pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6" pattern="[0-9]{6}" placeholder="••••••"></label><button id="pl18-login">Entrar</button><small id="pl18-auth-message"></small></div>';
      document.body.appendChild(box);
      document.querySelector('#pl18-login').onclick = async () => {
        const email = document.querySelector('#pl18-admin').value;
        const pin = document.querySelector('#pl18-pin').value.trim();
        const note = document.querySelector('#pl18-auth-message');
        if (!/^\d{6}$/.test(pin)) { note.textContent = 'Introdueix un PIN de 6 dígits.'; return; }
        note.textContent = 'Comprovant l’accés…';
        const { error } = await sb.auth.signInWithPassword({ email, password: pin });
        if (error) { note.textContent = 'Administrador o PIN incorrecte.'; return; }
        location.reload();
      };
    }
    document.querySelector('#pl18-auth-message').textContent = message;
  }

  async function requireAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { showLogin(); return null; }
    const access = await sb.from('pl18_rules').select('rule_key').limit(1);
    if (access.error || !(access.data || []).length) {
      showLogin('Aquest compte no té accés al tauler. Demana a un administrador que el revisi.');
      return null;
    }
    const { data, error } = await sb.from('pl18_admins').select('id').limit(1);
    const isAdmin = !error && (data || []).length > 0;
    document.querySelector('#pl18-auth')?.remove();
    addAccountControls(isAdmin, session.user.email?.toLowerCase());
    return { session, isAdmin };
  }

  async function signOut() { await sb.auth.signOut(); location.reload(); }
  function addAccountControls(isAdmin, email) {
    if (!isAdmin || document.querySelector('#pl18-account-controls')) return;
    const controls = document.createElement('div'); controls.id = 'pl18-account-controls';
    controls.innerHTML = (email==='lss@pl18.com'?'<button type="button" id="pl18-prepare-pins">Activar PINs</button>':'')+'<button type="button" id="pl18-enable-push">Activar avisos</button><button type="button" id="pl18-change-pin">Canviar PIN</button><button type="button" id="pl18-signout">Sortir</button>';
    document.body.appendChild(controls);
    document.querySelector('#pl18-signout').onclick = signOut;
    document.querySelector('#pl18-prepare-pins')?.addEventListener('click', async () => {
      if (!confirm('Activar el PIN temporal 181818 per a tots els administradors?')) return;
      const { data, error } = await sb.functions.invoke('prepare-admin-pins');
      alert(error || data?.error ? 'No s’han pogut activar els PINs.' : 'PIN temporal activat per a '+data.prepared+' administradors.');
    });
    document.querySelector('#pl18-enable-push').onclick = enablePush;
    document.querySelector('#pl18-change-pin').onclick = async () => {
      const pin = prompt('Nou PIN de 6 dígits:');
      if (pin === null) return;
      if (!/^\d{6}$/.test(pin)) { alert('El PIN ha de tenir exactament 6 dígits.'); return; }
      const { error } = await sb.auth.updateUser({ password: pin });
      alert(error ? 'No s’ha pogut canviar el PIN.' : 'PIN actualitzat correctament.');
    };
  }
  function toUint8Array(value) {
    const padded = value + '='.repeat((4 - value.length % 4) % 4);
    const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }
  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { alert('Aquest navegador no admet avisos push.'); return; }
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone) { alert('A l’iPhone, primer comparteix el tauler i selecciona «Afegir a la pantalla d’inici». Després obre’l des de la icona i activa els avisos.'); return; }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { alert('No s’han autoritzat els avisos. Pots activar-los des dels ajustos del navegador.'); return; }
    try {
      // A Safari/Chrome pot trigar uns instants a activar el Service Worker.
      // Esperam la versió activa abans de crear la subscripció push.
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(vapidPublicKey) });
      }
      const { data, error } = await sb.functions.invoke('subscribe-push', { body: { subscription: subscription.toJSON() } });
      if (error || data?.error) throw error || new Error(data.error);
      alert('Avisos activats en aquest dispositiu.');
    } catch (error) { console.error(error); alert('No s’han pogut activar els avisos: '+(error?.message||String(error))); }
  }
  window.PL18 = { sb, requireAuth, showLogin, signOut };

  const style = document.createElement('style');
  style.textContent = '#pl18-auth{position:fixed;inset:0;background:#102c48eF;z-index:9999;display:grid;place-items:center;padding:20px}.pl18-auth-card{width:min(390px,100%);background:#fff;border-radius:14px;padding:25px;color:#12263b;box-shadow:0 15px 45px #0006}.pl18-auth-card h1{font-size:23px;margin:0 0 5px}.pl18-auth-card p{margin:0 0 20px;color:#667789}.pl18-auth-card label{display:grid;gap:6px;font-size:13px;font-weight:700;margin-top:12px}.pl18-auth-card input,.pl18-auth-card select{padding:11px;border:1px solid #cbd9e3;border-radius:7px;font:inherit;background:#fff}.pl18-auth-card button{width:100%;margin-top:14px;padding:11px;border:0;border-radius:7px;background:#1263a6;color:#fff;font:inherit;font-weight:750;cursor:pointer}.pl18-auth-card small{display:block;margin-top:12px;color:#586d7f;line-height:1.35}#pl18-account-controls{position:fixed;right:12px;bottom:12px;z-index:1000;display:flex;gap:7px}#pl18-account-controls button{border:0;border-radius:7px;padding:8px 10px;background:#102c48;color:#fff;font:600 12px system-ui;cursor:pointer}body.pl18-viewer #proposal,body.pl18-viewer #reset,body.pl18-viewer .people-list,body.pl18-viewer .assigned-card{pointer-events:none;opacity:.75}';
  document.head.appendChild(style);
})();
