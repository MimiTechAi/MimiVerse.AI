# Mimiverse IDE – Requirements Spec

## 1. Vision

Mimiverse soll eine **5‑Sterne AI‑IDE** auf Niveau von **Windsurf / Cursor / Antigravity** werden:

- Der User steuert die AI wie einen **Co‑Engineer**.
- Alles Wichtige passiert in **einem Mission‑Control‑Fenster** (MIMI Panel rechts):
  - Chat, Plan, Build Pipeline, Thinking Stream, Agent Timeline, Tests, Auto‑Fix, Lint.
- Die AI arbeitet **von Idee → Architektur → Code → Tests → Fixes**, immer **transparent und kontrollierbar**.

## 2. Ziele & Nicht‑Ziele

### 2.1 Ziele

- **G1 – Mission Control Panel**: Ein Panel bündelt alle Agent‑Informationen und ‑Aktionen, ohne View‑Wechsel.
- **G2 – Transparente Agent‑Runs**: Jeder Run hat klaren Lifecycle (Plan → Execute → Tests → Auto‑Fix → Done/Error).
- **G3 – Live‑Einblicke**: Thinking Stream, Agent Timeline, File‑Changes, Logs und Test‑Resultate sind live sichtbar.
- **G4 – Kontrollierte Aktionen**: Tests, Auto‑Fix, Lint‑Fix werden **nie automatisch**, nur per User‑Aktion ausgeführt.
- **G5 – Editor‑Integration**: Code wird von der AI direkt in der Workspace‑Struktur erzeugt, im Editor sichtbar (inkl. Fehler‑Marker).
- **G6 – Erweiterbarkeit**: WebSocket‑Events und State‑Maschine sind so designt, dass neue Tools (Lint, Deploy, Benchmarks) leicht anschließbar sind.

### 2.2 Nicht‑Ziele (v1)

- Kein vollautomatisches CI/CD (nur lokale Test-/Lint‑Läufe).
- Kein komplexes Multi‑User‑Collab (reiner Single‑User‑Modus).
- Kein Vendor‑Lock auf bestimmte Modelle – die API soll aber erweiterbar bleiben.

## 3. User Stories (Auszug)

- **U1 – Feature bauen**  
  „Als Dev möchte ich MIMI ein Feature beschreiben und in einem Panel sehen, wie sie plant, Code schreibt, Files erstellt und Tests vorschlägt.“

- **U2 – Refactor/Upgrade**  
  „Als Dev möchte ich z.B. React‑Version upgraden und sehen, welche Files MIMI ändert und welche Schritte sie ausführt.“

- **U3 – Test‑Kontrolle**  
  „Als Dev möchte ich Tests **manuell** starten oder Auto‑Fix anstoßen und die Ergebnisse in einem Feed sehen.“

- **U4 – Lint‑Qualität**  
  „Als Dev möchte ich Lint‑Fehler im Editor sehen und optional MIMI bitten, sie automatisch zu fixen.“

- **U5 – Debugging**  
  „Als Dev möchte ich bei Fehlern im Agent‑Run schnell erkennen, in welcher Phase der Fehler passiert ist und welche Aktionen davor stattfanden.“

## 4. Funktionale Anforderungen

### 4.1 Agent Chat & Mission Control

- **F1.1**: Rechts ein **MIMI‑Panel** mit:
  - Header (Status, Verbindungsanzeige),
  - Build Pipeline (Plan/Execute/Tests/Auto‑Fix),
  - Thinking Stream,
  - Agent Timeline,
  - Agent Log,
  - Context‑Section (geöffnete Files, Shortcuts),
  - Chat‑Thread + Composer.
- **F1.2**: Chat‑Eingabe erlaubt **BUILD**‑ und **reines Chat‑Mode** (Toggle `Code Mode: BUILD/CHAT`).
- **F1.3**: Autopilot‑Toggle steuert nur **Plan & Execute**, nie Tests/Lint.

### 4.2 Run Lifecycle & WebSocket

- **F2.1**: Es gibt einen `AgentRun` mit Zuständen: `idle`, `planning`, `executing`, `testing`, `fixing`, `done`, `error`.
- **F2.2**: Backend‑Phasen werden in **WebSocket‑Events** gespiegelt (`progress` mit `phaseId`, `status`).
- **F2.3**: Client mappt diese Events via `useAgentRun` auf **Build Pipeline + Timeline**.
- **F2.4**: Jeder WS‑Event hat `id`, `type`, `createdAt`, `data`.

### 4.3 Thinking Stream & Agent Timeline

