# 🧠 MimiVerse AI Runtime & MCP Architektur

**Stand:** 2025‑12‑07  
**Scope:** AI‑Runtime (Agenten), Model‑Routing, MCP‑Integration, DGX‑Kontext

---

## 1. High‑Level Overview

MimiVerse.ai stellt eine AI‑native IDE bereit. Die AI‑Runtime besteht aktuell aus:

- **AgentBrain (`server/ai/brain.ts`)** – ReAct‑basierter Orchestrator (Analyzing → Planning → Executing).
- **Core‑Layer (`server/ai/core/*`)**
  - `context.ts` – ContextManager (Workspace‑Kontext, History, Memory).
  - `model-gateway.ts` – ModelRouter für Ollama‑Modelle (Task‑basiertes Routing).
- **Tools & Strategien**
  - `server/ai/tools/*` – Terminal, Files, Git.
  - `server/ai/strategies/*` – Multi‑File‑Agent u.ä.
- **Model‑Zugriff & Caching**
  - `server/ai/utils/ollama.ts` – `streamChat`, `generateCompletion`, `generateEmbedding` + `aiCache`.
- **Neue MCP‑Schicht (`server/ai/mcp/*`)**
  - Ermöglicht Anbindung externer MCP‑kompatibler Tools/Server.

Der AgentBrain entscheidet auf Basis des User‑Prompts, welches Tool / welche Strategie zum Einsatz kommt (inkl. MCP‑Tools).

---

## 2. Komponenten im Detail

### 2.1 AgentBrain (`server/ai/brain.ts`)

- Hält **Konversations‑History** und einen **Thought‑Stream** (`ThoughtStep` aus `server/ai/types.ts`).
- Ablauf `processMessage(userMessage, history)`:
  1. **Analyzing:** User‑Message verstehen, Mentions verarbeiten.
  2. **Planning:** Mit LLM ein Routing‑JSON erzeugen (`routeToTool`).
  3. **Executing:** Ausgewähltes Tool ausführen (Core‑Tool oder MCP‑Tool).
- Unterstützte Core‑Tools (Stand heute):
  - `chat`, `edit_file`, `create_project`, `execute_project`, `search_codebase`, `read_file`.
- **Neu:** Dynamische Erweiterung um aktivierte MCP‑Tools (siehe MCP‑Integration).

### 2.2 Core‑Layer (`server/ai/core/*`)

- `context.ts`:
  - Verwaltet Workspace‑Wurzel, baut Kontext (Dateien, History) für AI‑Aufgaben.
  - Dient als zentrale Stelle für zukünftige Cognitive‑Memory‑/Timeline‑Features.
- `model-gateway.ts`:
  - `ModelRouter` mit Task‑Typen (z.B. `code_generation`, `debugging`, `inline_completion`, `embedding`, `ui_analysis`).
  - Wählt pro Task Typ das passende Ollama‑Modell (z.B. `qwen3-coder:30b` für komplexe Code‑Aufgaben).
  - Bietet `generate` (einmalige Responses) und `generateStream` (Streaming) an.

### 2.3 Tools & Strategien

- **Tools (`server/ai/tools/*`):**
  - `terminal.ts` – Terminal‑Interaktionen.
  - `file-tool.ts` – Lesen/Schreiben von Dateien.
  - `git.ts` – Git‑Operationen.
- **Strategien (`server/ai/strategies/*`):**
  - `multi-file-agent.ts` – Plant und bündelt Änderungen über mehrere Dateien.
- Tools/Strategien greifen auf Core‑Funktionalität (Context, ModelRouter, Caching) zu.

---

## 3. MCP‑Integration (Model Context Protocol, Skeleton)

### 3.1 Ziele

- Externe MCP‑Server (lokal oder remote) können **zusätzliche Tools** bereitstellen.
- AgentBrain soll diese Tools wie interne Tools behandeln (Routing, Ausführung, Logging).
- User können Tools (z.B. über UI/Settings) **aktivieren/deaktivieren**.

### 3.2 MCP‑Module (`server/ai/mcp/*`)

- `mcp-types.ts`
  - Definiert `MCPServerConfig`, `MCPToolDefinition`, `MCPInvokeOptions`.
- `mcp-registry.ts`
  - In‑Memory‑Registry für MCP‑Server und MCP‑Tools.
  - Initialer Eintrag `local-mcp` (Server) + Beispiel‑Tool `local-mcp:example` (disabled).
  - API:
    - `getServers() / getServerById(id)`
    - `getAllTools() / getToolById(id)`
    - `registerTool(tool)`
    - `setToolEnabled(id, enabled)`
- `mcp-client.ts`
  - `invokeMcpTool(toolId, input, options)`
  - Holt Tool + Server aus Registry.
  - POST an `server.baseUrl + toolsEndpoint` (Default `/tools/invoke`).
  - Übergibt `{ tool: <tool.name>, input: <payload> }` und liefert `response.data` zurück.

### 3.3 Nutzung im AgentBrain

- `getAvailableTools()` (in `brain.ts`):
  - Kombiniert **Core‑Tools** mit allen `enabled` MCP‑Tools aus der Registry.
- `routeToTool(...)`:
  - Baut Prompt mit vollständiger Tool‑Liste (inkl. MCP‑Tools).
- Ausführungspfad für MCP‑Tools:
  - Wenn `routing.tool` nicht zu einem der Core‑Cases passt, wird `invokeMcpTool(routing.tool, { message, history })` aufgerufen.
  - Erfolg: Thought „Executed MCP tool …“, Rückgabe des Ergebnisses (String/JSON).
  - Fehler: Thought „Failed to execute MCP tool …“, Rückgabe einer Fehlermeldung.

