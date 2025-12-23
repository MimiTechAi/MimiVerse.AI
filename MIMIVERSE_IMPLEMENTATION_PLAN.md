# Mimiverse IDE - Schritt-für-Schritt Implementation Plan (TDD + BDD + PBT)

## 📋 ÜBERSICRT

Dieses Dokument definiert den detaillierten Implementierungsplan für Mimiverse IDE basierend auf:
- Kompletter Projektanalyse
- Acceptance Criteria Specifications
- Technical Design Specifications
- TDD (Test-Driven Development)
- BDD (Behavior-Driven Development)
- PBT (Property-Based Testing)

---

## 🎯 IMPLEMENTATIONSSTRATEGIE

### **Methodikübersicht**

| Methode | Anwendungsbereich | Tools | Ziel |
|---------|------------------|--------|------|
| **TDD** | Unit Tests, Component Logic | Vitest, React Testing Library | Funktionale Korrektheit |
| **BDD** | User Workflows, Integration | Playwright, Gherkin | End-to-End Szenarien |
| **PBT** | Edge Cases, Robustheit | Fast-Check | Property Validierung |

### **Entwicklungszyklus pro Feature**
1. **Red Phase**: Test schreiben (failend)
2. **Green Phase**: Minimal Implementation (bestehende Tests)
3. **Refactor Phase**: Code optimieren (Tests bestehen)
4. **BDD Integration**: Akzeptanzszenarien implementieren
5. **PBT Validation**: Edge Cases absichern

---

## 🗓️ PHASENPLAN (10 WOCHEN)

### **PHASE 1: FOUNDATION (WOCHE 1-2)**

#### **Woche 1: WebSocket & State Machine**

**Day 1-2: WebSocket Schema & Validation**
```bash
# TDD Approach
1. Tests schreiben für WebSocket Message Validation
2. Validation Function implementieren
3. Tests grün machen
4. BDD Szenarien für WebSocket Verbindung
5. PBT für Message Robustheit

# Dateien:
- server/websocket/message-validator.test.ts
- server/websocket/message-validator.ts
- client/src/hooks/useAgentWebSocket.test.tsx
- client/src/hooks/useAgentWebSocket.ts
```

**Implementation Steps (TDD):**
```typescript
// Step 1: Write failing test
describe('WSMessage Validation', () => {
  it('should reject messages without id', () => {
    const message = { type: 'test', createdAt: Date.now() };
    expect(() => validateWSMessage(message)).toThrow();
  });
});

// Step 2: Implement minimal validation
export const validateWSMessage = (message: any) => {
  if (!message.id) throw new Error('ID required');
  return message;
};

// Step 3: Make test pass, refactor
export const validateWSMessage = (message: any): WSMessage => {
  if (!message.id || !message.type || !message.createdAt) {
    throw new Error('Invalid message structure');
  }
  return message as WSMessage;
};

// Step 4: BDD Integration
Feature: WebSocket Communication
  Scenario: Valid message reception
    Given a WebSocket connection is established
    When a valid message is received
    Then message should be processed
    And UI should update

// Step 5: PBT Integration
it('should handle all valid message combinations', () => {
  fc.assert(fc.property(
    fc.string(),
    fc.string(),
    fc.date(),
    (id, type, createdAt) => {
      const message = { id, type, createdAt: createdAt.getTime() };
      expect(() => validateWSMessage(message)).not.toThrow();
    }
  ));
});
```

