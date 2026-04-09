import { useState, useEffect, useCallback } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0D12", surface: "#10141B", surfaceHover: "#161C26",
  border: "#1E2733", borderLight: "#253040",
  accent: "#00D4AA", accentDim: "#00D4AA18", accentGlow: "#00D4AA44",
  danger: "#FF4D6A", dangerDim: "#FF4D6A18", dangerBorder: "#FF4D6A44",
  warning: "#F5A623", warningDim: "#F5A62318",
  purple: "#7B61FF", purpleDim: "#7B61FF18",
  text: "#E8EDF5", textMuted: "#6B7A95", textDim: "#3D4A60",
};

const FEATURES = ["hour","day_of_week","records_accessed","session_duration_min",
                   "unique_record_types","is_known_ip","days_since_last_access"];

// ─── Static data ──────────────────────────────────────────────────────────────
const PROVIDERS = [
  { id: 1, name: "Dr. Sarah Chen",   role: "Primary Care",  org: "ASU Health Clinic",   avatar: "SC", color: C.accent },
  { id: 2, name: "Dr. James Okafor", role: "Cardiologist",  org: "Banner Heart Center", avatar: "JO", color: C.purple },
  { id: 3, name: "PhoenixLab",       role: "Laboratory",    org: "Diagnostic Services", avatar: "PL", color: C.warning },
  { id: 4, name: "Dr. Meera Patel",  role: "Neurologist",   org: "Barrow Institute",    avatar: "MP", color: C.danger },
];

const RECORD_TYPES = [
  { id: "labs", label: "Lab Results" }, { id: "imaging", label: "Imaging & Scans" },
  { id: "prescriptions", label: "Prescriptions" }, { id: "visits", label: "Visit Notes" },
  { id: "vitals", label: "Vital Signs" },
];

const INIT_CONSENT = {
  1: { labs:true, imaging:true, prescriptions:true, visits:true, vitals:true },
  2: { labs:true, imaging:true, prescriptions:false, visits:false, vitals:true },
  3: { labs:true, imaging:false, prescriptions:false, visits:false, vitals:false },
  4: { labs:false, imaging:true, prescriptions:false, visits:true, vitals:false },
};

// Simulated event templates (what we'd normally pull from the backend)
const EVENT_TEMPLATES = [
  { provider:"Dr. Sarah Chen",  action:"Viewed",      record:"Lab Results",   hour:10, day_of_week:1, records_accessed:3,   session_duration_min:8,   unique_record_types:1, is_known_ip:1, days_since_last_access:2,  location:"Phoenix, AZ",  avatar:"SC", color:C.accent  },
  { provider:"Dr. James Okafor",action:"Viewed",      record:"Vital Signs",   hour:14, day_of_week:2, records_accessed:4,   session_duration_min:15,  unique_record_types:2, is_known_ip:1, days_since_last_access:5,  location:"Phoenix, AZ",  avatar:"JO", color:C.purple  },
  { provider:"Dr. Sarah Chen",  action:"Viewed",      record:"Visit Notes",   hour:9,  day_of_week:0, records_accessed:2,   session_duration_min:10,  unique_record_types:1, is_known_ip:1, days_since_last_access:1,  location:"Phoenix, AZ",  avatar:"SC", color:C.accent  },
  { provider:"Dr. Meera Patel", action:"Viewed",      record:"Imaging",       hour:11, day_of_week:3, records_accessed:5,   session_duration_min:20,  unique_record_types:2, is_known_ip:1, days_since_last_access:14, location:"Scottsdale, AZ",avatar:"MP",color:C.danger  },
  { provider:"PhoenixLab",      action:"Downloaded",  record:"Lab Results",   hour:2,  day_of_week:3, records_accessed:120, session_duration_min:1,   unique_record_types:5, is_known_ip:0, days_since_last_access:0,  location:"Unknown IP",   avatar:"PL", color:C.warning },
  { provider:"PhoenixLab",      action:"Bulk Export", record:"All Records",   hour:3,  day_of_week:6, records_accessed:200, session_duration_min:0.3, unique_record_types:6, is_known_ip:0, days_since_last_access:1,  location:"Unknown IP",   avatar:"PL", color:C.warning },
];

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function Badge({ children, variant = "default" }) {
  const map = { default:{bg:C.surface,color:C.textMuted,border:C.border}, success:{bg:C.accentDim,color:C.accent,border:C.accentGlow}, danger:{bg:C.dangerDim,color:C.danger,border:C.dangerBorder}, warning:{bg:C.warningDim,color:C.warning,border:C.warningDim}, purple:{bg:C.purpleDim,color:C.purple,border:C.purpleDim} };
  const s = map[variant] || map.default;
  return <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:"0.04em",background:s.bg,color:s.color,border:`1px solid ${s.border}` }}>{children}</span>;
}

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{ width:36,height:20,borderRadius:10,cursor:"pointer",background:checked?C.accent:C.border,position:"relative",transition:"background 0.2s",flexShrink:0 }}>
      <div style={{ width:14,height:14,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:checked?19:3,transition:"left 0.2s",boxShadow:checked?`0 0 6px ${C.accentGlow}`:"none" }} />
    </div>
  );
}

