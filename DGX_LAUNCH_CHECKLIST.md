# MimiVerse.ai – DGX Launch Readiness Checklist

## 1. Infrastructure & Services

- [ ] **Docker Compose**
  - [ ] `docker-compose up -d` startet erfolgreich alle Kernservices:
    - Postgres (mit pgvector)
    - Redis
    - Prometheus + Grafana
    - Triton Inference Server (GPU)
  - [ ] Volumes und Ports sind mit Produktions-Setup abgestimmt.

- [ ] **GPU & Triton**
  - [ ] DGX sieht alle GPUs (`nvidia-smi` ok).
  - [ ] `TRITON_URL` korrekt gesetzt (z.B. `http://triton:8000`).
  - [ ] `GET /api/triton/status` liefert `healthy: true` (oder fallback zu Ollama ist dokumentiert).
  - [ ] `GET /api/triton/metrics` ist im Prometheus-Scrape erfasst.

- [ ] **Ollama / Model Backend**
  - [ ] `OLLAMA_BASE_URL` korrekt gesetzt (oder interner Service in Compose).
  - [ ] `checkOllamaHealth` im `/health` Endpoint meldet `healthy: true`.
  - [ ] Kernmodelle konfiguriert (Chat/Completion/Embedding/Reasoning/Vision).

---

## 2. Application Health & Readiness

- [ ] **Health Endpoint**
  - [ ] `GET /health` zeigt:
    - `status: 'ok'`
    - DB‑Pool‑Stats (total/idle/waiting)
    - `ai.ollama` + `ai.triton` Status.

- [ ] **Readiness Endpoint**
  - [ ] `GET /ready` gibt `200 { status: 'ready' }` solange:
    - DB‑Pool verfügbar ist.
    - `checkOllamaHealth().healthy === true`.
  - [ ] Bei Problemen liefert `/ready` `503 { status: 'not_ready', ... }`.
  - [ ] Kubernetes/Orchestrator nutzt `/ready` für Pod‑Readiness.

- [ ] **AI‑Layer Smoke Tests**
  - [ ] `npm run check` (TypeScript) grün.
  - [ ] `npm test` (Vitest) grün für AI‑Layer:
    - ModelRouter.selectModel
    - AgentBrain Routing‑Fallbacks.
  - [ ] Manuelle Smoke‑Tests:
    - Inline‑Completion im Editor
    - AI Chat (MIMI Agent)
    - Codebase Search.

---

## 3. Monitoring & Metrics

- [ ] **AI Usage & Acceptance**
  - [ ] `completion_events` Tabelle vorhanden.
  - [ ] `POST /api/v1/analytics/completions` wird vom Editor aufgerufen (inline_shown Events).
  - [ ] `usage_logs` schreibt Einträge für:
    - `/api/ai/complete` (ai_inline_completion)
    - `/api/ai/chat` (ai_chat).
  - [ ] Produkt‑Metriken in `PRODUCT_METRICS.md` reviewed (Acceptance, Latency, Usage).

- [ ] **Infrastructure Monitoring**
  - [ ] Prometheus scraped:
    - Triton Metrics (`/api/triton/metrics`).
    - Node/Container‑Metriken.
  - [ ] Grafana Dashboard mit:
    - GPU Utilization
    - AI Response Latency
    - Error Rate (5xx auf AI‑Endpoints).

---

## 4. Security & Access

- [ ] **Auth & Sessions**
  - [ ] Session‑Middleware aktiv (secure Cookies in Produktion, Session‑Store konfiguriert).
  - [ ] AI‑kritische Routen geschützt:
    - `/api/ai/*` via Session/User‑Check oder `requireAuth`.
    - `/api/system/*` nur für authentifizierte Nutzer.

- [ ] **File Access**
  - [ ] `SYSTEM FILE API` limitiert auf erlaubte Pfade (`HOME`, `/home`, `/tmp`, Workspace).
  - [ ] `/api/system/create` nutzt dieselbe Pfadvalidierung wie `/api/system/list`.
  - [ ] Projekt‑Dateizugriff (`/api/files/*`) nutzt `validatePath` und Workspace‑Root.

- [ ] **Rate Limiting** (optional erste Stufe)
  - [ ] Entscheidung getroffen, ob `express-rate-limit` für `/api/ai/*` aktiviert wird.
  - [ ] Falls ja: sinnvolle Limits pro IP/User konfiguriert.

---

## 5. Backup & Recovery

- [ ] **Datenbank‑Backups**
  - [ ] Regelmäßige Dumps oder Snapshot‑Strategie für Postgres.
  - [ ] Restore‑Prozedur getestet (Test‑Restore in separate DB).

- [ ] **Konfiguration**
  - [ ] `.env` / Secrets nicht im Repo, nur via Secret‑Management.
  - [ ] Wichtige ENV‑Variablen dokumentiert:
    - `DATABASE_URL`
    - `TRITON_URL`
    - `OLLAMA_BASE_URL`
    - `MCP_LOCAL_SERVER_URL`
    - AI‑Model‑Env‑Variablen.

---

## 6. Go‑Live Checklist

- [ ] Staging/Pre‑Prod Umgebung entspricht DGX‑Setup.
- [ ] Letzter Smoke‑Test der wichtigsten Flows:
  - [ ] Projekt öffnen, Dateien laden
  - [ ] Inline‑Completion + AI‑Chat
  - [ ] Auto‑Fix/Test‑Runner
  - [ ] Git‑Status & Commit
- [ ] Owner für Incident‑Handling definiert (On‑Call oder Slack‑Channel).
- [ ] Rollback‑Plan dokumentiert (z.B. vorheriger Compose‑Tag/Deployment‑Version).

Diese Datei dient als praktische Checkliste vor einem DGX‑Launch und kann iterativ um projektspezifische Punkte erweitert werden.
