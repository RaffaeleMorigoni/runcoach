// js/coach-ai.js — Wrapper client per chiamare /api/coach (Gemini).
// Pesca automaticamente i dati dall'engine deterministico (coach-engine.jsx).

(function () {
  'use strict';

  /**
   * Chiede al coach AI. Restituisce stringa di risposta.
   * @param {string} userMessage - domanda/messaggio utente
   * @param {Array} history - [{role:'user'|'assistant', content:string}, ...] turni precedenti
   * @param {Object} extraContext - override manuale del contesto (athlete/form/recentActivities/raceGoal)
   * @returns {Promise<string>}
   */
  async function askCoach(userMessage, history = [], extraContext = {}) {
    if (!userMessage || typeof userMessage !== 'string') {
      throw new Error('userMessage richiesto.');
    }

    const context = buildCoachContext(extraContext);
    const messages = [
      ...history,
      { role: 'user', content: userMessage },
    ];

    const r = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error || `Coach API error ${r.status}`;
      throw new Error(msg + (data?.detail ? ` — ${data.detail}` : ''));
    }
    return data.text || '';
  }

  /**
   * Costruisce il payload "context" per /api/coach.
   * Pesca dai globals esposti da coach-engine.jsx + eventuali override.
   */
  function buildCoachContext(override = {}) {
    const trainingData = override.recentActivities || window.trainingData || [];

    // Ricalcola load history al volo se non già in window
    const loadHistory = window.loadHistory
      || (window.calculateTrainingLoad ? window.calculateTrainingLoad(trainingData, 90) : []);
    const lastLoad = loadHistory.length ? loadHistory[loadHistory.length - 1] : {};

    // Form label da TSB
    const formLabel = window.getFormLabel ? window.getFormLabel(lastLoad.tsb) : null;

    // Media settimanale ultime 4 settimane
    const weekly = window.computeWeeklyAverage
      ? window.computeWeeklyAverage(trainingData, 4)
      : { avgKm: 0 };

    // Overtraining (se l'engine lo ha già calcolato altrove, override.form lo passa)
    const ot = window.detectOvertraining
      ? window.detectOvertraining(loadHistory.slice(-28), trainingData.slice(-14))
      : null;

    // Race goal: data + giorni rimanenti
    let raceGoal = override.raceGoal || window.raceGoal || null;
    if (raceGoal && raceGoal.date && raceGoal.daysToRace == null) {
      const d = new Date(raceGoal.date);
      raceGoal = {
        ...raceGoal,
        daysToRace: Math.ceil((d - new Date()) / 86400000),
      };
    }

    // Ultime 5 attività in ordine cronologico decrescente
    const recent = (trainingData || [])
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return {
      athlete: override.athlete || window.athlete || {},
      form: override.form || {
        ctl: lastLoad.ctl,
        atl: lastLoad.atl,
        tsb: lastLoad.tsb,
        label: formLabel?.label,
        vdot: window.currentVDOT || null,
        weeklyKm: weekly?.avgKm ? +weekly.avgKm.toFixed(1) : null,
        overtrainingRisk: ot?.risk || null,
      },
      recentActivities: recent,
      raceGoal,
    };
  }

  // Esporta sui globals (coerente con il pattern di coach-engine.jsx)
  Object.assign(window, { askCoach, buildCoachContext });
})();
