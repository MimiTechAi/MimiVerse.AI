# MimiVerse.ai – Product & AI Metrics

## 1. Zielbild

MimiVerse.ai ist eine AI-native IDE. Die wichtigsten Metriken sollen zeigen:

- **Wie gut helfen die AI-Features beim Coden?** (Qualität/Acceptance)
- **Wie schnell und stabil reagieren sie?** (Latency/Reliability)
- **Wie effizient ist der Einsatz von Ressourcen?** (Cost/User)
- **Wie zufrieden sind die Nutzer*innen?** (NPS/Retention)

Diese Metriken basieren primär auf:

- `completion_events` (Inline- & Chat-Completions, Acceptance)
- `usage_logs` (AI-Requests, Tokens, Modelle)
- zukünftigen UX-Signalen (z.B. IDE-Events, Session-Dauer)

---

## 2. Kern-KPIs

### 2.1 Completion Acceptance Rate

- **Definition:**
  - Anteil der angezeigten Completions, die akzeptiert oder genutzt werden.
- **Formel (Inline):**
  - `inline_acceptance_rate = accepted_inline / shown_inline`
- **Datenquellen:**
  - `completion_events` mit `event_type IN ('inline_shown', 'inline_accepted', 'inline_rejected')`.
- **Ziel:**
  - Kurzfristig: > 25 %
  - Mittelfristig: > 40 % für Fokus-Sprachen (TS/JS).

### 2.2 Time-to-First-Completion (Latency)

- **Definition:**
  - Zeit von Request bis erste Completion (ms).
- **Formel:**
  - Durchschnitt `latency_ms` für `event_type = 'inline_shown'` (und analog Chat).
- **Datenquellen:**
  - `completion_events.latency_ms`.
- **Ziel:**
  - P95 < 1.000 ms, P99 < 2.000 ms.

### 2.3 AI Usage Intensity

- **Definition:**
  - Wie häufig pro Tag/Woche werden AI-Funktionen genutzt?
- **Mögliche Sichten:**
  - `ai_calls_per_user_per_day = count(usage_logs where action_type = 'ai_request') / active_users`.
  - `completions_per_file` für Codearbeit.
- **Datenquellen:**
  - `usage_logs` (Model-Calls), `completion_events` (Anzahl Inline/Chat).

### 2.4 Auto-Fix Success Rate

- **Definition:**
  - Anteil der Auto-Fix-Versuche, nach denen die Tests/Build fehlerfrei durchlaufen.
- **Formel (später):**
  - `auto_fix_success_rate = successful_auto_fixes / total_auto_fix_attempts`.
- **Datenquellen (geplant):**
  - Ergebnisse aus `TestRunnerTool` + zukünftige `auto_fix`-Events.

### 2.5 Cost per Active User (Engineering Cost Proxy)

- **Definition:**
  - Ressourcenverbrauch (Tokens/Compute) pro aktivem User.
- **Formel (vereinfachter Proxy):**
  - `tokens_per_user = sum(tokens_input + tokens_output) / active_users`.
- **Datenquellen:**
  - `usage_logs.tokens_input`, `usage_logs.tokens_output`.

### 2.6 Developer Satisfaction (NPS / Qualitatives Feedback)

- **Definition:**
  - Wahrgenommene Qualität via Feedback (NPS, Ratings).
- **Status:**
  - Noch nicht technisch integriert; kann über externes Tool oder eigenes Feedback-Modal kommen.

---

## 3. Datenmodell (heute)

### 3.1 completion_events

Aktuell definiert in `server/storage.ts` (DDL):

- `id SERIAL PRIMARY KEY`
- `user_id TEXT`
- `project_id TEXT`
- `completion_id TEXT`
- `event_type TEXT NOT NULL`  (z.B. `inline_shown`, `inline_accepted`, `inline_rejected`)
- `accepted BOOLEAN`
- `model_used TEXT`
- `latency_ms INTEGER`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

**Verwendung:**

- Inline-Completions im Editor senden aktuell `inline_shown` Events mit `model_used` und `latency_ms`.
- Später können `inline_accepted` / `inline_rejected` ergänzt werden (z.B. beim Bestätigen/Verwerfen der Completion).

### 3.2 usage_logs

Bereits im SQL-Schema vorhanden (`server/db/schema.sql`):

- `user_id`, `project_id`
- `action_type` (z.B. `ai_request`, `index_project` …)
- `model_used`
- `tokens_input`, `tokens_output`
- `created_at`

**Verwendung:**

- Für AI-Request-Monitoring und Kosten-Proxy.
- Verknüpfbar mit `completion_events` über `(user_id, project_id, created_at)` Zeitfenster.

---

## 4. Beispiel-Auswertungen (SQL-Skizzen)

> Diese Queries sind als Orientierung gedacht und können in Grafana/Metabase o.ä. verwendet werden.

### 4.1 Inline Acceptance Rate (7 Tage)

```sql
SELECT
  COUNT(*) FILTER (WHERE event_type = 'inline_accepted')::float
    / NULLIF(COUNT(*) FILTER (WHERE event_type = 'inline_shown'), 0) AS inline_acceptance_rate
FROM completion_events
WHERE created_at >= NOW() - INTERVAL '7 days';
```

### 4.2 P95/P99 Latency (Inline)

```sql
SELECT
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_ms
FROM completion_events
WHERE event_type = 'inline_shown'
  AND latency_ms IS NOT NULL
  AND created_at >= NOW() - INTERVAL '1 day';
```

### 4.3 AI Usage Intensity pro Nutzer

```sql
SELECT
  user_id,
  COUNT(*) FILTER (WHERE action_type = 'ai_request') AS ai_requests,
  SUM(tokens_input + tokens_output) AS tokens_total
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY ai_requests DESC;
```

---

## 5. Roadmap für weitere Metriken

1. **Acceptance-Events erweitern**
   - Editor: zusätzlich `inline_accepted` / `inline_rejected` senden.
   - Chat: `chat_sent`, `chat_followup`, `chat_applied` Events.

2. **Auto-Fix-Events**
   - TestRunner/AutoFixer: Erfolg/Misserfolg + betroffene Dateien loggen.

3. **NPS / Qualitatives Feedback**
   - Einfaches In-IDE-Feedback-Modal (1–2 Klicks) + optionaler Freitext.

4. **Dashboards**
   - Grafana/Metabase-Dashboards für:
     - Acceptance & Latency
     - AI Usage Intensity
     - Auto-Fix-Erfolg

Diese Datei dient als laufende Referenz für Product/AI/SRE und kann iterativ erweitert werden.
