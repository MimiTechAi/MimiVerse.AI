import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock child_process first (must be at top level)
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

// Mock fs first (must be at top level)
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    access: vi.fn(),
    stat: vi.fn()
  }
}));

// Mock optional dependencies
vi.mock('chokidar', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn()
  }))
}));

vi.mock('glob', () => ({
  sync: vi.fn(() => [])
}));

vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mock-hash')
  }))
}));

// Import after mocking
import { TestRunner } from './test-runner';
import { spawn } from 'child_process';
import { default as mockFs } from 'fs/promises';

// Get mocked spawn function
const mockSpawn = spawn as any;

// Mock WebSocket
class MockWebSocket {
  private listeners: Map<string, Function[]> = new Map();

  broadcast(message: any) {
    const listeners = this.listeners.get('broadcast') || [];
    listeners.forEach(listener => listener(message));
  }

  send(message: any) {
    const listeners = this.listeners.get('message') || [];
    listeners.forEach(listener => listener(message));
  }

  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }
}

describe('TestRunner', () => {
  let testRunner: TestRunner;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    testRunner = new TestRunner(mockWs as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    testRunner.cleanup();
  });

  describe('runTests', () => {
    it('should run Jest tests successfully', async () => {
      // Mock Jest execution
      const mockChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('PASS src/components/Button.test.tsx\n');
              callback('FAIL src/utils/helper.test.tsx\n');
            }
          })
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Exit code 1 (some tests failed)
          }
        }),
        kill: vi.fn(),
        pid: 12345, // Add mock PID
        killed: false
      };

      mockSpawn.mockReturnValue(mockChildProcess);

      const runId = await testRunner.runTests({
        framework: 'jest',
        testPath: '**/*.test.tsx',
        options: { coverage: true }
      });

      expect(runId).toBeDefined();
      expect(mockSpawn).toHaveBeenCalledWith('npm', [
        'test',
        '--',
        '--watchAll=false',
        '--coverage',
        '**/*.test.tsx'
      ], expect.any(Object));

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const results = testRunner.getTestResults(runId);
      expect(results).toBeDefined();
      expect(results?.framework).toBe('jest');
      expect(results?.total).toBeGreaterThan(0);
    });

    it('should run Vitest tests successfully', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('✓ src/components/Button.test.tsx (2)\n');
              callback('✗ src/utils/helper.test.tsx (1)\n');
            }
          })
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Exit code 0 (all tests passed)
          }
        }),
        kill: vi.fn(),
        pid: 12346
      };

      mockSpawn.mockReturnValue(mockChildProcess);

      const runId = await testRunner.runTests({
        framework: 'vitest',
        testPath: '**/*.test.ts',
        options: { run: true }
      });

      expect(mockSpawn).toHaveBeenCalledWith('npx', [
        'vitest',
        'run',
        '**/*.test.ts'
      ], expect.any(Object));
    });

    it('should run Mocha tests successfully', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('  ✓ Button component\n');
              callback('  1) Helper function\n');
            }
          })
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1);
          }
        }),
        kill: vi.fn(),
        pid: 12347
      };

      mockSpawn.mockReturnValue(mockChildProcess);

      const runId = await testRunner.runTests({
        framework: 'mocha',
        testPath: 'test/**/*.test.js',
        options: { timeout: 5000 }
      });

      expect(mockSpawn).toHaveBeenCalledWith('npx', [
        'mocha',
        'test/**/*.test.js',
        '--timeout',
        '5000'
      ], expect.any(Object));
    });

    it('should handle parallel test execution', async () => {
      const mockChildProcess1 = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
        pid: 12355
      };
      
      const mockChildProcess2 = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
        pid: 12356
      };

      mockSpawn.mockReturnValueOnce(mockChildProcess1);
      mockSpawn.mockReturnValueOnce(mockChildProcess2);

      const runIds = await Promise.all([
        testRunner.runTests({
          framework: 'jest',
          testPath: 'src/**/*.test.tsx'
        }),
        testRunner.runTests({
          framework: 'vitest',
          testPath: 'utils/**/*.test.ts'
        })
      ]);

      expect(runIds).toHaveLength(2);
      expect(runIds[0]).not.toBe(runIds[1]);

      const status1 = testRunner.getTestStatus(runIds[0]);
      const status2 = testRunner.getTestStatus(runIds[1]);

      expect(status1?.status).toBe('running');
      expect(status2?.status).toBe('running');
    });

    it('should broadcast test progress via WebSocket', async () => {
      const broadcastSpy = vi.spyOn(mockWs, 'broadcast');

      const mockChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            callback('Running tests...\n');
            callback('50% complete\n');
            callback('100% complete\n');
          })
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
        kill: vi.fn(),
        pid: 12354
      };

      mockSpawn.mockReturnValue(mockChildProcess);

      await testRunner.runTests({
        framework: 'jest',
        testPath: '**/*.test.tsx'
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(broadcastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test_progress',
          data: expect.objectContaining({
            runId: expect.any(String),
            progress: expect.any(Number)
          })
        })
      );
    });
  });

  describe('stopTests', () => {
    it('should stop running tests', async () => {
      const mockChildProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
        pid: 12348
      };

      mockSpawn.mockReturnValue(mockChildProcess);

      const runId = await testRunner.runTests({
        framework: 'jest',
        testPath: '**/*.test.tsx'
      });

      const stopped = testRunner.stopTests(runId);
      expect(stopped).toBe(true);
      expect(mockChildProcess.kill).toHaveBeenCalled();
    });

    it('should return false for non-existent test run', () => {
      const stopped = testRunner.stopTests('non-existent-id');
      expect(stopped).toBe(false);
    });
  });

  describe('getTestStatus', () => {
    it('should return correct test status', async () => {
      const mockChildProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
        pid: 12349
      };

      mockSpawn.mockReturnValue(mockChildProcess);

      const runId = await testRunner.runTests({
        framework: 'jest',
        testPath: '**/*.test.tsx'
      });

      const status = testRunner.getTestStatus(runId);
      expect(status).toEqual({
        runId,
        framework: 'jest',
        status: 'running',
        startTime: expect.any(Number),
        progress: 0,
        total: 0,
        passed: 0,
        failed: 0
      });
    });

    it('should return null for non-existent test run', () => {
      const status = testRunner.getTestStatus('non-existent-id');
      expect(status).toBeNull();
    });
  });

  describe('getTestResults', () => {
    it('should return formatted test results', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            callback('Test Suites: 1 passed, 1 total\n');
            callback('Tests:       2 passed, 1 failed, 3 total\n');
            callback('Snapshots:   0 total\n');
            callback('Time:        2.345 s\n');
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
        kill: vi.fn(),
        pid: 12350
      };

      mockSpawn.mockReturnValue(mockChildProcess);

      const runId = await testRunner.runTests({
        framework: 'jest',
        testPath: '**/*.test.tsx'
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const results = testRunner.getTestResults(runId);
      expect(results).toEqual({
        runId,
        framework: 'jest',
        status: 'completed',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number),
        total: 3,
        passed: 2,
        failed: 1,
        skipped: 0,
        coverage: undefined,
        testSuites: {
          total: 1,
          passed: 1,
          failed: 0
        },
        output: expect.any(String)
      });
    });
  });

  describe('caching', () => {
    it('should cache test results', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            callback('Tests: 2 passed, 0 failed\n');
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
        kill: vi.fn(),
        pid: 12351
      };

      mockSpawn.mockReturnValue(mockChildProcess);

      const runId = await testRunner.runTests({
        framework: 'jest',
        testPath: '**/*.test.tsx',
        options: { cache: true }
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const cached = testRunner.getCachedResults('jest', '**/*.test.tsx');
      expect(cached).toBeDefined();
      expect(cached?.results.total).toBe(2);
    });

    it('should invalidate cache when files change', () => {
      testRunner.invalidateCache('jest', '**/*.test.tsx');
      
      const cached = testRunner.getCachedResults('jest', '**/*.test.tsx');
      expect(cached).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle test runner process errors', async () => {
      const mockChildProcess = {
        stdout: { on: vi.fn() },
        stderr: {
          on: vi.fn((event, callback) => {
            callback('Error: Test configuration not found\n');
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Test runner not found'));
          }
        }),
        kill: vi.fn(),
        pid: 12353
      };

      mockSpawn.mockReturnValue(mockChildProcess);

      const runId = await testRunner.runTests({
        framework: 'jest',
        testPath: '**/*.test.tsx'
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const results = testRunner.getTestResults(runId);
      expect(results?.status).toBe('failed');
      expect(results?.error).toContain('Test runner not found');
    });

    it('should handle unsupported framework', async () => {
      await expect(testRunner.runTests({
        framework: 'unsupported' as any,
        testPath: '**/*.test.tsx'
      })).rejects.toThrow('Unsupported test framework: unsupported');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', () => {
      testRunner.createTestWatcher('src');
      testRunner.cleanup();
      
      expect(() => testRunner.cleanup()).not.toThrow();
    });
  });
});