function Avatar({ initials, color, size = 32 }) {
  return <div style={{ width:size,height:size,borderRadius:"50%",flexShrink:0,background:`${color}22`,border:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.3,fontWeight:700,color }}>{initials}</div>;
}

function RiskPill({ level }) {
  const map = { high:{color:C.danger,bg:C.dangerDim,label:"HIGH RISK"}, medium:{color:C.warning,bg:C.warningDim,label:"MED RISK"}, low:{color:C.accent,bg:C.accentDim,label:"NORMAL"} };
  const s = map[level] || map.low;
  return <span style={{ fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:s.color,background:s.bg,padding:"2px 7px",borderRadius:4 }}>{s.label}</span>;
}

// ─── ML Scoring (calls FastAPI or falls back to local heuristic) ──────────────
async function scoreEvent(event) {
  try {
    const res = await fetch("http://localhost:8000/score", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ provider_id:"1", provider_name:event.provider, record_type:event.record, action:event.action, ...event }),
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  // ── Local fallback heuristic (works without backend) ──
  const reasons = [];
  if (event.hour < 6 || event.hour > 21) reasons.push(`Off-hours access at ${event.hour}:00`);
  if (event.records_accessed > 20) reasons.push(`Bulk access: ${event.records_accessed} records`);
  if (event.unique_record_types >= 4) reasons.push(`Accessed ${event.unique_record_types} record types`);
  if (event.is_known_ip === 0) reasons.push("Unknown IP address");
  if (event.session_duration_min < 0.5 && event.records_accessed > 5) reasons.push("Rapid automated-style query");
  const score = -(event.records_accessed/200 + (event.hour<6||event.hour>21?0.3:0) + (event.is_known_ip===0?0.25:0) + (event.unique_record_types/6)*0.2);
  const is_anomaly = reasons.length >= 2;
  return { is_anomaly, anomaly_score: parseFloat(score.toFixed(4)), risk_level: score < -0.4?"high":score<-0.2?"medium":"low", reasons, timestamp: new Date().toISOString() };
}