**Day 3-4: Agent State Machine**
```typescript
// TDD Implementation
describe('AgentStateMachine', () => {
  it('should transition from idle to planning', () => {
    const machine = new AgentStateMachine();
    machine.transition('planning');
    expect(machine.getCurrentState()).toBe('planning');
  });
  
  it('should reject invalid transitions', () => {
    const machine = new AgentStateMachine();
    machine.transition('planning');
    expect(() => machine.transition('idle')).toThrow();
  });
});

// Implementation
export class AgentStateMachine {
  private state: RunLifecycleState = 'idle';
  
  transition(newState: RunLifecycleState): void {
    if (!this.isValidTransition(this.state, newState)) {
      throw new Error(`Invalid transition: ${this.state} → ${newState}`);
    }
    this.state = newState;
  }
  
  private isValidTransition(from: RunLifecycleState, to: RunLifecycleState): boolean {
    const transitions = {
      idle: ['planning'],
      planning: ['executing', 'error'],
      executing: ['testing', 'error'],
      testing: ['fixing', 'done', 'error'],
      fixing: ['testing', 'done', 'error'],
      error: ['idle', 'planning'],
      done: ['idle']
    };
    return transitions[from]?.includes(to) || false;
  }
}
```

**Day 5: Integration & Testing**
```bash
# Integration Tests
- server/websocket/integration.test.ts
- client/src/hooks/useAgentRun.integration.test.tsx

# BDD Scenarios
- features/websocket-connection.feature
- features/agent-state-transitions.feature

# PBT Properties
- test/property/websocket-messages.test.ts
- test/property/state-transitions.test.ts
```

#### **Woche 2: useAgentRun Hook & Basic UI**

**Day 6-7: useAgentRun Hook (TDD)**
```typescript
// Test-first approach
describe('useAgentRun Hook', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useAgentRun());
    
    expect(result.current.currentRun).toBeNull();
    expect(result.current.agentEvents).toEqual([]);
    expect(result.current.thinkingStream).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });
  
  it('should update currentRun on status event', () => {
    const { result } = renderHook(() => useAgentRun());
    
    act(() => {
      mockWebSocket.emit('message', {
        type: 'status',
        data: { state: 'planning', runId: 'test-123' }
      });
    });
    
    expect(result.current.currentRun?.state).toBe('planning');
    expect(result.current.currentRun?.runId).toBe('test-123');
  });
});

// Implementation
export const useAgentRun = () => {
  const [currentRun, setCurrentRun] = useState<AgentRunState | null>(null);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [thinkingStream, setThinkingStream] = useState<ThinkingEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const { lastMessage } = useAgentWebSocket();
  
  useEffect(() => {
    if (lastMessage) {
      processAgentEvent(lastMessage);
    }
  }, [lastMessage]);
  
  const processAgentEvent = useCallback((event: WSMessage) => {
    switch (event.type) {
      case 'status':
        setCurrentRun(prev => ({
          ...prev,
          ...event.data,
          ...(prev?.runId ? {} : { runId: event.data.runId })
        }));
        break;
      // ... other event types
    }
  }, []);
  
  return { currentRun, agentEvents, thinkingStream, isConnected };
};
```

**Day 8-9: Mission Control Panel Layout**
```typescript
// Component Tests (TDD)
describe('MissionControlPanel', () => {
  it('should render all sections', () => {
    render(<MissionControlPanel />);
    
    expect(screen.getByTestId('agent-status-header')).toBeInTheDocument();
    expect(screen.getByTestId('build-pipeline')).toBeInTheDocument();
    expect(screen.getByTestId('thinking-stream')).toBeInTheDocument();
    expect(screen.getByTestId('agent-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('context-section')).toBeInTheDocument();
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
  });
  
  it('should show empty states when no agent run', () => {
    render(<MissionControlPanel />);
    
    expect(screen.getByText('Warte auf Anweisungen...')).toBeInTheDocument();
    expect(screen.getByText('Keine Aktivität bisher')).toBeInTheDocument();
  });
});

// Implementation
export const MissionControlPanel: React.FC = () => {
  const { currentRun, agentEvents, thinkingStream, isConnected } = useAgentRun();
  
  return (
    <div className="mission-control-panel" data-testid="mission-control-panel">
      <AgentStatusHeader 
        status={isConnected ? 'online' : 'offline'}
        connectionState={currentRun?.state}
      />
      <BuildPipelineComponent 
        currentPhase={currentRun?.currentPhase}
        phases={getPipelinePhases(currentRun?.state)}
      />
      <ThinkingStreamComponent 
        entries={thinkingStream}
        maxEntries={50}
      />
      <AgentTimelineComponent 
        events={agentEvents}
      />
      <ContextSectionComponent />
      <AIChatComponent />
    </div>
  );
};
```

