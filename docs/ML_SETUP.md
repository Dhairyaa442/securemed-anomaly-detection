# SecureMed ML Setup

## Model Results
- **Algorithm**: Isolation Forest (scikit-learn)
- **Precision**: 0.881 | **Recall**: 0.925 | **F1**: 0.902
- **Training set**: 2,080 events (2,000 normal + 80 anomalies, 4% contamination)

## Features Used
| Feature | Description |
|---|---|
| `hour` | Hour of access (0–23) |
| `day_of_week` | 0=Monday, 6=Sunday |
| `records_accessed` | Count of records in session |
| `session_duration_min` | Session length in minutes |
| `unique_record_types` | Number of distinct record types accessed |
| `is_known_ip` | 1 = recognized IP, 0 = unknown |
| `days_since_last_access` | Recency of prior access |

## Anomaly Types Detected
- **Bulk access** — >20 records in one session
- **Off-hours** — access before 6am or after 9pm
- **Unknown IP** — first-seen or foreign IP address
- **Multi-type** — accessing 4+ distinct record types
- **Rapid query** — <30s session with many records (bot-like)

## Running the API
```bash
pip install fastapi uvicorn scikit-learn pandas numpy
# Place model.pkl and scaler.pkl in same directory as securemed_api.py
uvicorn securemed_api:app --reload --port 8000
```

## API Endpoints
- `POST /score` — score a single access event
- `POST /score/batch` — score multiple events
- `GET /audit` — demo audit log with ML scores
- `GET /metrics` — model performance stats
- `GET /health` — health check

## React Integration
The SecureMed_ML.jsx portal calls `http://localhost:8000/score` for each event.
It gracefully falls back to a local heuristic if the API is unreachable.
