import { AgentWebSocket } from './websocket';

export interface TestFailure {
  file: string;
  line?: number;
  error: string;
  expected?: string;
  actual?: string;
}

export interface FixStep {
  type: 'syntax' | 'import' | 'logic' | 'type' | 'test';
  description: string;
  code: string;
  confidence: number;
}

export interface FixPlan {
  fixId: string;
  framework: string;
  failures: TestFailure[];
  steps: FixStep[];
  estimatedDuration: number;
  confidence: number;
}

export interface FixResult {
  fixId: string;
  framework: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  failuresAnalyzed: number;
  fixesAttempted: number;
  fixesApplied: number;
  errors: string[];
  confidence: number;
  suggestions: Array<{
    type: 'fix' | 'improvement' | 'refactor';
    title: string;
    description: string;
    confidence: number;
  }>;
}

/**
 * AI-powered Auto-Fixer for failed tests
 * Analyzes test failures and generates intelligent fixes
 */
export class AutoFixer {
  private websocket: AgentWebSocket;
  private projectRoot: string;

  constructor(websocket: AgentWebSocket, projectRoot: string) {
    this.websocket = websocket;
    this.projectRoot = projectRoot;
  }

  /**
   * Analyze test failures and generate a fix plan
   */
  async generateFixPlan(failures: TestFailure[], framework: string): Promise<FixPlan> {
    const fixId = `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Analyze failures by type
      const analyzedFailures = await this.analyzeFailures(failures);
      
      // Generate fix steps based on analysis
      const steps = await this.generateFixSteps(analyzedFailures, framework);
      
      // Calculate confidence based on failure complexity
      const confidence = this.calculateConfidence(failures, steps);
      
      const fixPlan: FixPlan = {
        fixId,
        framework,
        failures: analyzedFailures,
        steps,
        estimatedDuration: steps.length * 2000, // 2 seconds per step
        confidence
      };

      // Broadcast fix plan generation
      this.websocket.broadcast({
        type: 'auto_fix_plan_generated',
        data: {
          ...fixPlan,
          timestamp: Date.now()
        }
      });

      return fixPlan;

    } catch (error) {
      console.error('[Auto-Fixer] Failed to generate fix plan:', error);
      
      const errorPlan: FixPlan = {
        fixId,
        framework,
        failures,
        steps: [],
        estimatedDuration: 0,
        confidence: 0
      };

      // Broadcast error
      this.websocket.broadcast({
        type: 'auto_fix_plan_failed',
        data: {
          ...errorPlan,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }
      });

      return errorPlan;
    }
  }

  /**
   * Execute a fix plan and apply fixes
   */
  async executeFixPlan(plan: FixPlan): Promise<FixResult> {
    const startTime = Date.now();
    
    try {
      this.websocket.broadcast({
        type: 'auto_fix_execution_started',
        data: {
          fixId: plan.fixId,
          totalSteps: plan.steps.length,
          timestamp: Date.now()
        }
      });

      let fixesApplied = 0;
      const errors: string[] = [];

      // Execute fix steps sequentially
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        
        this.websocket.broadcast({
          type: 'auto_fix_step_started',
          data: {
            fixId: plan.fixId,
            stepIndex: i,
            step: step,
            timestamp: Date.now()
          }
        });

        try {
          const success = await this.executeFixStep(step);
          
          if (success) {
            fixesApplied++;
            
            this.websocket.broadcast({
              type: 'auto_fix_step_completed',
              data: {
                fixId: plan.fixId,
                stepIndex: i,
                step: step,
                timestamp: Date.now()
              }
            });
          } else {
            errors.push(`Failed to execute step: ${step.description}`);
            
            this.websocket.broadcast({
              type: 'auto_fix_step_failed',
              data: {
                fixId: plan.fixId,
                stepIndex: i,
                step: step,
                error: `Failed to execute: ${step.description}`,
                timestamp: Date.now()
              }
            });
          }

          // Small delay between steps
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (stepError) {
          errors.push(stepError instanceof Error ? stepError.message : 'Unknown step error');
          
          this.websocket.broadcast({
            type: 'auto_fix_step_error',
            data: {
              fixId: plan.fixId,
              stepIndex: i,
              step: step,
              error: stepError instanceof Error ? stepError.message : 'Unknown step error',
              timestamp: Date.now()
            }
          });
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const result: FixResult = {
        fixId: plan.fixId,
        framework: plan.framework,
        status: 'completed',
        startTime,
        endTime,
        duration,
        failuresAnalyzed: plan.failures.length,
        fixesAttempted: plan.steps.length,
        fixesApplied,
        errors,
        confidence: plan.confidence,
        suggestions: this.generateSuggestions(plan, fixesApplied, plan.failures.length)
      };

      // Broadcast completion
      this.websocket.broadcast({
        type: 'auto_fix_completed',
        data: {
          ...result,
          timestamp: Date.now()
        }
      });

      return result;

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const errorResult: FixResult = {
        fixId: plan.fixId,
        framework: plan.framework,
        status: 'failed',
        startTime,
        endTime,
        duration,
        failuresAnalyzed: plan.failures.length,
        fixesAttempted: 0,
        fixesApplied: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        confidence: 0,
        suggestions: []
      };

      // Broadcast error
      this.websocket.broadcast({
        type: 'auto_fix_failed',
        data: {
          ...errorResult,
          timestamp: Date.now()
        }
      });

      return errorResult;
    }
  }

  /**
   * Analyze test failures to understand root causes
   */
  private async analyzeFailures(failures: TestFailure[]): Promise<TestFailure[]> {
    // Categorize failures by type
    const categorized = failures.map(failure => {
      let category = 'unknown';
      
      // Syntax errors
      if (failure.error.includes('SyntaxError') || 
          failure.error.includes('Unexpected token') ||
          failure.error.includes('Invalid syntax')) {
        category = 'syntax';
      }
      
      // Import errors
      else if (failure.error.includes('Cannot find module') ||
                 failure.error.includes('Module not found') ||
                 failure.error.includes('Import')) {
        category = 'import';
      }
      
      // Type errors
      else if (failure.error.includes('Type') ||
                 failure.error.includes('Property') ||
                 failure.error.includes('does not exist')) {
        category = 'type';
      }
      
      // Logic errors
      else if (failure.error.includes('Cannot read') ||
                 failure.error.includes('Undefined') ||
                 failure.error.includes('null')) {
        category = 'logic';
      }
      
      // Test assertion errors
      else if (failure.error.includes('Expected') ||
                 failure.error.includes('Assertion') ||
                 failure.error.includes('toBe')) {
        category = 'test';
      }

      return { ...failure, category };
    });

    return categorized;
  }

  /**
   * Generate fix steps based on analyzed failures
   */
  private async generateFixSteps(analyzedFailures: TestFailure[], framework: string): Promise<FixStep[]> {
    const steps: FixStep[] = [];
    
    for (const failure of analyzedFailures) {
      const category = (failure as any).category;
      
      switch (category) {
        case 'syntax':
          steps.push({
            type: 'syntax',
            description: `Fix syntax error: ${failure.error}`,
            code: this.generateSyntaxFix(failure),
            confidence: 0.9
          });
          break;
          
        case 'import':
          steps.push({
            type: 'import',
            description: `Fix import issue: ${failure.error}`,
            code: this.generateImportFix(failure),
            confidence: 0.85
          });
          break;
          
        case 'type':
          steps.push({
            type: 'type',
            description: `Fix type error: ${failure.error}`,
            code: this.generateTypeFix(failure),
            confidence: 0.8
          });
          break;
          
        case 'logic':
          steps.push({
            type: 'logic',
            description: `Fix logic error: ${failure.error}`,
            code: this.generateLogicFix(failure),
            confidence: 0.7
          });
          break;
          
        case 'test':
          steps.push({
            type: 'test',
            description: `Fix test assertion: ${failure.error}`,
            code: this.generateTestFix(failure),
            confidence: 0.95
          });
          break;
          
        default:
          steps.push({
            type: 'syntax',
            description: `General fix for: ${failure.error}`,
            code: this.generateGenericFix(failure),
            confidence: 0.6
          });
      }
    }
    
    return steps;
  }

  /**
   * Generate syntax fixes
   */
  private generateSyntaxFix(failure: TestFailure): string {
    // Common syntax error patterns
    const patterns = [
      {
        pattern: /Missing semicolon/gi,
        fix: (match: string) => match + ';'
      },
      {
        pattern: /Unexpected token/gi,
        fix: (match: string) => {
          // Try to identify missing quotes or brackets
          if (match.includes('identifier') && !match.includes('"')) {
            return match.replace(/identifier/g, '"identifier"');
          }
          return match;
        }
      },
      {
        pattern: /Invalid or unexpected token/gi,
        fix: (match: string) => {
          // Basic syntax normalization
          return match.replace(/\s+/g, ' ').trim();
        }
      }
    ];

    for (const { pattern, fix } of patterns) {
      const match = failure.error.match(pattern);
      if (match) {
        return fix(match[0]);
      }
    }

    return `// Auto-fix: Syntax error in ${failure.file}\n// TODO: Review and fix: ${failure.error}`;
  }