**Day 10: BDD Integration & PBT**
```gherkin
# BDD Feature
Feature: Mission Control Panel
  As a developer
  I want to see all agent information in one panel
  So that I can monitor AI activity without switching views

  Scenario: Panel loads with no active run
    Given I open Mimiverse IDE
    Then I should see the mission control panel
    And I should see empty state messages
    And the panel should be fully responsive

  Scenario: Agent starts planning
    Given the mission control panel is loaded
    When I send a message to MIMI
    Then I should see the planning phase activate
    And I should see thinking steps appear
    And the status should update in real-time
```

---

### **PHASE 2: UI/UX IMPLEMENTATION (WOCHE 3-4)**

#### **Woche 3: Advanced Components**

**Day 11-12: Build Pipeline Component**
```typescript
// TDD Tests
describe('BuildPipelineComponent', () => {
  it('should show 4 pipeline phases', () => {
    const phases = [
      { id: 'plan', label: 'Plan', status: 'pending' },
      { id: 'execute', label: 'Execute', status: 'pending' },
      { id: 'test', label: 'Test', status: 'pending' },
      { id: 'fix', label: 'Fix', status: 'pending' }
    ];
    
    render(<BuildPipelineComponent phases={phases} currentPhase={0} />);
    
    expect(screen.getAllByTestId('pipeline-phase')).toHaveLength(4);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Execute')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Fix')).toBeInTheDocument();
  });
  
  it('should highlight active phase', () => {
    const phases = getTestPhases();
    render(<BuildPipelineComponent phases={phases} currentPhase={1} />);
    
    const activePhase = screen.getByTestId('pipeline-phase-1');
    expect(activePhase).toHaveClass('active');
  });
});

// Implementation
interface BuildPipelineProps {
  phases: PipelinePhase[];
  currentPhase: number;
  onPhaseClick?: (phase: PipelinePhase) => void;
}

export const BuildPipelineComponent: React.FC<BuildPipelineProps> = ({
  phases,
  currentPhase,
  onPhaseClick
}) => {
  return (
    <div className="build-pipeline" data-testid="build-pipeline">
      {phases.map((phase, index) => (
        <div
          key={phase.id}
          className={`pipeline-phase ${index === currentPhase ? 'active' : ''} ${phase.status}`}
          data-testid={`pipeline-phase-${index}`}
          onClick={() => onPhaseClick?.(phase)}
        >
          <div className="phase-icon">
            {getPhaseIcon(phase.status)}
          </div>
          <div className="phase-label">{phase.label}</div>
          <div className="phase-duration">
            {phase.duration ? `${phase.duration}ms` : ''}
          </div>
        </div>
      ))}
    </div>
  );
};
```