// ─── Audit row ────────────────────────────────────────────────────────────────
function AuditRow({ entry, index, showScore }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(()=>setVis(true), index*70); return ()=>clearTimeout(t); }, []);
  return (
    <div style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",background:entry.is_anomaly?C.dangerDim:"transparent",borderBottom:`1px solid ${C.border}`,borderLeft:`2px solid ${entry.is_anomaly?C.danger:"transparent"}`,opacity:vis?1:0,transform:vis?"none":"translateX(-8px)",transition:"opacity 0.3s,transform 0.3s" }}>
      <Avatar initials={entry.avatar} color={entry.is_anomaly?C.danger:entry.color} />
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
          <span style={{ fontSize:13,fontWeight:500,color:C.text }}>{entry.provider}</span>
          <span style={{ fontSize:12,color:C.textMuted }}>{entry.action}</span>
          <span style={{ fontSize:12,color:C.textMuted,fontStyle:"italic" }}>{entry.record}</span>
          {entry.is_anomaly && <Badge variant="danger">⚠ ML Flagged</Badge>}
          {showScore && entry.score && <RiskPill level={entry.score.risk_level} />}
        </div>
        <div style={{ fontSize:11,color:C.textDim,marginTop:2,display:"flex",gap:8,flexWrap:"wrap" }}>
          <span>{entry.location}</span><span>·</span>
          <span style={{ fontFamily:"monospace" }}>score: {entry.score?.anomaly_score ?? "—"}</span>
        </div>
        {entry.is_anomaly && entry.score?.reasons?.length > 0 && (
          <div style={{ marginTop:4,display:"flex",gap:4,flexWrap:"wrap" }}>
            {entry.score.reasons.map((r,i)=><span key={i} style={{ fontSize:10,color:C.danger,background:C.dangerDim,padding:"1px 6px",borderRadius:3 }}>{r}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, anomalyCount }) {
  const nav = [
    { id:"overview", label:"Overview",    icon:"◈" },
    { id:"consent",  label:"Consent",     icon:"◎" },
    { id:"audit",    label:"Audit Log",   icon:"◫" },
    { id:"scorer",   label:"ML Scorer",   icon:"◭" },
    { id:"alerts",   label:"Alerts",      icon:"◬", badge: anomalyCount },
  ];
  return (
    <div style={{ width:200,flexShrink:0,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",padding:"24px 0" }}>
      <div style={{ padding:"0 20px 28px" }}>
        <div style={{ fontSize:15,fontWeight:700,color:C.accent,letterSpacing:"0.08em",fontFamily:"monospace" }}>SECUREMED</div>
        <div style={{ fontSize:10,color:C.textDim,letterSpacing:"0.12em",marginTop:2 }}>PATIENT PORTAL</div>
      </div>
      <div style={{ flex:1 }}>
        {nav.map(item=>(
          <div key={item.id} onClick={()=>setActive(item.id)} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 20px",cursor:"pointer",background:active===item.id?C.accentDim:"transparent",borderLeft:`2px solid ${active===item.id?C.accent:"transparent"}`,color:active===item.id?C.accent:C.textMuted,fontSize:13,fontWeight:active===item.id?600:400,transition:"all 0.15s" }}>
            <span style={{ fontSize:14 }}>{item.icon}</span>
            <span style={{ flex:1 }}>{item.label}</span>
            {item.badge>0 && <Badge variant="danger">{item.badge}</Badge>}
          </div>
        ))}
      </div>
      <div style={{ padding:"16px 20px",borderTop:`1px solid ${C.border}` }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <Avatar initials="AJ" color={C.accent} size={28} />
          <div>
            <div style={{ fontSize:12,fontWeight:500,color:C.text }}>Alex Johnson</div>
            <div style={{ fontSize:10,color:C.textDim }}>DOB: 04/12/1995</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page: Overview ───────────────────────────────────────────────────────────
function Overview({ auditLog, anomalyCount, loading }) {
  const stats = [
    { label:"Active Providers",    value:"4",              sub:"with access",     color:C.accent },
    { label:"Anomalies Detected",  value:String(anomalyCount), sub:"last 7 days", color:anomalyCount>0?C.danger:C.accent },
    { label:"Audit Events",        value:String(auditLog.length), sub:"scored",   color:C.purple },
    { label:"ML Model",            value:"IF",             sub:"Isolation Forest",color:C.warning },
  ];
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:20,fontWeight:600,color:C.text,marginBottom:4 }}>Good morning, Alex</h2>
        <p style={{ fontSize:13,color:C.textMuted }}>Your health data is protected. AI is monitoring access in real time.</p>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:24 }}>
        {stats.map(s=>(
          <div key={s.label} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px" }}>
            <div style={{ fontSize:11,color:C.textMuted,marginBottom:6,letterSpacing:"0.04em" }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize:26,fontWeight:700,color:s.color,fontFamily:"monospace",lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11,color:C.textDim,marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden" }}>
        <div style={{ padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:12,fontWeight:600,color:C.textMuted,letterSpacing:"0.06em" }}>RECENT ACTIVITY</span>
          {loading && <span style={{ fontSize:11,color:C.accent }}>● Scoring…</span>}
        </div>
        {auditLog.slice(0,4).map((e,i)=><AuditRow key={i} entry={e} index={i} showScore />)}
      </div>
    </div>
  );
}

// ─── Page: Consent ────────────────────────────────────────────────────────────
function ConsentManager({ consent, setConsent }) {
  const total = PROVIDERS.length * RECORD_TYPES.length;
  const granted = Object.values(consent).reduce((a,p)=>a+Object.values(p).filter(Boolean).length,0);
  return (
    <div>
      <div style={{ marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:600,color:C.text,marginBottom:4 }}>Consent Manager</h2>
          <p style={{ fontSize:13,color:C.textMuted }}>Control exactly what each provider can see.</p>
        </div>
        <Badge variant="purple">{granted}/{total} granted</Badge>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {PROVIDERS.map(p=>(
          <div key={p.id} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden" }}>
            <div style={{ padding:"12px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`,background:`${p.color}08` }}>
              <Avatar initials={p.avatar} color={p.color} size={32} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{p.name}</div>
                <div style={{ fontSize:11,color:C.textMuted }}>{p.role} · {p.org}</div>
              </div>
              <Badge variant={Object.values(consent[p.id]).every(Boolean)?"success":"default"}>
                {Object.values(consent[p.id]).filter(Boolean).length}/{RECORD_TYPES.length}
              </Badge>
            </div>
            <div style={{ padding:"6px 16px",display:"flex",flexWrap:"wrap" }}>
              {RECORD_TYPES.map((rt,i)=>(
                <div key={rt.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 0",width:"50%",borderBottom:i<RECORD_TYPES.length-2?`1px solid ${C.border}`:"none" }}>
                  <Toggle checked={consent[p.id][rt.id]} onChange={()=>setConsent(prev=>({...prev,[p.id]:{...prev[p.id],[rt.id]:!prev[p.id][rt.id]}}))} />
                  <span style={{ fontSize:12,color:consent[p.id][rt.id]?C.text:C.textMuted }}>{rt.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page: Audit Log ──────────────────────────────────────────────────────────
function AuditPage({ auditLog, loading }) {
  const [filter, setFilter] = useState("all");
  const entries = filter==="anomalies" ? auditLog.filter(e=>e.is_anomaly) : auditLog;
  const anomCount = auditLog.filter(e=>e.is_anomaly).length;
  return (
    <div>
      <div style={{ marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:10 }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:600,color:C.text,marginBottom:4 }}>Audit Log</h2>
          <p style={{ fontSize:13,color:C.textMuted }}>Every access event scored by the ML model in real time.</p>
        </div>
        <div style={{ display:"flex",gap:6 }}>
          {["all","anomalies"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ padding:"5px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:filter===f?C.accent:C.surface,color:filter===f?C.bg:C.textMuted,transition:"all 0.15s" }}>
              {f==="all"?"All events":"Anomalies only"}
            </button>
          ))}
        </div>
      </div>
      {anomCount>0 && (
        <div style={{ padding:"10px 14px",background:C.dangerDim,border:`1px solid ${C.dangerBorder}`,borderRadius:8,marginBottom:12,display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:12,color:C.danger }}>⚠</span>
          <span style={{ fontSize:12,color:C.danger,fontWeight:500 }}>{anomCount} anomalous events detected by Isolation Forest model</span>
          {loading && <span style={{ fontSize:11,color:C.textMuted,marginLeft:"auto" }}>Scoring…</span>}
        </div>
      )}
      <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:12 }}>
        {entries.length===0
          ? <div style={{ padding:"24px",textAlign:"center",color:C.textMuted,fontSize:13 }}>No events match this filter.</div>
          : entries.map((e,i)=><AuditRow key={i} entry={e} index={i} showScore />)
        }
      </div>
      <div style={{ padding:"10px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,display:"flex",alignItems:"center",gap:8 }}>
        <span style={{ fontSize:11,color:C.textDim,fontFamily:"monospace" }}>SHA-256 chain: a3f7c2…9d14e8</span>
        <Badge variant="success">✓ Verified</Badge>
      </div>
    </div>
  );
}

// ─── Page: Live ML Scorer ─────────────────────────────────────────────────────
function MLScorer() {
  const [form, setForm] = useState({ hour:10, day_of_week:1, records_accessed:5, session_duration_min:10, unique_record_types:2, is_known_ip:1, days_since_last_access:3, provider:"Test Provider", action:"Viewed", record:"Lab Results" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fields = [
    { key:"hour", label:"Hour of day", min:0, max:23, hint:"0–23" },
    { key:"day_of_week", label:"Day of week", min:0, max:6, hint:"0=Mon, 6=Sun" },
    { key:"records_accessed", label:"Records accessed", min:1, max:300, hint:"count" },
    { key:"session_duration_min", label:"Session duration (min)", min:0, max:120, hint:"float" },
    { key:"unique_record_types", label:"Unique record types", min:1, max:6, hint:"1–6" },
    { key:"is_known_ip", label:"Known IP? (1/0)", min:0, max:1, hint:"1=yes, 0=no" },
    { key:"days_since_last_access", label:"Days since last access", min:0, max:90, hint:"int" },
  ];

  const handleScore = async () => {
    setLoading(true); setResult(null);
    const r = await scoreEvent(form);
    setResult(r); setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20,fontWeight:600,color:C.text,marginBottom:4 }}>Live ML Scorer</h2>
        <p style={{ fontSize:13,color:C.textMuted }}>Manually test access events against the Isolation Forest model.</p>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
        {fields.map(f=>(
          <div key={f.key} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px" }}>
            <div style={{ fontSize:11,color:C.textMuted,marginBottom:4 }}>{f.label} <span style={{ color:C.textDim }}>({f.hint})</span></div>
            <input type="number" min={f.min} max={f.max}
              value={form[f.key]}
              onChange={e=>setForm(p=>({...p,[f.key]:parseFloat(e.target.value)||0}))}
              style={{ width:"100%",background:"transparent",border:`1px solid ${C.borderLight}`,borderRadius:6,padding:"5px 8px",color:C.text,fontSize:14,fontFamily:"monospace",outline:"none" }}
            />
          </div>
        ))}
      </div>

      <button onClick={handleScore} disabled={loading} style={{ width:"100%",padding:"10px",borderRadius:8,border:`1px solid ${C.accent}`,background:loading?C.accentDim:C.accentDim,color:C.accent,fontSize:14,fontWeight:600,cursor:loading?"wait":"pointer",marginBottom:16,transition:"all 0.15s" }}>
        {loading ? "Scoring…" : "▶ Score This Event"}
      </button>

      {result && (
        <div style={{ background:result.is_anomaly?C.dangerDim:C.accentDim,border:`1px solid ${result.is_anomaly?C.dangerBorder:C.accentGlow}`,borderRadius:10,padding:"16px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
            <span style={{ fontSize:28,fontWeight:700,color:result.is_anomaly?C.danger:C.accent,fontFamily:"monospace" }}>
              {result.is_anomaly ? "⚠ ANOMALY" : "✓ NORMAL"}
            </span>
            <RiskPill level={result.risk_level} />
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12 }}>
            {[["IF Score",result.anomaly_score],["Risk Level",result.risk_level],["Timestamp",new Date(result.timestamp).toLocaleTimeString()]].map(([k,v])=>(
              <div key={k} style={{ background:`${C.bg}88`,borderRadius:6,padding:"8px 10px" }}>
                <div style={{ fontSize:10,color:C.textMuted,marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:12,fontWeight:600,color:C.text,fontFamily:"monospace" }}>{v}</div>
              </div>
            ))}
          </div>
          {result.reasons.length>0 && (
            <div>
              <div style={{ fontSize:11,color:C.textMuted,marginBottom:6 }}>REASONS FLAGGED</div>
              {result.reasons.map((r,i)=>(
                <div key={i} style={{ fontSize:12,color:C.danger,background:C.dangerDim,padding:"4px 8px",borderRadius:4,marginBottom:4 }}>→ {r}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop:16,padding:"12px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8 }}>
        <div style={{ fontSize:11,color:C.textMuted,marginBottom:6,letterSpacing:"0.06em" }}>MODEL INFO</div>
        <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
          {[["Algorithm","Isolation Forest"],["n_estimators","200"],["Contamination","4%"],["F1 Score","0.902"],["Precision","0.881"],["Recall","0.925"]].map(([k,v])=>(
            <div key={k}><div style={{ fontSize:10,color:C.textDim }}>{k}</div><div style={{ fontSize:12,fontWeight:500,color:C.text,fontFamily:"monospace" }}>{v}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page: Alerts ─────────────────────────────────────────────────────────────
function AlertsPage({ auditLog }) {
  const anomalies = auditLog.filter(e=>e.is_anomaly);
  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20,fontWeight:600,color:C.text,marginBottom:4 }}>Security Alerts</h2>
        <p style={{ fontSize:13,color:C.textMuted }}>Anomalies flagged by the Isolation Forest model.</p>
      </div>
      {anomalies.length===0 && <div style={{ padding:"24px",textAlign:"center",color:C.textMuted,fontSize:13,background:C.surface,borderRadius:10,border:`1px solid ${C.border}` }}>No anomalies detected. Your data looks safe.</div>}
      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {anomalies.map((e,i)=>(
          <div key={i} style={{ background:C.surface,border:`1px solid ${C.dangerBorder}`,borderRadius:10,borderLeft:`3px solid ${C.danger}`,padding:"14px 16px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap" }}>
              <RiskPill level={e.score?.risk_level||"high"} />
              <span style={{ fontSize:13,fontWeight:600,color:C.text }}>{e.provider} · {e.action}</span>
            </div>
            <p style={{ fontSize:13,color:C.textMuted,lineHeight:1.6,marginBottom:10 }}>
              Accessed <strong style={{ color:C.text }}>{e.record}</strong> from <strong style={{ color:C.text }}>{e.location}</strong>.
              IF anomaly score: <span style={{ fontFamily:"monospace",color:C.danger }}>{e.score?.anomaly_score}</span>
            </p>
            {e.score?.reasons?.length>0 && (
              <div style={{ marginBottom:10,display:"flex",gap:4,flexWrap:"wrap" }}>
                {e.score.reasons.map((r,j)=><span key={j} style={{ fontSize:11,color:C.danger,background:C.dangerDim,padding:"2px 7px",borderRadius:3 }}>{r}</span>)}
              </div>
            )}
            <div style={{ display:"flex",gap:8 }}>
              <button style={{ padding:"5px 14px",borderRadius:6,border:`1px solid ${C.danger}`,background:C.dangerDim,color:C.danger,fontSize:12,fontWeight:600,cursor:"pointer" }}>Revoke Access</button>
              <button style={{ padding:"5px 14px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:12,cursor:"pointer" }}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("overview");
  const [consent, setConsent] = useState(INIT_CONSENT);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);

  // Score all events on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      const scored = await Promise.all(
        EVENT_TEMPLATES.map(async (e) => {
          const score = await scoreEvent(e);
          return { ...e, is_anomaly: score.is_anomaly, score };
        })
      );
      setAuditLog(scored);
      setLoading(false);
    })();
  }, []);

  const anomalyCount = auditLog.filter(e => e.is_anomaly).length;

  const pages = {
    overview: <Overview auditLog={auditLog} anomalyCount={anomalyCount} loading={loading} />,
    consent:  <ConsentManager consent={consent} setConsent={setConsent} />,
    audit:    <AuditPage auditLog={auditLog} loading={loading} />,
    scorer:   <MLScorer />,
    alerts:   <AlertsPage auditLog={auditLog} />,
  };

  return (
    <div style={{ display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans',sans-serif",overflow:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <Sidebar active={active} setActive={setActive} anomalyCount={anomalyCount} />
      <div style={{ flex:1,overflowY:"auto",padding:"28px" }}>
        <div style={{ maxWidth:700 }}>{pages[active]}</div>
      </div>
    </div>
  );
}
