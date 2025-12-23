import { TerminalTool, CommandResult } from './terminal';
import { generateCompletion } from '../utils/ollama';
import fs from 'fs/promises';
import path from 'path';

export type TestFramework = 'jest' | 'vitest' | 'mocha' | 'unknown';

export interface TestResult {
    name: string;
    file: string;
    status: 'passed' | 'failed' | 'skipped';
    duration?: number;
    error?: string;
    stack?: string;
}

export interface FixSuggestion {
    diagnosis: string;
    fix: string;
    filePath: string;
    confidence: number;
}

export interface FixReport {
    fixedCount: number;
    stillFailing: number;
    details: TestResult[];
    suggestions: FixSuggestion[];
}

/**
 * Test Runner Tool - Autonomous test execution and fixing
 */
export class TestRunnerTool {
    private terminal: TerminalTool;

    constructor(private workspaceRoot: string = process.cwd()) {
        this.terminal = new TerminalTool(workspaceRoot);
    }

    /**
     * Run tests with optional pattern filter
     */
    async runTests(pattern?: string): Promise<TestResult[]> {
        console.log('[TestRunner] Detecting test framework...');
        const framework = await this.detectTestFramework();

        if (framework === 'unknown') {
            throw new Error('No test framework detected. Install jest, vitest, or mocha.');
        }

        console.log(`[TestRunner] Using ${framework}`);
        const command = this.getTestCommand(framework, pattern);

        console.log(`[TestRunner] Running: ${command}`);
        const result = await this.terminal.execute(command);

        // Parse results even if command "failed" (tests might have failed)
        return this.parseTestResults(result.output, framework);
    }