**Day 13-14: Thinking Stream & Timeline**
```typescript
// TDD for Thinking Stream
describe('ThinkingStreamComponent', () => {
  it('should display thinking entries in reverse chronological order', () => {
    const entries: ThinkingEntry[] = [
      { id: '1', content: 'First', timestamp: 1000, relativeTime: '+10s' },
      { id: '2', content: 'Second', timestamp: 2000, relativeTime: '+5s' },
      { id: '3', content: 'Third', timestamp: 3000, relativeTime: '+0s' }
    ];
    
    render(<ThinkingStreamComponent entries={entries} />);
    
    const thinkingEntries = screen.getAllByTestId('thinking-entry');
    expect(thinkingEntries).toHaveLength(3);
    expect(thinkingEntries[0]).toHaveTextContent('Third');
    expect(thinkingEntries[1]).toHaveTextContent('Second');
    expect(thinkingEntries[2]).toHaveTextContent('First');
  });
  
  it('should limit entries to maxEntries', () => {
    const entries = Array(100).fill(null).map((_, i) => ({
      id: i.toString(),
      content: `Entry ${i}`,
      timestamp: Date.now() + i,
      relativeTime: `+${i}s`
    }));
    
    render(<ThinkingStreamComponent entries={entries} maxEntries={50} />);
    
    expect(screen.getAllByTestId('thinking-entry')).toHaveLength(50);
  });
});

// PBT for Timeline
describe('AgentTimeline Property Tests', () => {
  it('should handle any valid event sequence', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        type: fc.constantFrom(['thinking', 'tool_use', 'file_change', 'test_result']),
        timestamp: fc.date(),
        label: fc.string(),
        detail: fc.string()
      })),
      (events) => {
        expect(() => <AgentTimelineComponent events={events} />).not.toThrow();
      }
    ));
  });
});
```

**Day 15: Dark Mode & Responsive Design**
```typescript
// BDD Scenarios
Feature: Dark Mode
  As a developer
  I want a consistent dark theme
  So that I can work comfortably in low-light conditions

  Scenario: Dark mode consistency
    Given I open Mimiverse IDE
    Then the panel should use dark background colors
    And text should have sufficient contrast (WCAG AA)
    And purple/indigo accents should be consistent

Feature: Responsive Design
  As a developer
  I want the panel to work on different screen sizes
  So that I can use Mimiverse on various devices

  Scenario: Desktop layout
    Given I have a 1920x1080 screen
    Then the panel should use optimal spacing
    And all sections should be visible

  Scenario: Laptop layout
    Given I have a 1366x768 screen
    Then the panel should remain functional
    And sections may stack if needed
```

#### **Woche 4: Integration & Polish**

**Day 16-17: Context Section & File Operations**
```typescript
// TDD for Context Section
describe('ContextSectionComponent', () => {
  it('should show current open files', () => {
    const openFiles = [
      { id: 'App.tsx', name: 'App.tsx', content: '...' },
      { id: 'main.ts', name: 'main.ts', content: '...' }
    ];
    
    render(<ContextSectionComponent openFiles={openFiles} />);
    
    expect(screen.getByText('Offene Dateien')).toBeInTheDocument();
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
    expect(screen.getByText('main.ts')).toBeInTheDocument();
  });
  
  it('should show test controls', () => {
    render(<ContextSectionComponent />);
    
    expect(screen.getByTestId('run-tests-button')).toBeInTheDocument();
    expect(screen.getByTestId('auto-fix-button')).toBeInTheDocument();
    expect(screen.getByTestId('run-tests-button')).toBeEnabled();
    expect(screen.getByTestId('auto-fix-button')).toBeDisabled(); // No failing tests
  });
});

// BDD for File Operations
Feature: File Operations
  As a developer
  I want to see file changes in real-time
  So that I can track what MIMI is modifying

  Scenario: File creation
    Given MIMI creates a new file
    Then I should see the file in the timeline
    And the file explorer should show the new file
    And the editor should open the file

  Scenario: File modification
    Given MIMI modifies an existing file
    Then I should see the change in the timeline
    And the editor should show the changes
    And unsaved changes should be indicated
```

**Day 18-19: Error Handling & Edge Cases**
```typescript
// PBT for Error Handling
describe('Error Handling Properties', () => {
  it('should handle malformed WebSocket messages gracefully', () => {
    fc.assert(fc.property(fc.json(), (malformedMessage) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = processMessage(malformedMessage);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    }));
  });
});

// Integration Tests
describe('Error Recovery', () => {
  it('should reconnect on WebSocket disconnect', async () => {
    const { result } = renderHook(() => useAgentWebSocket());
    
    // Simulate disconnect
    mockWebSocket.close();
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
    
    // Should attempt reconnection
    await waitFor(() => {
      expect(mockWebSocket.connect).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});
```

