# Mimiverse IDE – Design Spec

## 1. Überblick

### 1.1 High‑Level Architektur

- **Client (React/Vite)**
  - `AIChat` (MIMI Panel) mit `useAgentRun`, `useAgentWebSocket`.
  - `EditorArea` (Monaco) mit Live‑Diagnostics, Inline‑Completions.
  - UI‑Lib: Radix, Tailwind, shadcn‑ähnliche Komponenten.

- **Server (Node/Express + TS)**
  - REST‑APIs (`/api/ai/*`, `/api/tests/*`, `/api/lint/*` [geplant]).
  - `AgentWebSocket` (Broadcast von Agent‑Events).
  - `Executor` + Strategies (`multi-file-agent`, `test-runner`, später `lint-runner`).
  - `timeline` für serverseitige Activity‑Logs.

- **Datenbank (Postgres/Drizzle)**
  - Usage Logs, Projekte, Auth.

### 1.2 Zentrale Konzepte

- **AgentRun**: ein logischer Durchlauf von Idee → Code → Tests → Fix.
- **AgentEvents**: WS‑Events, die den Run beschreiben.
- **Mission Control Layout**: Editor links, MIMI Panel rechts.

## 2. Datenmodell

### 2.1 AgentRun

```ts
export type RunLifecycleState =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'testing'
  | 'fixing'
  | 'done'
  | 'error';

export interface AgentRun {
  runId: string;
  mode: 'BUILD' | 'TEST' | 'TEST_FIX';
  state: RunLifecycleState;
  failedStep?: 'plan' | 'execute' | 'tests' | 'fix';
  startedAt: number;
  finishedAt?: number;
}
```

Clientseitig verwaltet über `useAgentRun` und `getRunSteps(run)` → Build Pipeline.

### 2.2 WebSocket Events

```ts
type AgentWsEventType =
  | 'thinking'
  | 'tool_use'
  | 'chunk'
  | 'complete'
  | 'error'
  | 'progress'
  | 'terminal_output'
  | 'file_change'
  | 'test_result'
  | 'status';

interface WSMessage {
  id?: string;
  type: AgentWsEventType;
  createdAt?: number;
  data: any;
}
```

`AgentWebSocket.broadcast` fügt `id` + `createdAt` serverseitig hinzu.

### 2.3 Agent Timeline Events (Client)

```ts
interface AgentEvent {
  id: string;
  type:
    | 'thinking'
    | 'tool_use'
    | 'progress'
    | 'error'
    | 'complete'
    | 'file_change'
    | 'test_result';
  label: string;
  detail?: string;
  timestamp: number;
}
```

`useAgentRun` mappt WS‑Events → `AgentEvent[]`.

## 3. Haupt‑Flows

### 3.1 Build‑Flow (Feature/Projekt bauen)

1. **User Prompt** in AIChat (`Code Mode: BUILD`).
2. `runProjectAgent`:
   - ruft Plan‑Endpoint auf,
   - zeigt Plan im Panel (`ProjectPlanView`).
3. User klickt `Start Build` oder Autopilot übernimmt:
   - `Executor.executePlan` iteriert Phasen/Tasks,
   - sendet `progress`, `thinking`, `tool_use`, `chunk`, `file_change` über WebSocket.
4. Client:
   - `useAgentRun` aktualisiert Run‑State + Timeline + Thinking Stream.
   - Editor/Explorer zeigen geänderte Files.
5. Ende:
   - `complete` oder `error` → Run‑State `done`/`error` + Chat‑Summary.

### 3.2 Test‑Flow (manuell)

1. User klickt im Context‑Block **„Run tests with MIMI“**.
2. `runTestsFromChat` ruft `/api/tests/run` auf.
3. `TestRunnerTool` führt Framework‑spezifischen Befehl aus, parsed Output → `TestResult[]`.
4. Server sendet `test_result` WS‑Event mit Summary.
5. Client:
   - zeigt Chat‑Summary („Test run completed…“),
   - Timeline‑Eintrag (`type: 'test_result'`),
   - optional Empfehlung, Auto‑Fix zu starten.

### 3.3 Auto‑Fix Tests (manuell)

1. User klickt **„Auto‑fix failing tests“**.
2. `autoFixTestsFromChat` sendet `failures` an `/api/tests/fix`.
3. `TestRunnerTool.autoFix` analysiert Fehler (LLM), generiert Fix‑Plan, ändert Files (über vorhandene Tools).
4. Backend erzeugt `file_change`‑Events für jede Modifikation.
5. Backend sendet `test_result`‑Event mit Auto‑Fix Summary.
6. Client zeigt:
   - Timeline: File‑Changes + Auto‑Fix Result,
   - Chat: detaillierte Zusammenfassung + evtl. Hinweise.

### 3.4 Lint‑Flow (geplant)

1. User aktiviert **„Lint Auto‑Fix“** Toggle oder klickt einen Button „Run Lint with MIMI“.
2. Client ruft `/api/lint/run` auf (noch zu implementieren).
3. Backend:
   - nutzt ESLint/TS‑Compiler,
   - erzeugt Liste an Lint‑Issues + möglichen Fixes.
4. AI erstellt einen Multi‑File‑Fix‑Plan (ähnlich `multi-file-agent`).
5. Executor führt den Plan aus → `file_change` + optional `lint_result` Events.
6. Client zeigt Status im Timeline‑Feed + Markierung im Editor (bereits durch Monaco‑Diagnostics).

## 4. UI/UX Design – MIMI Panel

### 4.1 Layout

- **Header**: Avatar, Name, Status‑Chips (Offline / Thinking… / Ready / Error).
- **Build Pipeline**: 4 Steps mit Status (Pending/Active/Done/Failed) + aktueller Status‑Text.
- **Thinking Stream**: kompakter Live‑Feed (`thinking`), mit `+Xs` Relativzeit.
- **Agent Timeline**: Text‑Feed (Dot + Label + Detail) für strukturierte Events.
- **Agent Log**: collapsible/sektionierter Terminal‑Log aus `chunk`‑Events.
- **Context‑Section**: aktuelle Files + Test/Auto‑Fix Buttons.
- **Chat**: Conversation mit MIMI (inkl. „Send to Composer“ Button für weitere Agent‑Runs).

### 4.2 Visual Design Leitlinien

- Farbpalette angelehnt an Windsurf/Cursor: dunkles Grau + Purple/Indigo‑Akzente.
- Dezent animierte Status‑Indikatoren (Pulsing Dot, Typing Dots).
- Schmale, lesbare Typo (10–12px für Meta, 12–14px für Content).
- Sections durch feine `border-white/5`‑Trenner.

## 5. Erweiterungspunkte

- **Neue Event‑Typen**: `lint_result`, `deploy_result`, `benchmark_result` – können direkt in `AgentWsEventType` + `AgentEvent` aufgenommen werden.
- **Weitere Tools**: neue `tool_use`‑Subtypen (z.B. `git`, `db_migration`), werden in Timeline label‑basiert angezeigt.
- **Zusätzliche Panels**: z.B. „Performance Insights“ im rechten Panel unter dem Agent Log.

## 6. Risiken / Open Questions

- Wie lange dürfen Log‑Feeds sein, bevor sie die Performance beeinträchtigen? (Limitierung + Pagination nötig.)
- Wie werden sehr große Plans/Changes visuell komprimiert (Fold/Unfold, Phasen‑Grouping)?
- Lint‑Runner‑Performance bei großen Repos (ggf. per Pattern/Scope einschränken).
