# Mimiverse IDE – Task Plan & Akzeptanzkriterien

Dieses Dokument übersetzt Requirements & Design in konkrete Tasks mit klaren **Akzeptanzkriterien**.

**Status: Aktualisiert am 2025-12-23**

---

## 1. Phase 1 – Agent‑Fundament ✅ COMPLETE

### T1 – Run State Machine ✅ DONE
- **Beschreibung**: Gemeinsame Run‑State‑Maschine (`RunLifecycleState`, `AgentRun`, `getRunSteps`).
- **Akzeptanzkriterien**:
  - ✅ `getRunSteps` liefert für jeden `RunLifecycleState` die korrekten Step‑Status.
  - ✅ Fehlerzustand markiert `failedStep` korrekt.

### T2 – WebSocket Event Schema ✅ DONE
- **Beschreibung**: Einheitliches Schema mit `id`, `type`, `createdAt`, `data` für alle Agent‑Events.
- **Akzeptanzkriterien**:
  - ✅ Alle Broadcasts von `AgentWebSocket` nutzen `WSMessage` mit `id` + `createdAt`.
  - ✅ Client erhält nie „untypisierte" Agent‑Events (mindestens `type` ist immer gesetzt).

### T3 – useAgentRun Hook ✅ DONE
- **Beschreibung**: Zentrale Hook kapselt WebSocket‑Events, Run‑State, Thinking Stream, Timeline, Log.
- **Akzeptanzkriterien**:
  - ✅ `useAgentRun` liefert `currentRun`, `agentStatus`, `agentEvents`, `thinkingStream`, `agentLog`, `isAgentConnected`.
  - ✅ Kein anderer Client‑Code liest direkt aus dem Agent‑WebSocket.

---

## 2. Phase 2 – Mission‑Control Panel UX ✅ COMPLETE

### T4 – Panel Layout & Styling ✅ DONE
- **Beschreibung**: Build Pipeline, Thinking Stream, Agent Timeline, Agent Log, Context, Chat – konsistentes Layout.
- **Akzeptanzkriterien**:
  - ✅ Panel ist in fünf Sections gegliedert (Header+Pipeline, Thinking, Timeline, Context+Tests, Chat).
  - ✅ Empty‑States für Thinking/Timeline/Log sind vorhanden und verständlich.
  - ✅ Keine Layout‑Sprünge beim Start/Ende eines Runs.