**Day 20: Week 4 Review & Refactoring**
```bash
# Code Quality Checks
npm run test:coverage
npm run lint
npm run type-check

# Performance Tests
npm run test:performance
npm run test:memory

# Documentation Updates
npm run docs:generate
```

---

### **PHASE 3: INTEGRATION (WOCHE 5-6)**

#### **Woche 5: File System & Test Integration**

**Day 21-22: File Change Integration**
```typescript
// TDD for File Operations
describe('File Change Integration', () => {
  it('should broadcast file change events', async () => {
    const mockBroadcast = jest.fn();
    const fileManager = new FileManager(mockBroadcast);
    
    await fileManager.writeFile('/test/path', 'new content');
    
    expect(mockBroadcast).toHaveBeenCalledWith({
      type: 'file_change',
      data: {
        path: '/test/path',
        changeType: 'update',
        content: 'new content'
      }
    });
  });
  
  it('should update file explorer on file change', async () => {
    const { result } = renderHook(() => useFiles());
    
    act(() => {
      mockWebSocket.emit('message', {
        type: 'file_change',
        data: { path: '/new/file.ts', changeType: 'create' }
      });
    });
    
    expect(result.current.files).toContainEqual(
      expect.objectContaining({ path: '/new/file.ts' })
    );
  });
});

// BDD Integration
Feature: File System Integration
  As a developer
  I want file changes to sync across all components
  So that the workspace stays consistent

  Scenario: File creation from AI
    Given MIMI creates a component file
    Then the file explorer should show the new file
    And the editor should be able to open the file
    And the timeline should log the creation
```

**Day 23-24: Test Runner API**
```typescript
// TDD for Test Runner
describe('Test Runner', () => {
  it('should run tests and return results', async () => {
    const testRunner = new TestRunner();
    
    const results = await testRunner.runTests('/test/project', 'jest');
    
    expect(results).toEqual(expect.objectContaining({
      total: expect.any(Number),
      passed: expect.any(Number),
      failed: expect.any(Number),
      duration: expect.any(Number)
    }));
  });
  
  it('should broadcast test results', async () => {
    const mockBroadcast = jest.fn();
    const testRunner = new TestRunner(mockBroadcast);
    
    await testRunner.runTests('/test/project');
    
    expect(mockBroadcast).toHaveBeenCalledWith({
      type: 'test_result',
      data: expect.objectContaining({
        status: expect.any(String),
        summary: expect.any(Object)
      })
    });
  });
});

// PBT for Test Results
describe('Test Result Properties', () => {
  it('should handle any valid test result structure', () => {
    fc.assert(fc.property(
      fc.record({
        total: fc.integer({ min: 0, max: 1000 }),
        passed: fc.integer({ min: 0, max: 1000 }),
        failed: fc.integer({ min: 0, max: 1000 }),
        skipped: fc.integer({ min: 0, max: 100 }),
        duration: fc.integer({ min: 0, max: 300000 })
      }),
      (testResult) => {
        expect(() => formatTestResult(testResult)).not.toThrow();
      }
    ));
  });
});
```

**Day 25: Auto-Fix Implementation**
```typescript
// TDD for Auto-Fix
describe('Auto-Fix Functionality', () => {
  it('should analyze test failures and generate fixes', async () => {
    const testFailures = [
      { file: 'test.ts', line: 10, error: 'Expected true but got false' }
    ];
    
    const autoFixer = new AutoFixer();
    const fixPlan = await autoFixer.generateFixPlan(testFailures);
    
    expect(fixPlan).toEqual(expect.objectContaining({
      steps: expect.any(Array),
      estimatedDuration: expect.any(Number)
    }));
  });
  
  it('should apply fixes and re-run tests', async () => {
    const autoFixer = new AutoFixer();
    const fixPlan = getMockFixPlan();
    
    const results = await autoFixer.executeFixPlan(fixPlan);
    
    expect(results.fixedFiles).toBeGreaterThan(0);
    expect(results.testResults).toBeDefined();
  });
});
```

