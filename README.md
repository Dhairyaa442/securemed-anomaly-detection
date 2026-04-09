# SecureMed Anomaly Detection

ML-powered system to detect anomalous access patterns in healthcare data to prevent insider threats and data breaches.
---

## 🚀 Overview

SecureMed identifies suspicious access behavior in healthcare systems by analyzing patterns such as access time, volume, session behavior, and IP familiarity.

The system outputs:

* Anomaly detection (normal vs suspicious)
* Risk level (low / medium / high)

---

## 🧠 Use Case

This system helps healthcare platforms monitor access to patient records and detect:

* Insider threats
* Unauthorized data access
* Potential data breaches
* Abnormal user behavior

---

## ⚙️ Tech Stack

* Python (FastAPI)
* Scikit-learn (Isolation Forest)
* NumPy
* RESTful API (FastAPI)

---

## 🛠️ Setup Instructions

### 1. Clone repo

```bash
git clone https://github.com/Dhairyaa442/securemed-anomaly-detection.git
cd securemed_project
```

---

### 2. Backend setup

```bash
cd backend
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

### 3. Run backend

```bash
uvicorn main:app --reload
```

---

### 4. Open API

```
http://127.0.0.1:8000/docs
```

---

## 📌 API

### `/health`

Check if the service is running.

---

### `/score`

Detect anomaly for a single access event.

#### Example Request

```json
{
  "provider_id": "P123",
  "provider_name": "Dr. John Doe",
  "record_type": "Lab Results",
  "hour": 2,
  "day_of_week": 6,
  "records_accessed": 50,
  "session_duration_min": 0.5,
  "unique_record_types": 5,
  "is_known_ip": 0,
  "days_since_last_access": 0
}
```

#### Example Response

```json
{
  "is_anomaly": true,
  "score": -0.2238,
  "risk_level": "high",
  "timestamp": "2026-04-09T20:00:00Z"
}
```

---

## 🧪 Model

* Isolation Forest for anomaly detection
* Uses behavioral features such as time, access volume, and IP familiarity
* Outputs anomaly score + risk classification

---

## 🎯 Key Features

* Real-time anomaly detection
* Risk scoring for interpretability
* Lightweight and API-driven
* Easily integrable with healthcare systems

---
## 👤 Author

Dhairya Mehta
MS Software Engineering — Arizona State University