    /**
     * Detect which test framework is installed
     */
    private async detectTestFramework(): Promise<TestFramework> {
        try {
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            const content = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(content);

            const deps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
            };

            if (deps.jest || deps['@types/jest']) return 'jest';
            if (deps.vitest) return 'vitest';
            if (deps.mocha) return 'mocha';

            return 'unknown';
        } catch (error) {
            console.error('[TestRunner] Error reading package.json:', error);
            return 'unknown';
        }
    }

    /**
     * Get command to run tests for specific framework
     */
    private getTestCommand(framework: TestFramework, pattern?: string): string {
        const commands = {
            jest: pattern
                ? `npm test -- --testPathPattern="${pattern}"`
                : 'npm test -- --no-coverage --passWithNoTests',
            vitest: pattern
                ? `npx vitest run ${pattern}`
                : 'npx vitest run',
            mocha: pattern
                ? `npx mocha ${pattern}`
                : 'npx mocha "test/**/*.test.{js,ts}"',
            unknown: 'echo "No test framework found"'
        };

        return commands[framework];
    }

    /**
     * Parse test output into structured results
     */
    private parseTestResults(output: string, framework: TestFramework): TestResult[] {
        console.log('[TestRunner] Parsing test output...');

        switch (framework) {
            case 'jest':
                return this.parseJestOutput(output);
            case 'vitest':
                return this.parseVitestOutput(output);
            case 'mocha':
                return this.parseMochaOutput(output);
            default:
                return [];
        }
    }

    /**
     * Parse Jest test output
     */
    private parseJestOutput(output: string): TestResult[] {
        const results: TestResult[] = [];
        const lines = output.split('\n');

        // Look for test results in format: PASS/FAIL path/to/test.test.ts
        const testFileRegex = /^\s*(PASS|FAIL)\s+(.+\.test\.(ts|js|tsx|jsx))/;
        // Look for individual test results
        const testCaseRegex = /^\s*[✓✗×]\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/;
        const errorRegex = /^\s+●\s+(.+)$/;

        let currentFile = '';
        let currentError = '';

        for (const line of lines) {
            const fileMatch = line.match(testFileRegex);
            if (fileMatch) {
                currentFile = fileMatch[2];
                continue;
            }

            const testMatch = line.match(testCaseRegex);
            if (testMatch && currentFile) {
                const passed = line.includes('✓');
                results.push({
                    name: testMatch[1].trim(),
                    file: currentFile,
                    status: passed ? 'passed' : 'failed',
                    duration: testMatch[2] ? parseInt(testMatch[2]) : undefined,
                    error: passed ? undefined : currentError
                });
                currentError = '';
            }

            const errorMatch = line.match(errorRegex);
            if (errorMatch) {
                currentError += errorMatch[1] + '\n';
            }
        }

        console.log(`[TestRunner] Parsed ${results.length} test results`);
        return results;
    }

    /**
     * Parse Vitest output
     */
    private parseVitestOutput(output: string): TestResult[] {
        const results: TestResult[] = [];
        const lines = output.split('\n');

        // Vitest format similar to Jest
        let currentFile = '';

        for (const line of lines) {
            if (line.includes('.test.') && (line.includes('PASS') || line.includes('FAIL'))) {
                const match = line.match(/(.+\.test\.(ts|js))/);
                if (match) currentFile = match[1];
            }

            if (line.includes('✓') || line.includes('×')) {
                const passed = line.includes('✓');
                const name = line.replace(/[✓×]\s+/, '').trim();

                results.push({
                    name,
                    file: currentFile || 'unknown',
                    status: passed ? 'passed' : 'failed'
                });
            }
        }

        return results;
    }

    /**
     * Parse Mocha output
     */
    private parseMochaOutput(output: string): TestResult[] {
        const results: TestResult[] = [];
        const lines = output.split('\n');

        let currentFile = '';

        for (const line of lines) {
            if (line.trim().startsWith('✓') || line.trim().startsWith('✗')) {
                const passed = line.includes('✓');
                const name = line.replace(/[✓✗]\s+/, '').trim();

                results.push({
                    name,
                    file: currentFile || 'unknown',
                    status: passed ? 'passed' : 'failed'
                });
            }
        }

        return results;
    }

    /**
     * Analyze test failures and suggest fixes
     */
    async analyzeFailures(failures: TestResult[]): Promise<FixSuggestion[]> {
        console.log(`[TestRunner] Analyzing ${failures.length} failures...`);
        const suggestions: FixSuggestion[] = [];

        for (const failure of failures) {
            try {
                // Read test file to understand context
                const fullPath = path.join(this.workspaceRoot, failure.file);
                const fileContent = await fs.readFile(fullPath, 'utf-8');

                const prompt = `You are a test debugging expert. Analyze this failing test and suggest a fix.

TEST NAME: ${failure.name}
FILE: ${failure.file}
ERROR MESSAGE: ${failure.error || 'Test failed (no error message)'}
${failure.stack ? `STACK TRACE: ${failure.stack}` : ''}

TEST FILE CONTENT (relevant snippet):
${fileContent.slice(0, 2000)}

Provide a detailed diagnosis and fix suggestion. Return ONLY valid JSON:
{
  "diagnosis": "Clear explanation of what's wrong",
  "fix": "Specific code changes needed",
  "filePath": "file that needs to be modified",
  "confidence": 0.0-1.0
}`;

                const response = await generateCompletion('Analyze test failure', prompt);

                try {
                    const jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const suggestion = JSON.parse(jsonMatch[0]);
                        suggestions.push(suggestion);
                    }
                } catch (parseError) {
                    console.error('[TestRunner] Failed to parse AI response', parseError);
                }

            } catch (error) {
                console.error(`[TestRunner] Error analyzing ${failure.file}:`, error);
            }
        }

        return suggestions;
    }

    /**
     * Automatically fix failing tests
     */
    async autoFix(failures: TestResult[]): Promise<FixReport> {
        console.log('[TestRunner] Attempting auto-fix...');

        // Get AI suggestions
        const suggestions = await this.analyzeFailures(failures);

        if (suggestions.length === 0) {
            return {
                fixedCount: 0,
                stillFailing: failures.length,
                details: failures,
                suggestions: []
            };
        }

        // Apply fixes using MultiFileAgent
        const { MultiFileAgent } = await import('../strategies/multi-file-agent');
        const agent = new MultiFileAgent();

        const fixDescription = suggestions
            .map(s => `${s.filePath}: ${s.diagnosis}`)
            .join('\n');

        console.log('[TestRunner] Creating fix plan...');
        const path = await import('path');
        const projectId = path.basename(this.workspaceRoot);
        const plan = await agent.planMultiFileEdit(
            `Fix these test failures:\n${fixDescription}`,
            this.workspaceRoot,
            projectId
        );

        console.log('[TestRunner] Applying fixes...');
        const result = await agent.executeMultiFileEdit(plan, this.workspaceRoot);

        if (!result.success) {
            console.error('[TestRunner] Failed to apply fixes:', result.error);
            return {
                fixedCount: 0,
                stillFailing: failures.length,
                details: failures,
                suggestions
            };
        }

        // Re-run tests to verify
        console.log('[TestRunner] Re-running tests to verify fixes...');
        const retestResults = await this.runTests();
        const stillFailing = retestResults.filter(r => r.status === 'failed');

        return {
            fixedCount: failures.length - stillFailing.length,
            stillFailing: stillFailing.length,
            details: retestResults,
            suggestions
        };
    }
}
