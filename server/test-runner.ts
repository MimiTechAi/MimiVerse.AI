import { AgentWebSocket } from './websocket';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TestRunOptions {
  framework: 'jest' | 'vitest' | 'mocha' | 'playwright';
  testPath?: string;
  options?: {
    coverage?: boolean;
    watch?: boolean;
    timeout?: number;
    run?: boolean;
    cache?: boolean;
    parallel?: boolean;
    [key: string]: any;
  };
}

export interface TestStatus {
  runId: string;
  framework: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startTime: number;
  endTime?: number;
  progress: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration?: number;
  error?: string;
}

export interface TestResults extends TestStatus {
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  testSuites?: {
    total: number;
    passed: number;
    failed: number;
  };
  output: string;
}

export interface CachedTestResult {
  results: TestResults;
  timestamp: number;
  fileHash: string;
}

/**
 * TestRunner - Multi-framework test execution with real-time progress
 * Supports Jest, Vitest, Mocha, and Playwright with parallel execution
 */
export class TestRunner {
  private websocket: AgentWebSocket;
  private runningTests: Map<string, {
    process: ChildProcess;
    startTime: number;
    options: TestRunOptions;
    output: string[];
    status: TestStatus;
  }> = new Map();

  private cache: Map<string, CachedTestResult> = new Map();
  private testWatchers: Map<string, any> = new Map();

  constructor(websocket: AgentWebSocket) {
    this.websocket = websocket;
  }