---

### **PHASE 4: SECURITY & PERFORMANCE (WOCHE 7-8)**

#### **Woche 7: Security Implementation**

**Day 26-27: Rate Limiting & Input Validation**
```typescript
// TDD for Security
describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    const limiter = createRateLimiter(60000, 10, 'Too many requests');
    const req = mockRequest();
    
    for (let i = 0; i < 10; i++) {
      await limiter(req, mockResponse, mockNext);
      expect(mockResponse.status).not.toBe(429);
    }
  });
  
  it('should block requests exceeding limit', async () => {
    const limiter = createRateLimiter(60000, 10, 'Too many requests');
    const req = mockRequest();
    
    for (let i = 0; i < 11; i++) {
      await limiter(req, mockResponse, mockNext);
    }
    
    expect(mockResponse.status).toBe(429);
    expect(JSON.parse(mockResponse.json)).toEqual({ error: 'Too many requests' });
  });
});

// BDD Security Scenarios
Feature: Security
  As a system administrator
  I want API endpoints to be protected
  So that the system remains stable and secure

  Scenario: Rate limiting
    Given a user makes 10 requests per minute
    Then requests should be allowed
    When the user makes the 11th request
    Then the request should be blocked
    And the user should receive a rate limit error

  Scenario: Input validation
    Given a user sends malicious input
    Then the input should be rejected
    And the user should receive a validation error
    And no code should be executed
```

**Day 28-29: Path Security & Session Management**
```typescript
// TDD for Path Security
describe('Path Security', () => {
  it('should allow paths within user workspace', () => {
    const userPath = 'src/components/Button.tsx';
    const userId = 'user-123';
    
    const securePath = PathSecurity.validatePath(userPath, userId);
    
    expect(securePath).toContain(`user-${userId}`);
    expect(securePath).toContain('src/components/Button.tsx');
  });
  
  it('should block path traversal attempts', () => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '~/.ssh/id_rsa',
      '/etc/hosts',
      '..\\..\\windows\\system32'
    ];
    
    maliciousPaths.forEach(path => {
      expect(() => PathSecurity.validatePath(path, 'user-123')).toThrow();
    });
  });
});

// PBT for Security
describe('Security Properties', () => {
  it('should reject all path traversal patterns', () => {
    fc.assert(fc.property(fc.string(), (path) => {
      if (path.includes('../') || path.includes('..\\') || path.startsWith('/')) {
        expect(() => PathSecurity.validatePath(path, 'user')).toThrow();
      }
    }));
  });
});
```

#### **Woche 8: Performance Optimization**

**Day 30-31: Performance Monitoring**
```typescript
// TDD for Performance
describe('Performance Metrics', () => {
  it('should record response times', () => {
    const metrics = new ApplicationMetrics();
    
    metrics.recordAIRequest('qwen3-coder:30b', 150, true);
    
    expect(metrics.getMetric('ai_requests_qwen3-coder:30b_total')).toBe(1);
    expect(metrics.getMetric('ai_requests_qwen3-coder:30b_duration_ms')).toBe(150);
    expect(metrics.getMetric('ai_requests_qwen3-coder:30b_success_rate')).toBe(1);
  });
  
  it('should track memory usage', () => {
    const metrics = new ApplicationMetrics();
    
    metrics.recordMemoryUsage();
    
    expect(metrics.getMetric('memory_heap_used_mb')).toBeGreaterThan(0);
  });
});

// Performance Tests (PBT)
describe('Performance Properties', () => {
  it('should handle concurrent operations without memory leaks', async () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 100 }), async (concurrency) => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const promises = Array(concurrency).fill(null).map(() => simulateAgentRun());
      await Promise.all(promises);
      
      // Force garbage collection
      if (global.gc) global.gc();
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not leak more than 10MB per operation
      expect(memoryIncrease).toBeLessThan(concurrency * 10 * 1024 * 1024);
    }));
  });
});
```

