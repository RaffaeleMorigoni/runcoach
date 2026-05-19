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


class WorkoutStep(BaseModel):
    type:        str             # warmup | interval | recovery | cooldown | run | rest
    duration:    Optional[str] = None   # 'TIME:600' (sec) | 'DISTANCE:1000' (m) | 'OPEN' | 'LAP_BUTTON'
    target_type: Optional[str] = None   # 'pace' | 'hr' | 'open'
    target_low:  Optional[float] = None # m/s per pace, bpm per hr
    target_high: Optional[float] = None
    note:        Optional[str] = None


class UploadReq(BaseModel):
    name:          Optional[str] = None
    description:   Optional[str] = None
    sport_type:    Optional[str] = 'running'
    steps:         Optional[list[WorkoutStep]] = None  # nuovo formato JSON
    tcx:           Optional[str] = None                 # legacy, ignorato
    schedule_date: Optional[str] = None


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


# ─── Helpers JSON Garmin ──────────────────────────────────────────────────
STEP_TYPE_MAP = {
    'warmup':   {'stepTypeId': 1, 'stepTypeKey': 'warmup'},
    'cooldown': {'stepTypeId': 2, 'stepTypeKey': 'cooldown'},
    'interval': {'stepTypeId': 3, 'stepTypeKey': 'interval'},
    'recovery': {'stepTypeId': 4, 'stepTypeKey': 'recovery'},
    'rest':     {'stepTypeId': 5, 'stepTypeKey': 'rest'},
    'run':      {'stepTypeId': 6, 'stepTypeKey': 'other'},
    'other':    {'stepTypeId': 6, 'stepTypeKey': 'other'},
}

DURATION_TYPE_MAP = {
    'TIME':     {'conditionTypeId': 2, 'conditionTypeKey': 'time'},
    'DISTANCE': {'conditionTypeId': 3, 'conditionTypeKey': 'distance'},
    'OPEN':     {'conditionTypeId': 1, 'conditionTypeKey': 'lap.button'},
    'LAP_BUTTON': {'conditionTypeId': 1, 'conditionTypeKey': 'lap.button'},
}

TARGET_TYPE_MAP = {
    'open': {'workoutTargetTypeId': 1, 'workoutTargetTypeKey': 'no.target'},
    'pace': {'workoutTargetTypeId': 6, 'workoutTargetTypeKey': 'pace.zone'},
    'hr':   {'workoutTargetTypeId': 4, 'workoutTargetTypeKey': 'heart.rate.zone'},
}


def _build_step(idx: int, s: dict) -> dict:
    stype = STEP_TYPE_MAP.get(s.get('type', 'run'), STEP_TYPE_MAP['run'])

    # Duration: "TIME:600" → time/600s, "DISTANCE:1000" → distance/1000m, "OPEN"/"LAP_BUTTON"
    dur     = (s.get('duration') or 'OPEN').upper()
    dur_val = None
    if ':' in dur:
        kind, val = dur.split(':', 1)
        try: dur_val = float(val)
        except ValueError: dur_val = None
        dur = kind
    dtype = DURATION_TYPE_MAP.get(dur, DURATION_TYPE_MAP['OPEN'])

    # Target
    ttype_key = (s.get('target_type') or 'open').lower()
    ttype     = TARGET_TYPE_MAP.get(ttype_key, TARGET_TYPE_MAP['open'])

    step = {
        'type':                'ExecutableStepDTO',
        'stepOrder':           idx,
        'stepType':            stype,
        'childStepId':         None,
        'description':         s.get('note') or '',
        'endCondition':        dtype,
        'endConditionValue':   dur_val,
        'preferredEndConditionUnit': None,
        'endConditionCompare': None,
        'targetType':          ttype,
        'targetValueOne':      s.get('target_low'),
        'targetValueTwo':      s.get('target_high'),
        'targetValueUnit':     None,
        'zoneNumber':          None,
    }
    return step


