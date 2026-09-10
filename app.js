(() => {
  const url = 'https://acxrmvfbhedxyukbbycw.supabase.co';
  const key = 'sb_publishable_YNIrSLjAQB5VeHRyBq7b8w_x8Gh8oou';
  const sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });

  function showLogin(message = '') {
    let box = document.querySelector('#pl18-auth');
    if (!box) {
      box = document.createElement('div'); box.id = 'pl18-auth';
      box.innerHTML = '<div class="pl18-auth-card"><h1>PLAÇA 18</h1><p>Accés al tauler de personal</p><label>Correu electrònic<input id="pl18-email" type="email" autocomplete="email" placeholder="nom@empresa.com"></label><button id="pl18-login">Enviar enllaç d’accés</button><small id="pl18-auth-message"></small></div>';
      document.body.appendChild(box);
      document.querySelector('#pl18-login').onclick = async () => {
        const email = document.querySelector('#pl18-email').value.trim().toLowerCase();
        const note = document.querySelector('#pl18-auth-message');
        if (!email) { note.textContent = 'Introdueix el teu correu electrònic.'; return; }
        note.textContent = 'Enviant l’enllaç…';
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
        note.textContent = error ? error.message : 'T’hem enviat un enllaç al correu. Obre’l en aquest mateix dispositiu.';
      };
    }
    document.querySelector('#pl18-auth-message').textContent = message;
  }

  async function requireAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { showLogin(); return null; }
    const access = await sb.from('pl18_rules').select('rule_key').limit(1);
    if (access.error || !(access.data || []).length) {
      showLogin('Aquest correu no té accés al tauler. Demana a un administrador que l’hi doni.');
      return null;
    }
    const { data, error } = await sb.from('pl18_admins').select('id').limit(1);
    const isAdmin = !error && (data || []).length > 0;
    document.querySelector('#pl18-auth')?.remove();
    return { session, isAdmin };
  }

  async function signOut() { await sb.auth.signOut(); location.reload(); }
  window.PL18 = { sb, requireAuth, showLogin, signOut };

  const style = document.createElement('style');
  style.textContent = '#pl18-auth{position:fixed;inset:0;background:#102c48eF;z-index:9999;display:grid;place-items:center;padding:20px}.pl18-auth-card{width:min(390px,100%);background:#fff;border-radius:14px;padding:25px;color:#12263b;box-shadow:0 15px 45px #0006}.pl18-auth-card h1{font-size:23px;margin:0 0 5px}.pl18-auth-card p{margin:0 0 20px;color:#667789}.pl18-auth-card label{display:grid;gap:6px;font-size:13px;font-weight:700}.pl18-auth-card input{padding:11px;border:1px solid #cbd9e3;border-radius:7px;font:inherit}.pl18-auth-card button{width:100%;margin-top:14px;padding:11px;border:0;border-radius:7px;background:#1263a6;color:#fff;font:inherit;font-weight:750;cursor:pointer}.pl18-auth-card small{display:block;margin-top:12px;color:#586d7f;line-height:1.35}body.pl18-viewer #proposal,body.pl18-viewer #reset,body.pl18-viewer .people-list,body.pl18-viewer .assigned-card{pointer-events:none;opacity:.75}';
  document.head.appendChild(style);
})();
