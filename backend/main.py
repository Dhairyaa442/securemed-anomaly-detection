from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import pickle, json, numpy as np
from datetime import datetime
import os


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "ml_artifacts", "model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "ml_artifacts", "scaler.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "ml_artifacts", "features.json")
METRICS_PATH = os.path.join(BASE_DIR, "ml_artifacts", "metrics.json")

print("Loading model from:", MODEL_PATH)

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

with open(FEATURES_PATH) as f:
    FEATURES = json.load(f)

with open(METRICS_PATH) as f:
    METRICS = json.load(f)

app = FastAPI(title="SecureMed API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AccessEvent(BaseModel):
    provider_id: str
    provider_name: str
    record_type: str
    action: str = "viewed"
    hour: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    records_accessed: int = Field(..., ge=1)
    session_duration_min: float = Field(..., ge=0)
    unique_record_types: int = Field(..., ge=1)
    is_known_ip: int = Field(..., ge=0, le=1)
    days_since_last_access: int = Field(..., ge=0)

class ScoreResult(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    risk_level: str
    timestamp: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/score")
def score(event: AccessEvent):
    try:
        vec = np.array([[
            event.hour,
            event.day_of_week,
            event.records_accessed,
            event.session_duration_min,
            event.unique_record_types,
            event.is_known_ip,
            event.days_since_last_access
        ]], dtype=float)

        print("Input vec:", vec, "shape:", vec.shape)

        
        expected = getattr(scaler, "n_features_in_", None)
        print("Scaler expects:", expected, "features")

        
        if expected is not None and vec.shape[1] != expected:
            if vec.shape[1] < expected:
                
                pad = np.zeros((1, expected - vec.shape[1]))
                vec = np.hstack([vec, pad])
            else:
                
                vec = vec[:, :expected]

            print("Adjusted vec:", vec, "shape:", vec.shape)

        scaled = scaler.transform(vec)
        pred = model.predict(scaled)[0]
        score_val = float(model.decision_function(scaled)[0])
        if score_val < -0.15:
            risk = "high"
        elif score_val < 0:
            risk = "medium"
        else:
            risk = "low"

        return {
            "is_anomaly": bool(pred == -1),
            "score": round(score_val, 4),
            "risk_level": risk,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/metrics")
def metrics():
    return METRICS