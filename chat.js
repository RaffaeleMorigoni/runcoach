# RunCoach Mobile — Deploy su Vercel

App di coaching running con integrazione Strava e Claude AI.
Mezza Maratona di Lucca — 3 maggio 2026.

## 🚀 Quick start (10 minuti)

### 1. Carica su GitHub

```bash
# Dalla cartella del progetto
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TUO-USER/runcoach.git
git push -u origin main
```

### 2. Deploy su Vercel

1. Vai su **[vercel.com](https://vercel.com)** → login con GitHub
2. **"Add New… → Project"** → seleziona il repo `runcoach`
3. Framework Preset: **Other** (o lascia auto-detect)
4. Build Command: lascia vuoto
5. Output Directory: lascia vuoto
6. Click **"Deploy"** → ~30 secondi

URL pronto: `https://runcoach-TUOUSER.vercel.app`

### 3. Configura Claude AI (opzionale ma consigliato)

Per avere AI reale anche fuori dal preview Claude:

1. Vai su **[console.anthropic.com](https://console.anthropic.com)** → crea account
2. **API Keys → Create key** → copia la chiave (`sk-ant-...`)
3. Su Vercel: **Project → Settings → Environment Variables**
   - Name: `ANTHROPIC_API_KEY`
   - Value: incolla la chiave
   - Environments: tutti
4. **Redeploy** (Deployments → ⋯ → Redeploy)

L'app userà automaticamente l'API quando `window.claude` non è disponibile.

### 4. Configura Strava

1. Vai su **[strava.com/settings/api](https://www.strava.com/settings/api)**
2. Apri la tua app esistente → **Edit**
3. **Authorization Callback Domain**: `runcoach-TUOUSER.vercel.app`
   (solo il dominio, senza https:// e senza path)
4. Salva

## 💰 Costi

| Servizio | Costo |
|---|---|
| Vercel hobby | **Gratis** (100GB/mese) |
| Anthropic API (Haiku 4.5) | **~€0.10–0.30/giorno** uso personale |
| Strava API | **Gratis** |

## 🔄 Aggiornamenti

Ogni `git push` su `main` → deploy automatico.

## 📱 Installazione su iPhone

1. Apri l'URL Vercel in **Safari**
2. Tocca **Condividi** → **Aggiungi alla schermata Home**
3. L'app appare come icona nativa, fullscreen senza barre Safari

## 🔧 File principali

- `RunCoach Mobile.html` — entry point (root → redirect qui via vercel.json)
- `js/shared.jsx` — dati utente, gara, profilo (modifica qui PB, target, ecc.)
- `js/home-mobile.jsx` — dashboard
- `js/screens-mobile.jsx` — Piano, Coach, Progressi, Recupero, Impostazioni Gara
- `js/strava.jsx` + `js/strava-screens.jsx` — auth + sync Strava
- `js/garmin-workout.jsx` — builder allenamenti TCX per Garmin Connect
- `api/chat.js` — Edge Function proxy per Claude AI
- `vercel.json` — config deploy
- `sw.js` — service worker offline + auto-update
- `manifest.json` — PWA manifest

## 🐛 Troubleshooting

**App vecchia in cache**: chiudi completamente la PWA, riaprila. Il SW network-first prende le ultime modifiche.

**Coach AI dice "Risposte preimpostate"**:
- nel preview Claude → `window.claude` deve esserci, ricarica
- su Vercel → controlla che `ANTHROPIC_API_KEY` sia settata e fai redeploy

**Strava OAuth fallisce**: verifica che il **Callback Domain** in Strava combaci esattamente col dominio Vercel (senza https://).
