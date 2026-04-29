// js/coach-screen.jsx — Schermo Coach AI con chat live (Gemini via /api/coach).
// Sostituisce il CoachScreenM esistente. Caricalo DOPO screens-mobile.jsx.
//
// Dipendenze runtime (window): React, askCoach (coach-ai.js),
// calculateTrainingLoad/getFormLabel/computeWeeklyAverage (coach-engine.jsx),
// trainingData (popolato dalla sync Strava).

(() => {
  const { useState, useEffect, useRef } = React;

  // ─── Schermo principale ─────────────────────────────────────────────────────
  function CoachScreenM({ tweaks = {}, onNav }) {
    const accent = tweaks.accentColor || '#FF4422';

    const [messages, setMessages] = useState([]);
    const [input, setInput]       = useState('');
    const [loading, setLoading]   = useState(false);
    const scrollRef = useRef(null);
    const inputRef  = useRef(null);

    // Auto-scroll quando arriva un nuovo messaggio o cambia stato loading
    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages, loading]);

    // ── Costruzione contesto da tweaks + globals dell'engine ──────────────────
    const buildContext = () => {
      const trainingData = window.trainingData || [];
      const loadHistory  = window.calculateTrainingLoad
        ? window.calculateTrainingLoad(trainingData, 90)
        : [];
      const last         = loadHistory[loadHistory.length - 1] || {};
      const formLabel    = window.getFormLabel ? window.getFormLabel(last.tsb) : null;
      const weekly       = window.computeWeeklyAverage
        ? window.computeWeeklyAverage(trainingData, 4)
        : { avgKm: tweaks.weeklyKm || 0 };

      let daysToRace = null;
      if (tweaks.raceDate) {
        const rd = new Date(tweaks.raceDate);
        if (!isNaN(rd.getTime())) {
          daysToRace = Math.ceil((rd - new Date()) / 86400000);
        }
      }

      return {
        athlete: { name: tweaks.userName },
        form: {
          ctl:      last.ctl,
          atl:      last.atl,
          tsb:      last.tsb,
          label:    formLabel?.label,
          weeklyKm: weekly?.avgKm ? +weekly.avgKm.toFixed(1) : tweaks.weeklyKm,
        },
        recentActivities: (trainingData || [])
          .slice()
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5),
        raceGoal: tweaks.raceName ? {
          distance:   tweaks.raceName,
          date:       tweaks.raceDate,
          daysToRace,
          targetTime: tweaks.raceTargetTime,
        } : null,
      };
    };

    // ── Invio messaggio ───────────────────────────────────────────────────────
    const send = async (text) => {
      const msg = (text ?? input).trim();
      if (!msg || loading) return;

      const userMessage = { role: 'user', content: msg };
      const newHistory  = [...messages, userMessage];
      setMessages(newHistory);
      setInput('');
      setLoading(true);

      try {
        if (!window.askCoach) throw new Error('coach-ai.js non caricato');
        // Passiamo la history PRIMA del nuovo msg: askCoach lo aggiunge da solo
        const reply = await window.askCoach(msg, messages, buildContext());
        setMessages([...newHistory, { role: 'assistant', content: reply }]);
      } catch (e) {
        setMessages([...newHistory, {
          role:    'assistant',
          content: `⚠️ ${e.message || 'Errore di rete'}`,
          error:   true,
        }]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };

    // ── Suggerimenti rapidi (mostrati a chat vuota) ───────────────────────────
    const suggestions = [
      'Come sto andando questa settimana?',
      tweaks.raceName ? `Sono pronta per ${tweaks.raceName}?` : 'Sono pronta per la gara?',
      'Cosa devo fare domani?',
      "Valuta l'ultimo allenamento",
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 18px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
            border: `1px solid ${accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 5.92 2 10.8C2 13.76 3.56 16.4 6 18.08V22L9.6 19.6C10.36 19.84 11.16 20 12 20C17.52 20 22 16.08 22 10.8S17.52 2 12 2Z"
                    stroke={accent} strokeWidth="1.75" fill={`${accent}22`}/>
              <circle cx="8"  cy="11" r="1.2" fill={accent}/>
              <circle cx="12" cy="11" r="1.2" fill={accent}/>
              <circle cx="16" cy="11" r="1.2" fill={accent}/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#EEEEF8', letterSpacing: '-0.2px' }}>
              Coach AI
            </div>
            <div style={{ fontSize: 11, color: 'rgba(238,238,248,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#00CFA8', boxShadow: '0 0 6px #00CFA8' }}/>
              Online · Gemini 2.5
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: 'rgba(238,238,248,0.7)',
                fontSize: 11,
                fontWeight: 500,
                padding: '6px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
              Nuova chat
            </button>
          )}
        </div>

        {/* Chat scrollabile */}
        <div ref={scrollRef} style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {messages.length === 0 ? (
            <EmptyState
              accent={accent}
              userName={tweaks.userName}
              suggestions={suggestions}
              onPick={send}
            />
          ) : (
            messages.map((m, i) => <Bubble key={i} message={m} accent={accent} />)
          )}

          {loading && <TypingIndicator accent={accent} />}
        </div>

        {/* Input bar */}
        <div style={{
          padding: '10px 12px 12px',
          background: '#0D0D1C',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <div style={{
            flex: 1,
            background: '#141428',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18,
            padding: '10px 14px',
            display: 'flex',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Chiedi al coach..."
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#EEEEF8',
                fontSize: 14,
                resize: 'none',
                lineHeight: 1.4,
                fontFamily: 'inherit',
                maxHeight: 96,
              }}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: 21,
              background: input.trim() && !loading ? accent : 'rgba(255,255,255,0.08)',
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 11L21 3L13 21L11 13L3 11Z"
                    stroke={input.trim() && !loading ? '#fff' : 'rgba(238,238,248,0.3)'}
                    strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty state con greeting + suggerimenti ────────────────────────────────
  function EmptyState({ accent, userName, suggestions, onPick }) {
    return (
      <div style={{ padding: '20px 8px' }}>
        <div style={{
          fontSize: 22, fontWeight: 700, color: '#EEEEF8',
          letterSpacing: '-0.3px', marginBottom: 6,
        }}>
          Ciao{userName ? ` ${userName}` : ''} 👋
        </div>
        <div style={{
          fontSize: 14, color: 'rgba(238,238,248,0.55)',
          lineHeight: 1.5, marginBottom: 24,
        }}>
          Sono il tuo coach AI. Conosco le tue metriche, le ultime corse e l'obiettivo gara. Chiedimi qualunque cosa.
        </div>
        <div style={{
          fontSize: 11, color: 'rgba(238,238,248,0.4)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: 10,
        }}>
          Inizia con
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onPick(s)}
              style={{
                textAlign: 'left',
                background: '#141428',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '12px 14px',
                color: '#EEEEF8',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.12s',
              }}
              onTouchStart={(e) => e.currentTarget.style.background = '#1A1A35'}
              onTouchEnd={(e)   => e.currentTarget.style.background = '#141428'}>
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Bolla messaggio ────────────────────────────────────────────────────────
  function Bubble({ message, accent }) {
    const isUser = message.role === 'user';
    return (
      <div style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 10,
      }}>
        <div style={{
          maxWidth: '82%',
          background: isUser
            ? accent
            : (message.error ? '#3a1a1a' : '#141428'),
          border: isUser
            ? 'none'
            : `1px solid ${message.error ? 'rgba(255,68,34,0.3)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '10px 14px',
          color: isUser ? '#fff' : '#EEEEF8',
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {message.content}
        </div>
      </div>
    );
  }

  // ─── Typing indicator ───────────────────────────────────────────────────────
  function TypingIndicator({ accent }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
        <div style={{
          background: '#141428',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '18px 18px 18px 4px',
          padding: '12px 16px',
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          <Dot delay="0s"    accent={accent} />
          <Dot delay="0.15s" accent={accent} />
          <Dot delay="0.3s"  accent={accent} />
        </div>
        <style>{`
          @keyframes coach-pulse {
            0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
            30%           { opacity: 1;   transform: translateY(-3px); }
          }
        `}</style>
      </div>
    );
  }

  function Dot({ delay, accent }) {
    return (
      <div style={{
        width: 6, height: 6, borderRadius: 3,
        background: accent,
        animation: `coach-pulse 1.2s ${delay} infinite ease-in-out`,
      }}/>
    );
  }

  // Esporta (override del CoachScreenM precedente in screens-mobile.jsx)
  window.CoachScreenM = CoachScreenM;
})();