---

### **PHASE 5: PRODUCTION READINESS (WOCHE 9-10)**

#### **Woche 9: Health Checks & Monitoring**

**Day 32-33: Health Check System**
```typescript
// TDD for Health Checks
describe('Health Checker', () => {
  it('should report healthy status for all services', async () => {
    const healthChecker = new HealthChecker();
    
    const health = await healthChecker.checkSystem();
    
    expect(health.status).toBe('healthy');
    expect(health.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ service: 'database', status: 'healthy' }),
        expect.objectContaining({ service: 'redis', status: 'healthy' }),
        expect.objectContaining({ service: 'ollama', status: 'healthy' }),
        expect.objectContaining({ service: 'triton', status: 'healthy' })
      ])
    );
  });
  
  it('should detect service failures', async () => {
    // Mock database failure
    mockDatabaseFailure();
    
    const healthChecker = new HealthChecker();
    const health = await healthChecker.checkSystem();
    
    expect(health.status).toBe('degraded');
    expect(health.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ service: 'database', status: 'unhealthy' })
      ])
    );
  });
});

// BDD Health Scenarios
Feature: Health Monitoring
  As a system administrator
  I want to monitor system health
  So that I can quickly identify and resolve issues

  Scenario: All services healthy
    Given all system services are running
    When I check the health endpoint
    Then I should see a healthy status
    And all services should report as responsive

  Scenario: Service degradation
    Given a database connection fails
    When I check the health endpoint
    Then I should see a degraded status
    And the specific service should be marked as unhealthy
```

**Day 34-35: Documentation & Deployment**
```bash
# TDD for Documentation Generation
describe('Documentation Generator', () => {
  it('should generate API documentation from source', async () => {
    const docs = await generateAPIDocumentation();
    
    expect(docs.endpoints).toContain('/api/ai/chat');
    expect(docs.endpoints).toContain('/api/tests/run');
    expect(docs.schemas).toBeDefined();
  });
});

# Deployment Scripts (Test-Driven)
describe('Deployment', () => {
  it('should create Docker containers with correct configuration', () => {
    const config = generateDockerConfig();
    
    expect(config.services.mimiverse-app.environment).toContain('NODE_ENV=production');
    expect(config.services.postgres.image).toBe('pgvector/pgvector:pg16');
  });
  
  it('should validate production environment', () => {
    const env = validateProductionEnv();
    
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.SESSION_SECRET).not.toContain('dev_');
  });
});
```

---

## 🧪 TEST STRATEGIE ÜBERSICHT

### **Unit Tests (TDD)**
```bash
# Ausführung
npm run test:unit
npm run test:coverage

# Abdeckung:
- Components: >80%
- Hooks: >85%
- Utils: >90%
- API Routes: >75%
```

### **Integration Tests (BDD)**
```bash
# Ausführung
npm run test:integration
npm run test:bdd

# Szenarien:
- WebSocket Kommunikation
- File Change Integration
- Test Runner API
- Auto-Fix Workflows
```

### **End-to-End Tests (Playwright)**
```bash
# Ausführung
npm run test:e2e

# Workflows:
- Complete Feature Development
- Error Recovery
- Multi-File Operations
- Real-time Updates
```

### **Property-Based Tests (PBT)**
```bash
# Ausführung
npm run test:pbt

# Properties:
- WebSocket Message Robustheit
- State Machine Transitionen
- Input Validation Security
- Performance unter Last
```

---

## 📊 QUALITÄTSSICHERUNG

### **Code Quality Gates**
```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Check coverage
        run: |
          COVERAGE=$(npm run test:coverage:extract)
          if (( $(echo "$COVERAGE < 70") )); then
            echo "Coverage too low: $COVERAGE%"
            exit 1
          fi
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Run PBT tests
        run: npm run test:pbt
      
      - name: Security audit
        run: npm audit --audit-level moderate
      
      - name: Type check
        run: npm run type-check
```