- **F3.1**: `thinking`‑Events werden als **Thinking Stream** angezeigt (Text + relative Zeit `+Xs`).
- **F3.2**: `progress`, `tool_use`, `file_change`, `test_result`, `error`, `complete` werden als **Agent Timeline‑Einträge** gerendert.
- **F3.3**: Timeline ist **immer sichtbar**, mit sinnvollem Empty‑State.
- **F3.4**: Langfristig: Gruppierung nach Phasen (Plan/Execute/Tests/Fix).

### 4.4 Code Changes & Files

- **F4.1**: Multi‑File‑Agent schreibt Files im Workspace (bereits vorhanden).
- **F4.2**: Nach jeder Multi‑File‑Operation sendet der Server `file_change`‑Events mit `filePath` + `changeType` (`create|update|delete`).
- **F4.3**: Timeline zeigt File‑Changes in Klartext (z.B. `[update] client/src/ide/AIChat.tsx`).
- **F4.4**: Editor/Explorer zeigen neue Files/Ordner direkt an (bestehendes Verhalten erhalten).

### 4.5 Tests & QA

- **F5.1**: REST‑APIs `/api/tests/run` & `/api/tests/fix` führen Tests/Auto‑Fix aus.
- **F5.2**: Nur **User‑Aktionen** im Panel (Buttons oder Chat‑Commands) dürfen Tests/Fix starten.
- **F5.3**: Backend sendet `test_result`‑Events über WebSocket mit `status` + `summary`.
- **F5.4**: AIChat zeigt nach Testlauf einen **structured Summary‑Post** im Chat + Timeline‑Eintrag.

### 4.6 Linting & Code Quality (geplant)

- **F6.1**: ESLint/TS‑Check Pipeline steht bereit (lokal über `npm`/`pnpm`).
- **F6.2**: API `/api/lint/run` führt Linting für Projekt oder Datei‑Subset aus.
- **F6.3**: Ergebnisse werden strukturiert (Rule, Message, Location, Fix?) zurückgegeben.
- **F6.4**: Optionaler **„Lint Auto‑Fix“‑Toggle** im Panel erlaubt MIMI, Fixes zu planen/auszuführen.
- **F6.5**: Lint‑Fixes laufen über denselben Multi‑File‑Mechanismus (und erzeugen `file_change`‑Events).

### 4.7 Reliability & Fehlerzustände

- **F7.1**: WebSocket reconnectet automatisch; Status ist im Header sichtbar (Online/Offline).
- **F7.2**: Bei Fehlern in einzelnen Phasen wird der Run‑State `error` mit `failedStep` gesetzt.
- **F7.3**: UI zeigt klare Fehlermeldungen und verweist auf Timeline/Logs.

## 5. Nicht‑funktionale Anforderungen

- **NF1 – Performance**: 
  - UI reagiert < 200ms auf User‑Interaktionen (ohne externe Netzlatzenz).
  - WebSocket‑Events werden ohne merkbare Verzögerung gerendert.
- **NF2 – Robustheit**:
  - Keine uncaught `console.error` im Normalbetrieb.
  - Client kann WS‑Reconnects verkraften, ohne dass State „verloren“ geht (zumindest für laufende Runs).
- **NF3 – UX/Look & Feel**:
  - Dark‑Mode optimiert (Kontraste / Lesbarkeit wie Windsurf/Cursor).
  - Animationen dezent, aber vorhanden (Thinking‑Dots, Feed‑Einblendung).
- **NF4 – Erweiterbarkeit**:
  - Event‑Schema ist erweiterbar (z.B. `lint_result`, `deploy_result`).
- **NF5 – Sicherheit**:
  - Tests/Lints laufen nur im User‑Workspace.
  - Keine unkontrollierten Shell‑Kommandos ohne klare UI‑Initiierung.

## 6. Akzeptanzkriterien (High Level)

- **A1**: Ein User kann von „Prompt“ bis „Code geändert + Tests gelaufen“ **ohne View‑Wechsel** im rechten Panel arbeiten.
- **A2**: Während eines Agent‑Runs sind zu jedem Zeitpunkt mindestens **Run‑State, Thinking Stream, letzte Timeline‑Events** sichtbar.
- **A3**: Tests/Auto‑Fix werden nur durch expliziten User‑Click oder Command gestartet.
- **A4**: Lint‑/Type‑Fehler sind im Editor sichtbar; AI‑Aktionen, die Lints fixen, sind über Timeline nachvollziehbar.
- **A5**: Kein Run fühlt sich wie eine „Black Box“ an – jeder Schritt ist in Timeline/Log erklärbar.
