"""
RunCoach Garmin Backend — FastAPI server per push diretto allenamenti.

Endpoints:
  POST /login            { email, password, mfa? } → { ok, needs_mfa? }
  POST /upload-workout   { tcx, schedule_date? }   → { ok, scheduled, schedule_date }
  POST /logout                                     → { ok }
  GET  /status                                     → { logged_in, email? }

Le credenziali Garmin vengono usate solo per ottenere i token OAuth, poi tenute
in RAM (e su disco cifrate con SECRET_KEY) per le sessioni successive.
"""
import os
import io
import base64
from datetime import date, datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from cryptography.fernet import Fernet

from garminconnect import (
    Garmin,
    GarminConnectAuthenticationError,
    GarminConnectConnectionError,
    GarminConnectTooManyRequestsError,
)

# ────────────── Config ──────────────
SECRET_KEY     = os.environ.get("SECRET_KEY", Fernet.generate_key().decode())
API_TOKEN      = os.environ.get("API_TOKEN")  # bearer token client → server
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
TOKEN_FILE     = os.environ.get("TOKEN_FILE", "/tmp/garmin_tokens.bin")

fernet = Fernet(SECRET_KEY.encode() if isinstance(SECRET_KEY, str) else SECRET_KEY)

# ────────────── App ──────────────
app = FastAPI(title="RunCoach Garmin Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory client (persiste tra richieste sullo stesso processo)
_client: Optional[Garmin] = None
_email:  Optional[str]    = None


def require_auth(authorization: Optional[str] = Header(None)):
    if not API_TOKEN:
        return  # auth disabilitata
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization[7:]
    if token != API_TOKEN:
        raise HTTPException(401, "Invalid token")


def _save_tokens(client: Garmin, email: str):
    """Salva i token Garmin cifrati su disco per sopravvivere a restart."""
    try:
        token_data = {
            "email":  email,
            "oauth1": client.garth.oauth1_token.dict() if client.garth.oauth1_token else None,
            "oauth2": client.garth.oauth2_token.dict() if client.garth.oauth2_token else None,
        }
        import json
        encrypted = fernet.encrypt(json.dumps(token_data).encode())
        with open(TOKEN_FILE, "wb") as f:
            f.write(encrypted)
    except Exception as e:
        print(f"[WARN] Could not save tokens: {e}")


def _load_tokens() -> Optional[Garmin]:
    """Carica i token salvati e ricostruisce il client."""
    global _email
    if not os.path.exists(TOKEN_FILE):
        return None
    try:
        with open(TOKEN_FILE, "rb") as f:
            encrypted = f.read()
        import json
        from garth import OAuth1Token, OAuth2Token
        data = json.loads(fernet.decrypt(encrypted).decode())
        client = Garmin()
        if data.get("oauth1"):
            client.garth.oauth1_token = OAuth1Token(**data["oauth1"])
        if data.get("oauth2"):
            client.garth.oauth2_token = OAuth2Token(**data["oauth2"])
        client.garth.username = data["email"]
        _email = data["email"]
        return client
    except Exception as e:
        print(f"[WARN] Could not load tokens: {e}")
        return None


# All'avvio prova a caricare i token
@app.on_event("startup")
def startup():
    global _client
    _client = _load_tokens()
    if _client:
        print(f"[INFO] Loaded saved tokens for {_email}")


# ────────────── Models ──────────────
class LoginReq(BaseModel):
    email:    EmailStr
    password: str
    mfa:      Optional[str] = None


class UploadReq(BaseModel):
    tcx:           str               # contenuto XML TCX o base64
    schedule_date: Optional[str] = None  # YYYY-MM-DD; se assente, oggi


# ────────────── Endpoints ──────────────
@app.get("/")
def root():
    return {"service": "RunCoach Garmin Backend", "logged_in": _client is not None}


@app.get("/status")
def status(_=Depends(require_auth)):
    return {"logged_in": _client is not None, "email": _email}


@app.post("/login")
def login(req: LoginReq, _=Depends(require_auth)):
    """Login a Garmin Connect. Se richiede MFA, ritorna needs_mfa=True."""
    global _client, _email
    try:
        client = Garmin(req.email, req.password)
        if req.mfa:
            client.login(req.mfa)
        else:
            client.login()
        _client = client
        _email  = req.email
        _save_tokens(client, req.email)
        return {"ok": True, "email": req.email}
    except GarminConnectAuthenticationError as e:
        msg = str(e).lower()
        if "mfa" in msg or "multi-factor" in msg or "verification" in msg:
            raise HTTPException(202, detail={"code": "MFA", "message": "MFA required"})
        raise HTTPException(401, detail={"code": "AUTH", "message": str(e)})
    except GarminConnectTooManyRequestsError as e:
        raise HTTPException(429, detail={"code": "RATE_LIMIT", "message": str(e)})
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[ERROR /login] {type(e).__name__}: {e}\n{tb}", flush=True)
        raise HTTPException(500, detail={"code": "ERROR", "message": f"{type(e).__name__}: {e}"})


@app.post("/logout")
def logout(_=Depends(require_auth)):
    global _client, _email
    _client = None
    _email  = None
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
    return {"ok": True}


@app.post("/upload-workout")
def upload_workout(req: UploadReq, _=Depends(require_auth)):
    """Carica un workout TCX e opzionalmente lo schedula a una data."""
    global _client
    if not _client:
        raise HTTPException(401, detail={"code": "NOT_LOGGED_IN", "message": "Login required"})

    # Decoded TCX content
    tcx_content = req.tcx
    if not tcx_content.strip().startswith("<"):
        # probabilmente base64
        try:
            tcx_content = base64.b64decode(tcx_content).decode("utf-8")
        except Exception:
            pass

    try:
        # Upload workout struttura
        # python-garminconnect non ha upload diretto di workout TCX strutturati,
        # ma possiamo usare l'API workout creation tramite garth.
        result = _client.upload_workout(io.BytesIO(tcx_content.encode("utf-8")))

        workout_id = None
        if isinstance(result, dict):
            workout_id = result.get("workoutId") or result.get("id")
        elif hasattr(result, "workoutId"):
            workout_id = result.workoutId

        scheduled = False
        sched_date = None
        if req.schedule_date and workout_id:
            try:
                sched = datetime.strptime(req.schedule_date, "%Y-%m-%d").date()
                _client.schedule_workout(workout_id, sched.isoformat())
                scheduled = True
                sched_date = sched.isoformat()
            except Exception as e:
                print(f"[WARN] Schedule failed: {e}")

        return {
            "ok": True,
            "workout_id": workout_id,
            "scheduled": scheduled,
            "schedule_date": sched_date,
            "message": (
                f"Allenamento caricato e schedulato per {sched_date}"
                if scheduled
                else "Allenamento caricato in Garmin Connect"
            ),
        }
    except GarminConnectAuthenticationError as e:
        _client = None
        raise HTTPException(401, detail={"code": "AUTH", "message": "Sessione scaduta. Rifai login."})
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[ERROR /upload-workout] {type(e).__name__}: {e}\n{tb}", flush=True)
        raise HTTPException(500, detail={"code": "UPLOAD_ERROR", "message": f"{type(e).__name__}: {e}"})


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
