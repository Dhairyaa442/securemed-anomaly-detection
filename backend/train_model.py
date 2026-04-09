"""
SecureMed — Isolation Forest Training Script
Run: python train_model.py
Outputs: model.pkl, scaler.pkl, features.json, metrics.json, training_data.csv
"""
import pandas as pd, numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pickle, json

np.random.seed(42)
N_NORMAL, N_ANOMALY = 2000, 80

def make_normal():
    return pd.DataFrame({
        "hour": np.random.choice(range(7,19), N_NORMAL),
        "day_of_week": np.random.choice(range(0,5), N_NORMAL),
        "records_accessed": np.random.randint(1,8, N_NORMAL),
        "session_duration_min": np.abs(np.random.normal(12,5, N_NORMAL)),
        "unique_record_types": np.random.randint(1,3, N_NORMAL),
        "is_known_ip": np.ones(N_NORMAL),
        "days_since_last_access": np.random.randint(0,7, N_NORMAL),
        "label": 0
    })

def make_anomalies():
    types = np.random.choice(["bulk","offhours","newip","multitype"], N_ANOMALY)
    rows = []
    for t in types:
        if t=="bulk":      rows.append([np.random.choice(range(8,18)), np.random.randint(0,5), np.random.randint(40,200), np.random.normal(2,1),  np.random.randint(4,6), 1, np.random.randint(0,3), 1])
        elif t=="offhours":rows.append([np.random.choice([*range(0,6),*range(22,24)]), np.random.randint(0,7), np.random.randint(1,10), np.random.normal(20,5), np.random.randint(1,3), 1, np.random.randint(0,2), 1])
        elif t=="newip":   rows.append([np.random.choice(range(8,18)), np.random.randint(0,5), np.random.randint(5,30),  np.random.normal(15,5), np.random.randint(2,5), 0, np.random.randint(0,3), 1])
        elif t=="multitype":rows.append([np.random.choice(range(8,18)), np.random.randint(0,5), np.random.randint(10,50), np.random.normal(30,8), np.random.randint(5,6), np.random.randint(0,2), np.random.randint(0,2), 1])
    cols = ["hour","day_of_week","records_accessed","session_duration_min","unique_record_types","is_known_ip","days_since_last_access","label"]
    return pd.DataFrame(rows, columns=cols)

df = pd.concat([make_normal(), make_anomalies()], ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)
FEATURES = ["hour","day_of_week","records_accessed","session_duration_min","unique_record_types","is_known_ip","days_since_last_access"]
scaler = StandardScaler()
X_scaled = scaler.fit_transform(df[FEATURES])
model = IsolationForest(n_estimators=200, contamination=0.04, random_state=42).fit(X_scaled)

df["pred"] = model.predict(X_scaled)
tp=((df.pred==-1)&(df.label==1)).sum(); fp=((df.pred==-1)&(df.label==0)).sum(); fn=((df.pred==1)&(df.label==1)).sum()
precision=tp/(tp+fp); recall=tp/(tp+fn); f1=2*precision*recall/(precision+recall)
print(f"Precision: {precision:.3f} | Recall: {recall:.3f} | F1: {f1:.3f}")

for name, obj in [("model.pkl",model),("scaler.pkl",scaler)]:
    with open(name,"wb") as f: pickle.dump(obj,f)
with open("features.json","w") as f: json.dump(FEATURES,f)
with open("metrics.json","w") as f: json.dump({"precision":round(precision,4),"recall":round(recall,4),"f1":round(f1,4),"n_train":len(df)},f)
df.to_csv("training_data.csv",index=False)
print("Done. Artifacts saved.")
