# RunCoach Garmin Backend

Server Python (FastAPI) che fa da ponte tra l'app RunCoach e Garmin Connect.
Permette il **push diretto degli allenamenti** dall'app al tuo orologio Garmin.

## Perché serve

Garmin **non ha un'API pubblica** per pushare allenamenti strutturati. Tutti i
servizi che lo fanno (TrainingPeaks, Final Surge, ecc.) usano gli endpoint
ufficiali tramite OAuth, oppure — come questo backend — usano `python-garminconnect`
che simula il login con email/password.

**Le tue credenziali NON passano dai server di RunCoach.** Vivono solo sul
backend che deployi tu (Railway, Render, Fly.io, VPS).

## Deploy su Railway (gratis, 5 min)

1. Vai su [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Seleziona il tuo fork del repo, **Root Directory: `backend`**
3. Variabili d'ambiente da impostare in **Settings → Variables**:
   - `SECRET_KEY`     — chiave Fernet per cifrare i token. Genera con: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
   - `API_TOKEN`      — bearer token che l'app userà (es. una stringa random lunga). **Tieni segreta.**
   - `ALLOWED_ORIGIN` — l'URL della tua app Vercel (es. `https://runcoach-nu.vercel.app`)
4. Railway ti dà un URL del tipo `https://runcoach-backend-production.up.railway.app`
5. Nell'app RunCoach → tab Allenamenti → "Configura push diretto a Garmin":
   - URL backend: l'URL Railway
   - Email/password: le tue credenziali Garmin
   - (eventuale codice MFA se hai 2FA attivo)

## Deploy alternativo (Render / Fly.io / VPS)

```bash
cd backend
pip install -r requirements.txt
SECRET_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())") \
API_TOKEN=il-tuo-token-segreto \
ALLOWED_ORIGIN=https://runcoach-nu.vercel.app \
uvicorn server:app --host 0.0.0.0 --port 8000
```

## Endpoint

| Metodo | Path                | Descrizione                                  |
|--------|---------------------|----------------------------------------------|
| POST   | `/login`            | Login Garmin (eventuale MFA)                 |
| POST   | `/upload-workout`   | Push TCX + opzionale schedule date           |
| POST   | `/logout`           | Pulisce i token salvati                      |
| GET    | `/status`           | Stato della sessione                         |

Tutti richiedono header `Authorization: Bearer <API_TOKEN>` se `API_TOKEN` è
configurato.

## Sicurezza

- Le credenziali Garmin si usano **una volta sola** durante il login: vengono
  scambiate con un OAuth token salvato cifrato (Fernet) sul filesystem del backend.
- Il backend **non logga password**.
- Usa sempre HTTPS (Railway/Render lo fanno di default).
- Cambia `API_TOKEN` se sospetti compromissioni.

## Limitazioni

- Garmin può rate-limitare login frequenti (errore 429). Il backend riusa i token salvati per non rifare login ad ogni richiesta.
- Se Garmin cambia auth (è già successo), bisognerà aggiornare `garminconnect` alla versione più recente.
- Modifiche programmate Garmin: solo workout di tipo Running (5K/tempo/intervalli/lunghi). Multi-sport non supportati in questa versione.