def _build_workout_json(req: UploadReq) -> dict:
    name  = req.name or f"Workout {date.today().isoformat()}"
    steps = req.steps or []
    workout_steps = [_build_step(i + 1, s.dict()) for i, s in enumerate(steps)]

    return {
        'sportType': {
            'sportTypeId':  1,
            'sportTypeKey': 'running',
        },
        'workoutName':         name,
        'description':         req.description or '',
        'workoutSegments': [{
            'segmentOrder':   1,
            'sportType': {
                'sportTypeId':  1,
                'sportTypeKey': 'running',
            },
            'workoutSteps':   workout_steps,
        }],
    }


@app.post("/upload-workout")
def upload_workout(req: UploadReq, _=Depends(require_auth)):
    """Crea un workout strutturato su Garmin Connect e opzionalmente lo schedula."""
    global _client
    if not _client:
        raise HTTPException(401, detail={"code": "NOT_LOGGED_IN", "message": "Login required"})

    if not req.steps:
        raise HTTPException(400, detail={"code": "BAD_REQUEST", "message": "steps[] è obbligatorio"})

    try:
        payload = _build_workout_json(req)
        print(f"[INFO] Creating Garmin workout: {payload['workoutName']} with {len(payload['workoutSegments'][0]['workoutSteps'])} steps", flush=True)
        result = _client.upload_workout(payload)

        workout_id = None
        if isinstance(result, dict):
            workout_id = result.get("workoutId") or result.get("id")
        elif hasattr(result, "workoutId"):
            workout_id = result.workoutId
        elif isinstance(result, (int, str)):
            workout_id = result

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


# ────────────── READ Endpoints (Garmin → app) ──────────────