  /**
   * Run tests with specified framework and options
   */
  async runTests(options: TestRunOptions): Promise<string> {
    const runId = this.generateRunId();
    const startTime = Date.now();

    try {
      const command = this.buildCommand(options);
      const testProcess = spawn(command.cmd, command.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      const testRun = {
        process,
        startTime,
        options,
        output: [] as string[],
        status: {
          runId,
          framework: options.framework,
          status: 'running' as const,
          startTime,
          progress: 0,
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0
        }
      };

      this.runningTests.set(runId, testRun);

      this.setupProcessHandlers(runId, testProcess, testRun);
      this.broadcastTestStatus(runId, testRun.status);

      return runId;

    } catch (error) {
      throw new Error(`Failed to start tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop running tests
   */
  stopTests(runId: string): boolean {
    const testRun = this.runningTests.get(runId);
    if (!testRun) {
      return false;
    }

    try {
      // Check if process has a valid PID before killing
      if (testRun.process && 
          testRun.process.pid && 
          typeof testRun.process.pid === 'number' && 
          !isNaN(testRun.process.pid) && 
          testRun.process.pid > 0) {
        testRun.process.kill();
      }
      testRun.status.status = 'stopped';
      testRun.status.endTime = Date.now();
      testRun.status.duration = testRun.status.endTime - testRun.status.startTime;

      this.broadcastTestStatus(runId, testRun.status);
      this.runningTests.delete(runId);

      return true;
    } catch (error) {
      console.error(`Failed to stop tests ${runId}:`, error);
      return false;
    }
  }

  /**
   * Get current test status
   */
  getTestStatus(runId: string): TestStatus | null {
    const testRun = this.runningTests.get(runId);
    return testRun ? { ...testRun.status } : null;
  }

  /**
   * Get test results
   */
  getTestResults(runId: string): TestResults | null {
    const testRun = this.runningTests.get(runId);
    if (!testRun) {
      // Check cache for completed results
      const cached = this.getCachedResults('jest', ''); // Default values when testRun doesn't exist
      return cached?.results || null;
    }

    const output = testRun.output.join('\n');
    const parsedResults = this.parseTestOutput(testRun.options.framework, output);

    return {
      ...testRun.status,
      ...parsedResults,
      output
    };
  }

  /**
   * Get cached test results
   */
  getCachedResults(framework: string, testPath: string): CachedTestResult | undefined {
    const cacheKey = `${framework}:${testPath}`;
    return this.cache.get(cacheKey);
  }

  /**
   * Invalidate cache for specific tests
   */
  invalidateCache(framework: string, testPath: string): void {
    const cacheKey = `${framework}:${testPath}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Create test file watcher for auto-rerun
   */
  createTestWatcher(testPath: string): void {
    if (this.testWatchers.has(testPath)) {
      return;
    }

    try {
      // Try to use chokidar for better file watching
      const chokidar = require('chokidar');
      const watcher = chokidar.watch(testPath, {
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        persistent: true
      });

      watcher.on('change', () => {
        this.handleTestFileChange(testPath);
      });

      this.testWatchers.set(testPath, watcher);

    } catch {
      // Fallback to native fs.watch
      const fs = require('fs');
      const watcher = fs.watch(testPath, { recursive: true }, () => {
        this.handleTestFileChange(testPath);
      });

      this.testWatchers.set(testPath, watcher);
    }
  }

  /**
   * Stop test file watcher
   */
  stopTestWatcher(testPath: string): void {
    const watcher = this.testWatchers.get(testPath);
    if (watcher) {
      if (typeof watcher.close === 'function') {
        watcher.close();
      }
      this.testWatchers.delete(testPath);
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Stop all running tests
    this.runningTests.forEach((testRun, runId) => {
      try {
        this.stopTests(runId);
      } catch (error) {
        // Ignore cleanup errors
        console.warn(`Failed to stop test ${runId} during cleanup:`, error);
      }
    });

    // Stop all file watchers
    this.testWatchers.forEach((watcher) => {
      try {
        if (typeof watcher.close === 'function') {
          watcher.close();
        }
      } catch (error) {
        // Ignore cleanup errors
        console.warn('Failed to close watcher during cleanup:', error);
      }
    });

    // Clear caches
    this.cache.clear();
    this.testWatchers.clear();
  }

  /**
   * Generate unique run ID
   */
  private generateRunId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Build command for specified framework
   */
  private buildCommand(options: TestRunOptions): { cmd: string; args: string[] } {
    const { framework, testPath, options: frameworkOptions = {} } = options;

    switch (framework) {
      case 'jest':
        return {
          cmd: 'npm',
          args: [
            'test',
            '--',
            '--watchAll=false',
            ...(frameworkOptions.coverage ? ['--coverage'] : []),
            ...(frameworkOptions.timeout ? ['--testTimeout', frameworkOptions.timeout.toString()] : []),
            testPath || '**/*.test.{js,jsx,ts,tsx}'
          ]
        };

      case 'vitest':
        return {
          cmd: 'npx',
          args: [
            'vitest',
            frameworkOptions.run !== false ? 'run' : 'watch',
            ...(frameworkOptions.coverage ? ['--coverage'] : []),
            ...(frameworkOptions.timeout ? ['--timeout', frameworkOptions.timeout.toString()] : []),
            testPath || '**/*.test.{js,jsx,ts,tsx}'
          ]
        };

      case 'mocha':
        return {
          cmd: 'npx',
          args: [
            'mocha',
            testPath || 'test/**/*.test.{js,ts}',
            ...(frameworkOptions.timeout ? ['--timeout', frameworkOptions.timeout.toString()] : []),
            ...(frameworkOptions.parallel ? ['--parallel'] : [])
          ]
        };

      case 'playwright':
        return {
          cmd: 'npx',
          args: [
            'playwright',
            'test',
            testPath || '**/*.spec.{js,ts}',
            ...(frameworkOptions.parallel ? ['--workers', '4'] : [])
          ]
        };

      default:
        throw new Error(`Unsupported test framework: ${framework}`);
    }
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(runId: string, process: ChildProcess, testRun: any): void {
    let outputBuffer = '';

    process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      outputBuffer += output;
      testRun.output.push(output);

      // Parse progress from output
      const progress = this.parseProgress(testRun.options.framework, outputBuffer);
      if (progress) {
        testRun.status = { ...testRun.status, ...progress };
        this.broadcastTestStatus(runId, testRun.status);
      }

      // Broadcast progress events
      this.broadcastTestProgress(runId, output);
    });

    process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      testRun.output.push(output);
      
      this.broadcastTestProgress(runId, output, true);
    });

    process.on('close', (code: number | null) => {
      const endTime = Date.now();
      const duration = endTime - testRun.startTime;

      testRun.status.endTime = endTime;
      testRun.status.duration = duration;
      testRun.status.status = code === 0 ? 'completed' : 'failed';

      // Parse final results
      const fullOutput = testRun.output.join('\n');
      const parsedResults = this.parseTestOutput(testRun.options.framework, fullOutput);
      
      testRun.status = { ...testRun.status, ...parsedResults };

      // Cache results if enabled
      if (testRun.options.options?.cache) {
        this.cacheResults(testRun.options.framework, testRun.options.testPath || '', testRun.status as TestResults);
      }

      this.broadcastTestStatus(runId, testRun.status);
      
      // Clean up after delay
      setTimeout(() => {
        this.runningTests.delete(runId);
      }, 5000);
    });

    process.on('error', (error: Error) => {
      testRun.status.status = 'failed';
      testRun.status.error = error.message;
      testRun.status.endTime = Date.now();
      testRun.status.duration = testRun.status.endTime - testRun.startTime;

      this.broadcastTestStatus(runId, testRun.status);
    });
  }

  /**
   * Parse progress from test output
   */
  private parseProgress(framework: string, output: string): Partial<TestStatus> | null {
    const progress: Partial<TestStatus> = {};

    switch (framework) {
      case 'jest':
        const jestMatch = output.match(/(\d+) passed, (\d+) failed/);
        if (jestMatch) {
          progress.passed = parseInt(jestMatch[1]);
          progress.failed = parseInt(jestMatch[2]);
          progress.total = progress.passed + progress.failed;
          progress.progress = Math.round((progress.passed / progress.total) * 100);
        }
        break;

      case 'vitest':
        const vitestMatch = output.match(/✓ (\d+)|✗ (\d+)/g);
        if (vitestMatch) {
          const passed = (output.match(/✓/g) || []).length;
          const failed = (output.match(/✗/g) || []).length;
          progress.passed = passed;
          progress.failed = failed;
          progress.total = passed + failed;
          progress.progress = progress.total > 0 ? Math.round((passed / progress.total) * 100) : 0;
        }
        break;

      case 'mocha':
        const mochaMatch = output.match(/(\d+) passing.*?(\d+) failing/);
        if (mochaMatch) {
          progress.passed = parseInt(mochaMatch[1]);
          progress.failed = parseInt(mochaMatch[2]);
          progress.total = progress.passed + progress.failed;
          progress.progress = Math.round((progress.passed / progress.total) * 100);
        }
        break;

      case 'playwright':
        const playwrightMatch = output.match(/(\d+) passed.*?(\d+) failed/);
        if (playwrightMatch) {
          progress.passed = parseInt(playwrightMatch[1]);
          progress.failed = parseInt(playwrightMatch[2]);
          progress.total = progress.passed + progress.failed;
          progress.progress = Math.round((progress.passed / progress.total) * 100);
        }
        break;
    }

    return Object.keys(progress).length > 0 ? progress : null;
  }

  /**
   * Parse final test results
   */
  private parseTestOutput(framework: string, output: string): Partial<TestResults> {
    const results: Partial<TestResults> = {};

    switch (framework) {
      case 'jest':
        const jestTotal = output.match(/Tests:\s+(\d+)\s+total/);
        const jestPassed = output.match(/Tests:\s+(\d+)\s+passed/);
        const jestFailed = output.match(/Tests:\s+(\d+)\s+failed/);
        const jestSkipped = output.match(/Tests:\s+(\d+)\s+skipped/);
        const jestCoverage = output.match(/All files\s+\|\s+([\d.]+)/);

        if (jestTotal) results.total = parseInt(jestTotal[1]);
        if (jestPassed) results.passed = parseInt(jestPassed[1]);
        if (jestFailed) results.failed = parseInt(jestFailed[1]);
        if (jestSkipped) results.skipped = parseInt(jestSkipped[1]);
        if (jestCoverage) {
          results.coverage = {
            lines: parseFloat(jestCoverage[1]),
            functions: parseFloat(jestCoverage[1]),
            branches: parseFloat(jestCoverage[1]),
            statements: parseFloat(jestCoverage[1])
          };
        }
        break;

      case 'vitest':
        const vitestPassed = (output.match(/✓/g) || []).length;
        const vitestFailed = (output.match(/✗/g) || []).length;
        
        results.passed = vitestPassed;
        results.failed = vitestFailed;
        results.total = vitestPassed + vitestFailed;
        results.progress = results.total > 0 ? Math.round((vitestPassed / results.total) * 100) : 0;
        break;

      case 'mocha':
        const mochaTotal = output.match(/(\d+)\s+total/);
        const mochaPassing = output.match(/(\d+)\s+passing/);
        const mochaFailing = output.match(/(\d+)\s+failing/);
        const mochaPending = output.match(/(\d+)\s+pending/);

        if (mochaTotal) results.total = parseInt(mochaTotal[1]);
        if (mochaPassing) results.passed = parseInt(mochaPassing[1]);
        if (mochaFailing) results.failed = parseInt(mochaFailing[1]);
        if (mochaPending) results.skipped = parseInt(mochaPending[1]);
        break;

      case 'playwright':
        const playwrightPassed = output.match(/(\d+)\s+passed/);
        const playwrightFailed = output.match(/(\d+)\s+failed/);
        const playwrightSkipped = output.match(/(\d+)\s+skipped/);

        if (playwrightPassed) results.passed = parseInt(playwrightPassed[1]);
        if (playwrightFailed) results.failed = parseInt(playwrightFailed[1]);
        if (playwrightSkipped) results.skipped = parseInt(playwrightSkipped[1]);
        results.total = (results.passed || 0) + (results.failed || 0) + (results.skipped || 0);
        break;
    }

    return results;
  }

  /**
   * Cache test results
   */
  private async cacheResults(framework: string, testPath: string, results: TestResults): Promise<void> {
    try {
      const cacheKey = `${framework}:${testPath}`;
      
      // Generate file hash for cache invalidation
      const fileHash = await this.generateFileHash(testPath);
      
      this.cache.set(cacheKey, {
        results,
        timestamp: Date.now(),
        fileHash
      });

      // Clean old cache entries (older than 1 hour)
      const now = Date.now();
      this.cache.forEach((value, key) => {
        if (now - value.timestamp > 60 * 60 * 1000) {
          this.cache.delete(key);
        }
      });

    } catch (error) {
      console.error('Failed to cache test results:', error);
    }
  }

  /**
   * Generate file hash for cache invalidation
   */
  private async generateFileHash(testPath: string): Promise<string> {
    try {
      const crypto = require('crypto');
      const hash = crypto.createHash('md5');
      
      // Hash all test files
      const files = await this.findTestFiles(testPath);
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        hash.update(content);
      }
      
      return hash.digest('hex');
    } catch {
      return Date.now().toString();
    }
  }

  /**
   * Find all test files matching pattern
   */
  private async findTestFiles(pattern: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const glob = require('glob');
      const matches = glob.sync(pattern, { cwd: process.cwd() });
      files.push(...matches);
    } catch {
      // Fallback to simple file matching
      const testExtensions = ['.test.js', '.test.ts', '.test.jsx', '.test.tsx', '.spec.js', '.spec.ts'];
      const walk = async (dir: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await walk(fullPath);
            } else if (testExtensions.some(ext => entry.name.endsWith(ext))) {
              files.push(fullPath);
            }
          }
        } catch {
          // Ignore directory access errors
        }
      };
      await walk(process.cwd());
    }
    return files;
  }

  /**
   * Handle test file changes for auto-rerun
   */
  private handleTestFileChange(testPath: string): void {
    // Invalidate cache
    this.invalidateCache('jest', testPath);
    this.invalidateCache('vitest', testPath);
    this.invalidateCache('mocha', testPath);
    this.invalidateCache('playwright', testPath);

    // Broadcast file change event
    this.websocket.broadcast({
      type: 'test_files_changed',
      data: {
        testPath,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Broadcast test status via WebSocket
   */
  private broadcastTestStatus(runId: string, status: TestStatus): void {
    this.websocket.broadcast({
      type: 'test_status',
      data: status
    });
  }

  /**
   * Broadcast test progress via WebSocket
   */
  private broadcastTestProgress(runId: string, output: string, isError = false): void {
    this.websocket.broadcast({
      type: 'test_progress',
      data: {
        runId,
        output: output.trim(),
        isError,
        timestamp: Date.now()
      }
    });
  }
}

// Singleton instance for global use
let globalTestRunner: TestRunner | null = null;

export function getTestRunner(websocket?: AgentWebSocket): TestRunner {
  if (!globalTestRunner) {
    if (!websocket) {
      throw new Error('WebSocket instance required for first-time initialization');
    }
    globalTestRunner = new TestRunner(websocket);
  }
  return globalTestRunner;
}

export function initTestRunner(websocket: AgentWebSocket): TestRunner {
  globalTestRunner = new TestRunner(websocket);
  return globalTestRunner;
}