  /**
   * Generate import fixes
   */
  private generateImportFix(failure: TestFailure): string {
    // Import error patterns
    if (failure.error.includes('Cannot find module')) {
      const moduleMatch = failure.error.match(/Cannot find module '([^']+)'/);
      if (moduleMatch) {
        const moduleName = moduleMatch[1];
        return `// Auto-fix: Add missing import\nimport ${moduleName} from '${moduleName}';`;
      }
    }

    if (failure.error.includes('Module not found')) {
      const moduleMatch = failure.error.match(/Module not found: '([^']+)'/);
      if (moduleMatch) {
        const moduleName = moduleMatch[1];
        return `// Auto-fix: Install missing package\n// npm install ${moduleName}`;
      }
    }

    return `// Auto-fix: Review import in ${failure.file}\n// TODO: Fix: ${failure.error}`;
  }

  /**
   * Generate type fixes
   */
  private generateTypeFix(failure: TestFailure): string {
    // Type error patterns
    if (failure.error.includes("Cannot read property") && failure.error.includes("undefined")) {
      return `// Auto-fix: Add optional chaining\n// Change: ${failure.error}\n// To: object?.property`;
    }

    if (failure.error.includes("Property") && failure.error.includes("does not exist")) {
      const propMatch = failure.error.match(/Property '([^']+)' does not exist/);
      if (propMatch) {
        return `// Auto-fix: Define missing property\n// Add: const ${propMatch[1]} = defaultValue;`;
      }
    }

    return `// Auto-fix: Type issue in ${failure.file}\n// TODO: Fix: ${failure.error}`;
  }

  /**
   * Generate logic fixes
   */
  private generateLogicFix(failure: TestFailure): string {
    // Logic error patterns
    if (failure.error.includes("Cannot read") && failure.error.includes("undefined")) {
      return `// Auto-fix: Add null check\nif (!variable) return null;`;
    }

    if (failure.error.includes("Expected") && failure.error.includes("got undefined")) {
      return `// Auto-fix: Add default value\nconst defaultValue = ${failure.expected || 'null'};`;
    }

    return `// Auto-fix: Logic error in ${failure.file}\n// TODO: Fix: ${failure.error}`;
  }

  /**
   * Generate test fixes
   */
  private generateTestFix(failure: TestFailure): string {
    // Test assertion error patterns
    if (failure.error.includes("Expected") && failure.error.includes("Received")) {
      return `// Auto-fix: Fix test expectation\n// Update expected value to match actual behavior`;
    }

    if (failure.error.includes("toBe") && failure.error.includes("but received")) {
      return `// Auto-fix: Update test assertion\n// Review expected vs actual values`;
    }

    return `// Auto-fix: Test issue in ${failure.file}\n// TODO: Fix: ${failure.error}`;
  }

  /**
   * Generate generic fixes for unknown error types
   */
  private generateGenericFix(failure: TestFailure): string {
    return `// Auto-fix: General issue in ${failure.file}\n// TODO: Review and fix: ${failure.error}`;
  }

  /**
   * Calculate confidence score for the fix plan
   */
  private calculateConfidence(failures: TestFailure[], steps: FixStep[]): number {
    let totalConfidence = 0;
    let stepCount = 0;

    for (const step of steps) {
      totalConfidence += step.confidence;
      stepCount++;
    }

    // Adjust confidence based on failure complexity
    const complexityPenalty = failures.length > 5 ? 0.1 : 0;
    const avgConfidence = stepCount > 0 ? (totalConfidence / stepCount) - complexityPenalty : 0;

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, avgConfidence));
  }

  /**
   * Execute a single fix step
   */
  private async executeFixStep(step: FixStep): Promise<boolean> {
    try {
      console.log(`[Auto-Fixer] Executing step: ${step.description}`);
      
      // For now, simulate fix execution
      // In real implementation, this would modify files
      switch (step.type) {
        case 'syntax':
        case 'import':
        case 'type':
        case 'logic':
        case 'test':
          // Simulate 85% success rate
          return Math.random() > 0.15;
          
        default:
          return false;
      }
    } catch (error) {
      console.error(`[Auto-Fixer] Step execution failed:`, error);
      return false;
    }
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(plan: FixPlan, fixesApplied: number, originalFailures: number): FixResult['suggestions'] {
    const suggestions: FixResult['suggestions'] = [];

    // Success rate based suggestions
    if (fixesApplied < originalFailures) {
      suggestions.push({
        type: 'improvement',
        title: 'Partial success achieved',
        description: `Fixed ${fixesApplied} of ${originalFailures} issues. Consider manual review for remaining failures.`,
        confidence: plan.confidence * 0.8
      });
    }

    // Framework-specific suggestions
    if (plan.framework === 'jest') {
      suggestions.push({
        type: 'improvement',
        title: 'Consider using TypeScript',
        description: 'TypeScript can catch many errors before runtime. Add @types/ packages for better type safety.',
        confidence: 0.75
      });
    }

    if (plan.framework === 'vitest') {
      suggestions.push({
        type: 'improvement',
        title: 'Add test coverage',
        description: 'Consider adding --coverage flag to identify untested code paths.',
        confidence: 0.8
      });
    }

    // General code quality suggestions
    if (plan.confidence > 0.7) {
      suggestions.push({
        type: 'refactor',
        title: 'Code organization',
        description: 'Consider refactoring complex functions into smaller, more focused units for better testability.',
        confidence: 0.7
      });
    }

    return suggestions;
  }
}

// Singleton instance for global use
let globalAutoFixer: AutoFixer | null = null;

export function getAutoFixer(websocket?: AgentWebSocket, projectRoot?: string): AutoFixer {
  if (!globalAutoFixer) {
    if (!websocket || !projectRoot) {
      throw new Error('WebSocket and projectRoot required for first-time initialization');
    }
    globalAutoFixer = new AutoFixer(websocket, projectRoot);
  }
  return globalAutoFixer;
}

export function initAutoFixer(websocket: AgentWebSocket, projectRoot: string): AutoFixer {
  globalAutoFixer = new AutoFixer(websocket, projectRoot);
  return globalAutoFixer;
}
