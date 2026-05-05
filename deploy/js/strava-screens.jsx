// js/strava-screens.jsx — Login, Setup, StravaHome with real data
const { useState, useEffect } = React;

// ─── Login Screen ─────────────────────────────────────────────────────────────
function StravaLoginScreen({ onSetup }) {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', gap:0 }}>
      {/* Logo */}
      <div style={{ width:88, height:88, borderRadius:24, background:'linear-gradient(135deg, #FC4C02, #E63900)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28, boxShadow:'0 12px 40px rgba(252,76,2,0.4)' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <path d="M13 4C13 5.1 13.9 6 15 6C16.1 6 17 5.1 17 4C17 2.9 16.1 2 15 2C13.9 2 13 2.9 13 4Z" fill="white"/>
          <path d="M5.5 18.5L8 13L11 16L13 10L16.5 18.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div style={{ color:C.text, fontSize:28, fontWeight:800, letterSpacing:'-0.5px', marginBottom:8, textAlign:'center' }}>RunCoach AI</div>
      <div style={{ color:C.sub, fontSize:15, textAlign:'center', lineHeight:1.55, marginBottom:40, maxWidth:280 }}>
        Il tuo coach personale basato sui dati reali di Strava e Garmin.
      </div>

      {/* Strava button */}
      <button onClick={() => window.location.href = buildAuthUrl()} style={{
        width:'100%', height:56, background:'#FC4C02', border:'none', borderRadius:16,
        color:'white', fontSize:16, fontWeight:700, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:12,
        boxShadow:'0 6px 24px rgba(252,76,2,0.45)', marginBottom:14,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
        </svg>
        Connetti con Strava
      </button>

      {/* Manual token setup */}
      <button onClick={onSetup} style={{
        width:'100%', height:48, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border2}`,
        borderRadius:14, color:C.sub, fontSize:14, fontWeight:500, cursor:'pointer',
      }}>
        Inserisci token manualmente
      </button>

      <div style={{ color:C.faint, fontSize:11, textAlign:'center', marginTop:28, lineHeight:1.6, maxWidth:260 }}>
        I tuoi dati restano sul dispositivo. Nessun server intermedio.
      </div>
    </div>
  );
}

// ─── Manual Setup Screen ──────────────────────────────────────────────────────
function StravaSetupScreen({ onDone, onBack }) {
  const [form, setForm] = useState({ client_secret:'', access_token:'', refresh_token:'', expires_at:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.client_secret || !form.access_token || !form.refresh_token) {
      setError('Compila tutti i campi obbligatori.'); return;
    }
    setLoading(true);
    setError('');
    try {
      const auth = {
        client_secret:  form.client_secret.trim(),
        access_token:   form.access_token.trim(),
        refresh_token:  form.refresh_token.trim(),
        expires_at:     form.expires_at ? parseInt(form.expires_at) : (Date.now()/1000 + 3600),
      };
      // Test the token
      const athlete = await fetchAthlete(auth);
      auth.athlete = athlete;
      StravaAuth.save(auth);
      onDone(auth);
    } catch(e) {
      setError('Token non valido. Verifica i dati e riprova.');
    }
    setLoading(false);
  };

  const fields = [
    { key:'client_secret',  label:'Client Secret',   placeholder:'7d29c10e...' },
    { key:'access_token',   label:'Access Token',    placeholder:'9c19061...' },
    { key:'refresh_token',  label:'Refresh Token',   placeholder:'ef381da...' },
  ];

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none', padding:'16px 20px' }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:C.sub, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:6, marginBottom:20, padding:0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke={C.sub} strokeWidth="2" strokeLinecap="round"/></svg>
        Indietro
      </button>

      <div style={{ color:C.text, fontSize:22, fontWeight:700, letterSpacing:'-0.4px', marginBottom:6 }}>Configura Strava</div>
      <div style={{ color:C.sub, fontSize:13, lineHeight:1.55, marginBottom:24 }}>
        Inserisci le credenziali dalla tua app Strava. Vengono salvate solo sul tuo dispositivo.
      </div>

      {/* Info card */}
      <div style={{ background:'rgba(77,158,255,0.1)', border:'1px solid rgba(77,158,255,0.25)', borderRadius:14, padding:'12px 14px', marginBottom:24 }}>
        <div style={{ color:C.blue, fontSize:12, fontWeight:600, marginBottom:4 }}>Dove trovo questi dati?</div>
        <div style={{ color:C.sub, fontSize:12, lineHeight:1.55 }}>
          Vai su <span style={{ color:C.blue }}>strava.com/settings/api</span> → sezione "Informazioni app" → copia Client Secret, Access Token e Refresh Token.
        </div>
      </div>

      {fields.map(f => (
        <div key={f.key} style={{ marginBottom:16 }}>
          <div style={{ color:C.sub, fontSize:12, fontWeight:600, marginBottom:6 }}>{f.label}</div>
          <input
            value={form[f.key]}
            onChange={e => set(f.key, e.target.value)}
            placeholder={f.placeholder}
            type="password"
            style={{ width:'100%', height:48, background:C.card2, border:`1px solid ${C.border2}`, borderRadius:12, padding:'0 14px', color:C.text, fontSize:13, outline:'none', fontFamily:'DM Sans,sans-serif', letterSpacing:'0.04em' }}
          />
        </div>
      ))}

      {error && (
        <div style={{ background:'rgba(255,68,50,0.1)', border:'1px solid rgba(255,68,50,0.3)', borderRadius:10, padding:'10px 14px', color:'#FF6450', fontSize:13, marginBottom:16 }}>
          {error}
        </div>
      )}

      <button onClick={handleSave} disabled={loading} style={{
        width:'100%', height:54, background: loading ? 'rgba(255,76,2,0.4)' : '#FC4C02',
        border:'none', borderRadius:14, color:'white', fontSize:15, fontWeight:700,
        cursor: loading ? 'default' : 'pointer', marginTop:8,
        boxShadow: loading ? 'none' : '0 4px 20px rgba(252,76,2,0.4)',
      }}>
        {loading ? 'Verifica in corso…' : 'Salva e Connetti'}
      </button>
    </div>
  );
}

// ─── OAuth Callback Handler ───────────────────────────────────────────────────
function OAuthCallbackScreen({ code, onDone, onError }) {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExchange = async () => {
    if (!clientSecret.trim()) { setError('Inserisci il Client Secret.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await exchangeCode(code, clientSecret.trim());
      if (data.errors) throw new Error(data.message || 'Errore');
      const auth = { ...data, client_secret: clientSecret.trim() };
      StravaAuth.save(auth);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      onDone(auth);
    } catch(e) {
      setError('Errore: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', gap:16 }}>
      <div style={{ width:64, height:64, borderRadius:32, background:'rgba(252,76,2,0.15)', border:'1px solid rgba(252,76,2,0.3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" fill="#FC4C02"/></svg>
      </div>
      <div style={{ color:C.text, fontSize:20, fontWeight:700, textAlign:'center' }}>Quasi fatto!</div>
      <div style={{ color:C.sub, fontSize:14, textAlign:'center', lineHeight:1.55, maxWidth:280 }}>
        Strava ha autorizzato l'accesso. Inserisci il Client Secret per completare.
      </div>

      <div style={{ width:'100%' }}>
        <div style={{ color:C.sub, fontSize:12, fontWeight:600, marginBottom:8 }}>Client Secret</div>
        <input
          value={clientSecret}
          onChange={e => setClientSecret(e.target.value)}
          placeholder="7d29c10e..."
          type="password"
          style={{ width:'100%', height:50, background:C.card2, border:`1px solid ${C.border2}`, borderRadius:12, padding:'0 14px', color:C.text, fontSize:13, outline:'none', fontFamily:'DM Sans,sans-serif' }}
        />
      </div>

      {error && <div style={{ background:'rgba(255,68,50,0.1)', border:'1px solid rgba(255,68,50,0.3)', borderRadius:10, padding:'10px 14px', color:'#FF6450', fontSize:13, width:'100%' }}>{error}</div>}

      <button onClick={handleExchange} disabled={loading} style={{
        width:'100%', height:54, background:'#FC4C02', border:'none', borderRadius:14,
        color:'white', fontSize:15, fontWeight:700, cursor: loading ? 'default' : 'pointer',
        boxShadow:'0 4px 20px rgba(252,76,2,0.4)',
      }}>
        {loading ? 'Connessione in corso…' : 'Completa Connessione'}
      </button>
    </div>
  );
}

// ─── Strava Home (real data) ──────────────────────────────────────────────────
function StravaHomeScreen({ auth, onNav, tweaks, onLogout }) {
  const accent = tweaks.accentColor || '#FC4C02';
  const [athlete, setAthlete] = useState(auth.athlete || null);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const validAuth = await getValidAuth();
        if (!validAuth) { onLogout(); return; }
        const [ath, acts] = await Promise.all([
          athlete ? Promise.resolve(athlete) : fetchAthlete(validAuth),
          fetchActivities(validAuth, 15),
        ]);
        setAthlete(ath);
        setActivities(acts.filter(a => a.type === 'Run'));
        // Fetch stats
        const st = await fetchStats(validAuth, ath.id);
        setStats(st);
      } catch(e) {
        setError('Errore caricamento dati: ' + e.message);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <div style={{ width:48, height:48, borderRadius:24, border:`3px solid ${accent}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
      <div style={{ color:C.sub, fontSize:14 }}>Caricamento dati Strava…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:16 }}>
      <div style={{ color:'#FF6450', fontSize:14, textAlign:'center' }}>{error}</div>
      <button onClick={onLogout} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 20px', color:C.sub, fontSize:14, cursor:'pointer' }}>Riconnetti Strava</button>
    </div>
  );

  const runs = activities.map(activityToWorkout);
  const totalKmThisYear = stats?.ytd_run_totals?.distance ? (stats.ytd_run_totals.distance/1000).toFixed(0) : '—';
  const totalRunsYear = stats?.ytd_run_totals?.count || '—';
  const biggestRun = runs.length ? Math.max(...runs.map(r => r.distance)) : 0;

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      {/* Header */}
      <div style={{ padding:'8px 20px 12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color:C.sub, fontSize:13, marginBottom:2 }}>{USER.todayLabel}, {USER.todayDate}</div>
          <div style={{ color:C.text, fontSize:24, fontWeight:700, letterSpacing:'-0.5px', lineHeight:1.15 }}>
            Ciao, {athlete?.firstname || 'Runner'} 👋
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
            <div style={{ width:6, height:6, borderRadius:3, background:'#FC4C02' }}/>
            <span style={{ color:'#FC4C02', fontSize:11, fontWeight:600 }}>Strava connesso</span>
          </div>
        </div>
        {athlete?.profile_medium ? (
          <img src={athlete.profile_medium} style={{ width:46, height:46, borderRadius:23, border:`2px solid #FC4C0244`, flexShrink:0 }} />
        ) : (
          <div style={{ width:46, height:46, borderRadius:23, background:'linear-gradient(135deg, #FC4C02, #E63900)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:'white', fontSize:18, fontWeight:700 }}>{(athlete?.firstname||'R')[0]}</span>
          </div>
        )}
      </div>

      {/* Year stats */}
      <div style={{ padding:'0 14px 14px', display:'flex', gap:8 }}>
        {[
          { val:`${totalKmThisYear} km`, lbl:'Quest\'anno', color:accent },
          { val:`${totalRunsYear}`, lbl:'Corse totali', color:C.blue },
          { val:`${biggestRun.toFixed(1)} km`, lbl:'Corsa più lunga', color:C.teal },
        ].map(s => (
          <Card key={s.lbl} style={{ flex:1, cursor:'default' }}>
            <div style={{ padding:'14px 10px', textAlign:'center' }}>
              <div style={{ color:s.color, fontSize:19, fontWeight:800 }}>{s.val}</div>
              <div style={{ color:C.faint, fontSize:10, marginTop:3, lineHeight:1.3 }}>{s.lbl}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent activities */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ color:C.text, fontSize:16, fontWeight:600, marginBottom:12 }}>Corse Recenti</div>
        {runs.length === 0 && (
          <Card style={{ cursor:'default' }}>
            <div style={{ padding:24, textAlign:'center', color:C.sub, fontSize:14 }}>Nessuna corsa trovata su Strava.</div>
          </Card>
        )}
        {runs.map((r, i) => (
          <Card key={r.id} style={{ marginBottom:10, cursor:'pointer' }} onClick={() => window.open(r.strava_url, '_blank')}>
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <TypeBadge type={r.type} small />
                    <span style={{ color:C.faint, fontSize:11 }}>{r.date}</span>
                  </div>
                  <div style={{ color:C.text, fontSize:15, fontWeight:600 }}>{r.title}</div>
                </div>
                {/* Strava link icon */}
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(252,76,2,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" fill="#FC4C02"/></svg>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {[
                  { val:`${r.distance} km`, lbl:'Distanza' },
                  { val:`${r.duration} min`, lbl:'Durata' },
                  { val:r.targetPace, lbl:'Ritmo medio' },
                ].map(m => (
                  <div key={m.lbl} style={{ flex:1, background:'rgba(255,255,255,0.05)', borderRadius:8, padding:'6px 8px' }}>
                    <div style={{ color:C.text, fontSize:12, fontWeight:600 }}>{m.val}</div>
                    <div style={{ color:C.faint, fontSize:10, marginTop:1 }}>{m.lbl}</div>
                  </div>
                ))}
                {r.elevation > 0 && (
                  <div style={{ flex:1, background:'rgba(255,255,255,0.05)', borderRadius:8, padding:'6px 8px' }}>
                    <div style={{ color:C.text, fontSize:12, fontWeight:600 }}>+{Math.round(r.elevation)}m</div>
                    <div style={{ color:C.faint, fontSize:10, marginTop:1 }}>Dislivello</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Logout */}
      <div style={{ padding:'0 14px 28px' }}>
        <button onClick={onLogout} style={{ width:'100%', height:46, background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, borderRadius:12, color:C.faint, fontSize:13, cursor:'pointer' }}>
          Disconnetti Strava
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { StravaLoginScreen, StravaSetupScreen, OAuthCallbackScreen, StravaHomeScreen });