@app.get("/activities")
def get_activities(limit: int = 20, _=Depends(require_auth)):
    """Ultime N attività in formato Strava-like per merge facile lato client."""
    global _client
    if not _client:
        raise HTTPException(401, detail={"code": "NOT_LOGGED_IN", "message": "Login required"})
    try:
        raw = _client.get_activities(0, limit)
        out = []
        for a in raw or []:
            type_key = (a.get("activityType") or {}).get("typeKey") or "running"
            if "run" not in type_key and "walk" not in type_key and "cycling" not in type_key:
                continue
            start = a.get("startTimeLocal") or a.get("startTimeGMT")
            dist = a.get("distance") or 0
            mov  = a.get("movingDuration") or a.get("duration") or 0
            avg_speed = (dist / mov) if mov else 0
            out.append({
                "id":                  a.get("activityId"),
                "name":                a.get("activityName") or "Activity",
                "type":                "Run" if "run" in type_key else type_key.capitalize(),
                "source":              "garmin",
                "start_date":          start,
                "start_date_local":    start,
                "distance":            dist,
                "moving_time":         int(mov),
                "elapsed_time":        int(a.get("duration") or mov),
                "average_speed":       avg_speed,
                "average_heartrate":   a.get("averageHR"),
                "max_heartrate":       a.get("maxHR"),
                "total_elevation_gain": a.get("elevationGain") or 0,
                "calories":            a.get("calories"),
            })
        return {"ok": True, "activities": out, "count": len(out)}
    except GarminConnectAuthenticationError:
        _client = None
        raise HTTPException(401, detail={"code": "AUTH", "message": "Sessione scaduta"})
    except Exception as e:
        import traceback
        print(f"[ERROR /activities] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
        raise HTTPException(500, detail={"code": "ERROR", "message": str(e)})


@app.get("/wellness/today")
def get_wellness(_=Depends(require_auth)):
    """Snapshot oggi: sleep + stress + body battery + resting HR + steps."""
    global _client
    if not _client:
        raise HTTPException(401, detail={"code": "NOT_LOGGED_IN", "message": "Login required"})
    today = date.today().isoformat()
    out = {"date": today}
    try:
        try:
            sleep = _client.get_sleep_data(today)
            if sleep:
                d = sleep.get("dailySleepDTO") or {}
                out["sleep"] = {
                    "duration_h":   round((d.get("sleepTimeSeconds") or 0) / 3600, 2),
                    "score":        (d.get("sleepScores") or {}).get("overall", {}).get("value"),
                    "deep_min":     round((d.get("deepSleepSeconds") or 0) / 60),
                    "rem_min":      round((d.get("remSleepSeconds") or 0) / 60),
                    "light_min":    round((d.get("lightSleepSeconds") or 0) / 60),
                    "awake_min":    round((d.get("awakeSleepSeconds") or 0) / 60),
                }
        except Exception as e:
            print(f"[WARN] sleep: {e}", flush=True)

        try:
            stats = _client.get_stats(today)
            if stats:
                out["resting_hr"]  = stats.get("restingHeartRate")
                out["steps"]       = stats.get("totalSteps")
                out["body_battery"] = {
                    "highest": stats.get("bodyBatteryHighestValue"),
                    "lowest":  stats.get("bodyBatteryLowestValue"),
                    "current": stats.get("bodyBatteryMostRecentValue"),
                }
                out["stress_avg"]  = stats.get("averageStressLevel")
        except Exception as e:
            print(f"[WARN] stats: {e}", flush=True)

        try:
            hrv = _client.get_hrv_data(today)
            if hrv and hrv.get("hrvSummary"):
                out["hrv"] = {
                    "last_night_avg": hrv["hrvSummary"].get("lastNightAvg"),
                    "status":         hrv["hrvSummary"].get("status"),
                    "baseline":       (hrv["hrvSummary"].get("baseline") or {}).get("balancedLow"),
                }
        except Exception as e:
            print(f"[WARN] hrv: {e}", flush=True)

        return {"ok": True, "data": out}
    except GarminConnectAuthenticationError:
        _client = None
        raise HTTPException(401, detail={"code": "AUTH", "message": "Sessione scaduta"})
    except Exception as e:
        import traceback
        print(f"[ERROR /wellness/today] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
        raise HTTPException(500, detail={"code": "ERROR", "message": str(e)})


@app.get("/training-status")
def get_training_status(_=Depends(require_auth)):
    """Training status, VO2max, training readiness, recovery time."""
    global _client
    if not _client:
        raise HTTPException(401, detail={"code": "NOT_LOGGED_IN", "message": "Login required"})
    today = date.today().isoformat()
    out = {"date": today}
    try:
        try:
            ts = _client.get_training_status(today)
            if ts:
                rec = ts.get("mostRecentVO2Max") or {}
                gen = rec.get("generic") or {}
                out["vo2max"] = gen.get("vo2MaxValue") or gen.get("vo2MaxPreciseValue")
                ts_data = (ts.get("mostRecentTrainingStatus") or {}).get("latestTrainingStatusData") or {}
                # Garmin restituisce un dict indicizzato per device, prendo il primo valore
                if isinstance(ts_data, dict) and ts_data:
                    first = next(iter(ts_data.values()), {}) if isinstance(ts_data, dict) else {}
                    if isinstance(first, dict):
                        out["status"]        = first.get("trainingStatusFeedbackPhrase") or first.get("trainingStatus")
                        out["load"]          = first.get("acuteTrainingLoadDTO", {}).get("acwrPercent")
                        out["fitness_level"] = first.get("fitnessTrend")
        except Exception as e:
            print(f"[WARN] training_status: {e}", flush=True)

        try:
            ready = _client.get_training_readiness(today)
            if ready and isinstance(ready, list) and ready:
                r = ready[0]
                out["readiness"] = {
                    "score":   r.get("score"),
                    "level":   r.get("level"),
                    "feedback": r.get("feedbackLong") or r.get("feedbackShort"),
                }
        except Exception as e:
            print(f"[WARN] readiness: {e}", flush=True)

        try:
            recov = _client.get_user_summary(today)
            if recov:
                # In get_stats c'è già recoveryTime? Provo qui
                rt = recov.get("nextRecoveryTime") or recov.get("recoveryTime")
                if rt is not None:
                    out["recovery_time_h"] = rt
        except Exception as e:
            print(f"[WARN] recovery: {e}", flush=True)

        return {"ok": True, "data": out}
    except GarminConnectAuthenticationError:
        _client = None
        raise HTTPException(401, detail={"code": "AUTH", "message": "Sessione scaduta"})
    except Exception as e:
        import traceback
        print(f"[ERROR /training-status] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
        raise HTTPException(500, detail={"code": "ERROR", "message": str(e)})


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