---

## 4. HTTP‑/API‑Schicht & MCP‑Endpoints

- **AI‑API (Kern):**
  - Routen in `server/routes.ts` und `server/api/ai.ts` kapseln die AI‑Runtime:
    - `/api/ai/complete` – Inline‑Completions im Editor (Ollama‑Backend).
    - `/api/ai/chat` – Chat/Agent‑Interaktionen (AgentBrain‑Flow, Streaming).
    - `/api/ai/fim/stream` – FIM‑Completion (Prefix/Suffix‑basiert).
    - `/api/ai/task`, `/api/ai/plan-multi-edit`, `/api/ai/execute-multi-edit` – Agent‑/Multi‑File‑Strategien.
    - `/api/ai/auto-fix` – Auto‑Fix für Terminal‑Fehler.
- **v1‑API Router:** `server/api/v1/index.ts`
  - `auth`, `projects`, `files`, `search`.
  - **Neu:** `mcp` → `server/api/v1/mcp.ts` (Tool‑Verwaltung), `analytics` → `server/api/v1/analytics.ts` (Completion‑Events).
- **MCP‑API:** `server/api/v1/mcp.ts`
  - `GET /api/v1/mcp/tools` – Liste aller registrierten MCP‑Tools.
  - `POST /api/v1/mcp/tools/:id/enable` – Tool aktivieren.
  - `POST /api/v1/mcp/tools/:id/disable` – Tool deaktivieren.

### 4.1 Health & Readiness

- **`GET /health` (in `server/routes.ts`):**
  - Liefert einen JSON‑Status mit:
    - DB‑Pool‑Informationen (z.B. `totalCount`, `idleCount`, `waitingCount`).
    - `ai.ollama` – Ergebnis von `checkOllamaHealth` aus `server/ai/utils/ollama.ts`.
    - `ai.triton` – Status/Fallback‑Informationen für den Triton‑Embedding‑Pfad.
- **`GET /ready` (in `server/routes.ts`):**
  - Aggregiert Readiness‑Checks für:
    - Datenbank (leichter Query auf den Pool).
    - Ollama (Health‑Check).
    - Triton (Embedding‑Backend, falls aktiv).
  - Wird für Orchestrierung/Load‑Balancer genutzt, um Instanzen nur im „ready“‑Zustand zu traffic‑führen.

### 4.2 Analytics & Usage‑Tracking

- **Completion‑Events:**
  - Tabelle `completion_events` (DDL in `server/storage.ts`).
  - API `POST /api/v1/analytics/completions` (in `server/api/v1/analytics.ts`).
  - Wird vom Editor über `useCompletionTracking` aufgerufen, z.B. mit `eventType = inline_shown`.
- **Usage‑Logs:**
  - Tabelle `usage_logs` (bestehend).
  - `/api/ai/complete` und `/api/ai/chat` schreiben Nutzungs‑Einträge wie `ai_inline_completion` bzw. `ai_chat` mit groben Token‑Counts.
- **Produkt‑Metriken:**
  - `PRODUCT_METRICS.md` beschreibt KPIs (Acceptance, Latency, AI Usage, Auto‑Fix‑Success, Cost/User) und Beispiel‑SQLs.
  - `DGX_LAUNCH_CHECKLIST.md` referenziert Health‑/Metrics‑Endpoints als Teil der Launch‑Readiness.

---

## 5. Konfiguration & DGX‑Kontext

- **Environment (`server/env.ts`):**
  - AI:
    - `OLLAMA_BASE_URL`, `OLLAMA_CHAT_MODEL`, `OLLAMA_COMPLETION_MODEL`, `OLLAMA_EMBEDDING_MODEL`.
  - **MCP:**
    - `MCP_LOCAL_SERVER_URL` (optional) – Basis‑URL für lokalen MCP‑Server.
- **Docker (`docker-compose.yml`):**
  - Postgres (mit pgvector), Redis, Prometheus, Grafana, Triton.
  - Nächster Schritt: eigener MCP‑Service (z.B. `mcp-hub`) als separater Container.

---

## 6. Zielbild & Nächste Schritte (T1‑bezogen)

**Aktuelle Architektur:**
- AgentBrain + Core‑Layer + Tools/Strategien bilden eine lauffähige Agenten‑Runtime für Code‑Aufgaben.
- MCP‑Skeleton ist integriert (Registry, Client, Brain‑Hook, API‑Route), aber noch minimal.

**Zielbild (T1/T3/T5‑verzahnt):**
- Saubere 3‑Layer‑Struktur:
  - **Core:** AgentRuntime/Brain, Context, ModelRouter, MCP‑Adapter.
  - **Capabilities:** Code‑Gen, Debugging, Research, File‑Ops etc.
  - **Tools/Strategien:** Terminal/File/Git + Strategien wie Multi‑File, Auto‑Fix.
- MCP:
  - Mehrere Server/Tools konfigurierbar (lokal + remote), Workspace‑spezifische Aktivierung.
  - UI‑Settings für MCP‑Tools in der IDE.

**Konkrete nächsten Schritte zu dieser Architektur (historisch für diesen Sprint):**

1. **T2–T4:** Core‑Struktur, ModelRouter und AgentBrain härten (erledigt, siehe Sprint‑Tracker T2–T4).
2. **T9–T14:** Feedback‑Loop und Monitoring etablieren (completion_events, usage_logs, Health/Ready, AI‑Request‑Monitoring).
3. **T15–T16:** Security‑Härtung und DGX‑Launch‑Readiness (SYSTEM FILE API, DGX‑Checkliste).
