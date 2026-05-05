// js/garmin-login-button.jsx — Pulsante login Garmin
// Stile coerente con il resto dell'app (dark + accent neon)

function GarminLoginButton({ onConnected, accent = '#00A8E1', size = 'md' }) {
  const { isConnected, loading, error, login, logout } = useGarminAuth();

  React.useEffect(() => {
    if (isConnected && onConnected) onConnected();
  }, [isConnected]);

  const styles = {
    sm: { padding: '10px 14px', fontSize: 13 },
    md: { padding: '14px 18px', fontSize: 15 },
    lg: { padding: '18px 22px', fontSize: 17 },
  }[size];

  if (loading) {
    return (
      <button disabled style={{
        ...styles,
        background: '#1a1a22',
        color: '#888',
        border: '1px solid #2a2a35',
        borderRadius: 12,
        width: '100%',
        cursor: 'wait',
      }}>
        Connessione Garmin in corso…
      </button>
    );
  }

  if (isConnected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          ...styles,
          background: `${accent}15`,
          color: accent,
          border: `1px solid ${accent}40`,
          borderRadius: 12,
          textAlign: 'center',
          fontWeight: 700,
          letterSpacing: 0.3,
        }}>
          ⌚ Garmin connesso
        </div>
        <button onClick={logout} style={{
          padding: '8px',
          background: 'transparent',
          color: '#888',
          border: '1px solid #2a2a35',
          borderRadius: 10,
          fontSize: 12,
          cursor: 'pointer',
        }}>
          Disconnetti
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button onClick={login} style={{
        ...styles,
        background: `linear-gradient(135deg, ${accent} 0%, #0078a8 100%)`,
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        width: '100%',
        cursor: 'pointer',
        fontWeight: 800,
        letterSpacing: 0.4,
        boxShadow: `0 8px 24px ${accent}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
        Connetti Garmin Connect
      </button>

      {error && (
        <div style={{
          padding: '8px 12px',
          background: '#3a1515',
          color: '#ff6666',
          border: '1px solid #5a2020',
          borderRadius: 8,
          fontSize: 12,
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { GarminLoginButton });