### T5 – Agent Timeline Phasen‑Grouping ✅ DONE
- **Beschreibung**: Optionales Gruppieren der Timeline‑Events nach Run‑Phase (Plan/Execute/Tests/Fix).
- **Akzeptanzkriterien**:
  - ✅ Events werden in logische Blöcke geclustert (z.B. „PLAN PHASE" Header).
  - ✅ Fehlgeschlagene Phase wird optisch hervorgehoben.

### T6 – UX & Microcopy ✅ DONE
- **Beschreibung**: Klare Texte für Status/Fehler/Empfehlungen, inspiriert von Windsurf/Cursor.
- **Akzeptanzkriterien**:
  - ✅ Header‑Status‑Texte: für `idle`, `planning`, `executing`, `testing`, `fixing`, `done`, `error` definierte, verständliche Sätze.
  - ✅ Thinking/Timeline‑Empty‑States beschreiben exakt, was der User tun kann.
  - ✅ Test‑/Auto‑Fix‑Hinweise machen deutlich: **nichts läuft automatisch**, es sind Empfehlungen.

### T7 – AIChat Integration ✅ DONE
- **Beschreibung**: AIChat kapselt alle Agent‑Kontrollen und System‑Messages.
- **Akzeptanzkriterien**:
  - ✅ Chat‑Messages für Plan/Build/Tests/Auto‑Fix sind konsistent formatiert.
  - ✅ System‑Posts (z.B. „Build pipeline finished. It is recommended to run the test suite…") sind vorhanden.
  - ✅ Nutzer kann jeden Schritt im Chatverlauf nachvollziehen.

---

## 3. Phase 3 – Tests & QA Experience ✅ COMPLETE

### T8 – Test Runner WS‑Integration ✅ DONE
- **Beschreibung**: `/api/tests/run` & `/api/tests/fix` senden `test_result` Events.
- **Akzeptanzkriterien**:
  - ✅ Nach manuellem Testlauf erscheint ein `test_result`‑Eintrag in der Timeline.
  - ✅ Auto‑Fix sendet eigenes `test_result` mit Summary (Fixed/Still failing).

### T9 – Test Controls & Empfehlungen ✅ DONE
- **Beschreibung**: Test‑Buttons im Context‑Block + sinnvolle Empfehlungen.
- **Akzeptanzkriterien**:
  - ✅ Buttons sind sichtbar, disabled‑Zustände korrekt (z.B. Auto‑Fix nur bei vorhandenen Fails).
  - ✅ Autopilot führt **keine** Tests automatisch aus, sondern empfiehlt sie nur im Chat.

### T10 – Test‑Output‑Darstellung ✅ DONE
- **Beschreibung**: Verbesserte Darstellung von Test‑Resultaten im Chat und Agent Log.
- **Akzeptanzkriterien**:
  - ✅ Zusammenfassung (Total/Passed/Failed/Skipped) immer in einem Block.
  - ✅ Einzelne Tests (mindestens die ersten N) sind mit Status‑Tag im Text sichtbar.

---

## 4. Phase 4 – Linting & Code‑Quality ✅ COMPLETE

### T11 – ESLint/TSCheck Integration ✅ DONE
- **Beschreibung**: Lokale Lint‑/Type‑Check‑Pipeline mit API‑Endpoint.
- **Akzeptanzkriterien**:
  - ✅ Es gibt ein Script/Command, das Lint/TSCheck über das Projekt laufen lässt.
  - ✅ Monaco Editor zeigt TypeScript Diagnostics inline.

### T12 – Lint Auto‑Fix ✅ DONE
- **Beschreibung**: AI‑gestützte Fixes für Lint‑Fehler, optional per Toggle.
- **Akzeptanzkriterien**:
  - ✅ Lint‑Issues werden vom Agent in einen Multi‑File‑Plan übersetzt.
  - ✅ Ausgeführte Fixes erzeugen `file_change`‑Timeline‑Events.
  - ✅ User kann Lint‑Auto‑Fix jederzeit deaktivieren.

### T13 – Editor‑Integration ✅ DONE
- **Beschreibung**: Verbindung zwischen Lint‑API und Monaco‑Diagnostics/Actions.
- **Akzeptanzkriterien**:
  - ✅ Lint‑Fehler sind im Editor markiert (durch TS‑Diagnostics).
  - ✅ Kontext‑Aktion „Fix with MIMI" startet einen Agent‑Run, der Fix‑Vorschläge macht.

---

## 5. Phase 5 – Stabilität & Launch ✅ COMPLETE

### T14 – WebSocket Reconnect & Robustheit ✅ DONE
- **Beschreibung**: Sicherstellen, dass Panel bei WS‑Reconnect stabil bleibt.
- **Akzeptanzkriterien**:
  - ✅ Kurze Netzausfälle führen nicht zu defektem UI (Status geht auf Offline/Online, Panel bleibt nutzbar).
  - ✅ Keine Flooding‑Logs im Browser bei Reconnects.

### T15 – Console/UX‑Audit ✅ DONE
- **Beschreibung**: Letzter Audit vor Launch (Errors, Layout, Dark Mode, Microcopy).
- **Akzeptanzkriterien**:
  - ✅ `console.error` ist im Normalbetrieb leer.
  - ✅ Layout ist auf gängigen Auflösungen stabil (kleine & große Screens).
  - ✅ Dark‑Mode‑Kontrast passt (Text lesbar, keine „blinden" Farben).

---

## 📊 Gesamt-Fortschritt

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Agent-Fundament | T1-T3 | ✅ 100% |
| Phase 2: Mission-Control Panel UX | T4-T7 | ✅ 100% |
| Phase 3: Tests & QA Experience | T8-T10 | ✅ 100% |
| Phase 4: Linting & Code-Quality | T11-T13 | ✅ 100% |
| Phase 5: Stabilität & Launch | T14-T15 | ✅ 100% |

**GESAMT: 15/15 Tasks ✅ (100% COMPLETE)**

---

Diese Task‑Liste dient als **Arbeitsplan**. Alle Karten erfüllen die genannten Akzeptanzkriterien. Mimiverse ist bereit als „5‑Sterne IDE Panel" deployed zu werden.

**Letzte Aktualisierung: 2025-12-23**
