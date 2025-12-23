import { generateCompletion } from '../utils/ollama';

export interface AutoFixResult {
  success: boolean;
  explanation: string;
  suggestedCommand?: string;
  suggestedCodeFix?: {
    file: string;
    description: string;
    code: string;
  };
  confidence: number; // 0-100
}

/**
 * AI-powered terminal error analyzer and fix suggester
 */
export class AutoFixer {
  /**
   * Analyze terminal error output and suggest fixes
   */
  async analyzeAndFix(
    errorOutput: string,
    context?: {
      filePath?: string;
      recentCommands?: string[];
      workingDirectory?: string;
    }
  ): Promise<AutoFixResult> {
    // Extract error patterns
    const patterns = this.extractErrorPatterns(errorOutput);

    // Build context for AI
    const contextStr = context
      ? `Working Directory: ${context.workingDirectory || "unknown"}
Recent Commands: ${context.recentCommands?.join(", ") || "none"}
Current File: ${context.filePath || "none"}`
      : "";

    const prompt = `You are an expert software debugging assistant. Analyze this terminal error and suggest a fix.

${contextStr}

Terminal Output:
\`\`\`
${errorOutput.slice(-2000)} 
\`\`\`

Detected Error Patterns:
${patterns.join(", ") || "Unknown error"}

Provide a JSON response with this structure:
{
  "explanation": "Brief explanation of what went wrong",
  "suggestedCommand": "Command to run to fix (if applicable)",
  "suggestedCodeFix": {
    "file": "path/to/file.ts",
    "description": "What to change",
    "code": "Corrected code snippet"
  },
  "confidence": 85
}

IMPORTANT:
1. If it's a missing dependency, suggest npm/yarn install command
2. If it's a syntax error, suggest the code fix
3. If it's a configuration issue, suggest the config change
4. Return ONLY valid JSON, no markdown or explanations outside the JSON

Return the JSON now:`;

    try {
      const response = await generateCompletion("Auto-Fix Error", prompt);

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.fallbackFix(errorOutput, patterns);
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        explanation: result.explanation || "Error detected",
        suggestedCommand: result.suggestedCommand,
        suggestedCodeFix: result.suggestedCodeFix,
        confidence: result.confidence || 50,
      };
    } catch (error) {
      console.error("Auto-fix AI error:", error);
      return this.fallbackFix(errorOutput, patterns);
    }
  }

  /**
   * Extract common error patterns from output
   */
  private extractErrorPatterns(output: string): string[] {
    const patterns: string[] = [];

    // Common error patterns
    const checks = [
      { regex: /Cannot find module ['"](.+?)['"]/i, label: "Missing Module" },
      { regex: /SyntaxError:/i, label: "Syntax Error" },
      { regex: /TypeError:/i, label: "Type Error" },
      { regex: /ReferenceError:/i, label: "Reference Error" },
      { regex: /ENOENT/i, label: "File Not Found" },
      { regex: /EADDRINUSE/i, label: "Port Already in Use" },
      { regex: /npm ERR!/i, label: "NPM Error" },
      { regex: /error TS\d+:/i, label: "TypeScript Error" },
      { regex: /\[vite\]/i, label: "Vite Build Error" },
      { regex: /Failed to compile/i, label: "Compilation Failed" },
    ];

    for (const check of checks) {
      if (check.regex.test(output)) {
        patterns.push(check.label);
      }
    }

    return patterns;
  }

  /**
   * Fallback fix using pattern matching (when AI fails)
   */
  private fallbackFix(output: string, patterns: string[]): AutoFixResult {
    // Check for missing module
    const moduleMatch = output.match(/Cannot find module ['"](.+?)['"]/i);
    if (moduleMatch) {
      const moduleName = moduleMatch[1];
      return {
        success: true,
        explanation: `Missing dependency: ${moduleName}`,
        suggestedCommand: `npm install ${moduleName}`,
        confidence: 80,
      };
    }

    // Check for port in use
    if (output.includes("EADDRINUSE")) {
      const portMatch = output.match(/:\d+/);
      const port = portMatch ? portMatch[0].slice(1) : "unknown";
      return {
        success: true,
        explanation: `Port ${port} is already in use`,
        suggestedCommand: `lsof -ti:${port} | xargs kill -9`,
        confidence: 75,
      };
    }

    // Generic fallback
    return {
      success: false,
      explanation: "Unable to auto-fix this error. Please review the output manually.",
      confidence: 20,
    };
  }
}