### **Performance Benchmarks**
```typescript
// performance-benchmarks.test.ts
describe('Performance Benchmarks', () => {
  it('should render mission control panel within 200ms', async () => {
    const startTime = performance.now();
    
    render(<MissionControlPanel />);
    
    await waitFor(() => {
      expect(screen.getByTestId('mission-control-panel')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(200);
  });
  
  it('should handle 1000 concurrent operations', async () => {
    const startTime = Date.now();
    
    await Promise.all(
      Array(1000).fill(null).map(() => simulateAgentRun())
    );
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(10000); // 10s max
  });
});
```

---

## 🚀 DEPLOYMENT STRATEGIE

### **Continuous Integration Pipeline**
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-node
      - install-dependencies
      - run-tests
      - security-audit
      - build-application
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - checkout
      - setup-docker
      - deploy-to-staging
      - run-smoke-tests
      - deploy-to-production
```

### **Environment Configuration**
```typescript
// env.config.ts
export const environments = {
  development: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    RATE_LIMIT_REQUESTS: 100,
    WEBSOCKET_RECONNECT_DELAY: 1000
  },
  staging: {
    NODE_ENV: 'staging',
    LOG_LEVEL: 'info',
    RATE_LIMIT_REQUESTS: 50,
    WEBSOCKET_RECONNECT_DELAY: 3000
  },
  production: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'warn',
    RATE_LIMIT_REQUESTS: 20,
    WEBSOCKET_RECONNECT_DELAY: 5000
  }
};
```

---

## 🏗️ **NEUE ARCHITEKTUR-ENTSCHEIDUNG: DESKTOP-IDE**

### **Windsurf/Cursor Hybrid-Ansatz übernommen**

Basierend auf tiefergehender Architektur-Analyse:

**Tech-Stack Entscheidung:**
- ✅ **Frontend**: React/TypeScript (bereits implementiert)
- ✅ **Backend**: Rust für Performance-kritische AI-Operationen
- ✅ **Desktop Shell**: Electron/Tauri für Cross-Plattform
- ✅ **Kommunikation**: WebSockets für Echtzeit-Features

**Implementierungs-Phasen:**
1. **Phase 1**: Rust-Core für AI-Engine entwickeln
2. **Phase 2**: Electron-Shell für Desktop-Integration
3. **Phase 3**: Cross-Plattform Packaging (Windows/macOS/Linux)
4. **Phase 4**: Native API-Integration (File-System, Prozesse)

---

## 🚀 GESAMT-FORTSCHRITT AKTUALISIERT

### **UI/UX Implementation: 100% COMPLETE** ✅
- Agent Status Header ✅
- Build Pipeline ✅  
- Thinking Stream ✅
- Agent Timeline ✅
- Context Section ✅
- Dark Mode & Responsive ✅

### **Architektur: Hybrid-Ansatz bestätigt** ✅
- React Frontend ✅
- Rust Core Backend ✅ (Geplant)
- Electron/Tauri Desktop Shell ✅ (Geplant)
- WebSocket Echtzeit-Kommunikation ✅

### **Overall Progress: 20/34 Items (59%)**
- ✅ Phase 1-2: Foundation & UI (100%)
- 🔄 Phase 3: Integration (0% - Starting)
- 🔄 Phase 4: Security & Performance (0%)
- 🔄 Phase 5: Production Readiness (0%)

### **Nächste Meilensteine:**
1. **Week 5-6**: File Change Integration, Test Runner API, Auto-Fix
2. **Week 7-8**: Security Implementation, Performance Optimization  
3. **Week 9-10**: Production Deployment, Monitoring

---

Dieser Schritt-für-Schritt Implementationsplan stellt sicher, dass Mimiverse IDE nach TDD + BDD + PBT Methoden mit höchster Qualität entwickelt wird.
