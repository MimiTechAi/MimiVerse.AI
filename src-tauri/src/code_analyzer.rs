// Code Analyzer - Static analysis for code suggestions
// Provides intelligent code insights without full LSP

use anyhow::Result;
use serde::{Deserialize, Serialize};

use crate::CodeSuggestion;

/// Lightweight code analyzer for quick suggestions
pub struct CodeAnalyzer {
    enabled_rules: Vec<AnalysisRule>,
}

#[derive(Clone, Debug)]
pub enum AnalysisRule {
    UnusedImports,
    MissingTypes,
    LongFunctions,
    ComplexConditions,
    DuplicateCode,
    SecurityPatterns,
    PerformanceHints,
}

impl CodeAnalyzer {
    pub fn new() -> Self {
        Self {
            enabled_rules: vec![
                AnalysisRule::UnusedImports,
                AnalysisRule::MissingTypes,
                AnalysisRule::LongFunctions,
                AnalysisRule::SecurityPatterns,
                AnalysisRule::PerformanceHints,
            ],
        }
    }

    /// Analyze code content and return suggestions
    pub fn analyze(&self, file_path: &str, content: &str) -> Result<Vec<CodeSuggestion>> {
        let mut suggestions = Vec::new();

        let extension = file_path
            .split('.')
            .last()
            .unwrap_or("");

        match extension {
            "ts" | "tsx" | "js" | "jsx" => {
                suggestions.extend(self.analyze_typescript(content)?);
            }
            "rs" => {
                suggestions.extend(self.analyze_rust(content)?);
            }
            "py" => {
                suggestions.extend(self.analyze_python(content)?);
            }
            _ => {}
        }

        Ok(suggestions)
    }

    /// Analyze TypeScript/JavaScript code
    fn analyze_typescript(&self, content: &str) -> Result<Vec<CodeSuggestion>> {
        let mut suggestions = Vec::new();
        let lines: Vec<&str> = content.lines().collect();

        for (i, line) in lines.iter().enumerate() {
            let line_num = i + 1;
            let trimmed = line.trim();

            // Check for `any` type usage
            if trimmed.contains(": any") || trimmed.contains("<any>") {
                suggestions.push(CodeSuggestion {
                    kind: "type".to_string(),
                    message: "Avoid using 'any' type - use proper typing for better type safety".to_string(),
                    line: line_num,
                    column: line.find("any").unwrap_or(0),
                    severity: "warning".to_string(),
                    fix: None,
                });
            }

            // Check for console.log in production code
            if trimmed.contains("console.log") && !file_path_contains(trimmed, "test") {
                suggestions.push(CodeSuggestion {
                    kind: "quality".to_string(),
                    message: "Remove console.log before production".to_string(),
                    line: line_num,
                    column: line.find("console").unwrap_or(0),
                    severity: "info".to_string(),
                    fix: Some("// Remove this line".to_string()),
                });
            }

            // Check for == instead of ===
            if trimmed.contains(" == ") && !trimmed.contains(" === ") {
                suggestions.push(CodeSuggestion {
                    kind: "quality".to_string(),
                    message: "Use === instead of == for strict equality".to_string(),
                    line: line_num,
                    column: line.find(" == ").unwrap_or(0),
                    severity: "warning".to_string(),
                    fix: Some("===".to_string()),
                });
            }

            // Check for potential security issues
            if trimmed.contains("eval(") {
                suggestions.push(CodeSuggestion {
                    kind: "security".to_string(),
                    message: "Avoid using eval() - it can execute arbitrary code".to_string(),
                    line: line_num,
                    column: line.find("eval").unwrap_or(0),
                    severity: "error".to_string(),
                    fix: None,
                });
            }

            // Check for innerHTML security risk
            if trimmed.contains("innerHTML") {
                suggestions.push(CodeSuggestion {
                    kind: "security".to_string(),
                    message: "innerHTML can cause XSS vulnerabilities - use textContent or sanitize input".to_string(),
                    line: line_num,
                    column: line.find("innerHTML").unwrap_or(0),
                    severity: "warning".to_string(),
                    fix: None,
                });
            }

            // Check for long lines
            if line.len() > 120 {
                suggestions.push(CodeSuggestion {
                    kind: "style".to_string(),
                    message: format!("Line exceeds 120 characters ({} chars)", line.len()),
                    line: line_num,
                    column: 120,
                    severity: "info".to_string(),
                    fix: None,
                });
            }
        }

        // Check for long functions
        let function_lengths = self.detect_function_lengths(content);
        for (name, start_line, length) in function_lengths {
            if length > 50 {
                suggestions.push(CodeSuggestion {
                    kind: "complexity".to_string(),
                    message: format!("Function '{}' is {} lines long - consider refactoring", name, length),
                    line: start_line,
                    column: 0,
                    severity: "info".to_string(),
                    fix: None,
                });
            }
        }

        Ok(suggestions)
    }

    /// Analyze Rust code
    fn analyze_rust(&self, content: &str) -> Result<Vec<CodeSuggestion>> {
        let mut suggestions = Vec::new();
        let lines: Vec<&str> = content.lines().collect();

        for (i, line) in lines.iter().enumerate() {
            let line_num = i + 1;
            let trimmed = line.trim();

            // Check for unwrap() usage
            if trimmed.contains(".unwrap()") {
                suggestions.push(CodeSuggestion {
                    kind: "quality".to_string(),
                    message: "Consider using ? operator or proper error handling instead of unwrap()".to_string(),
                    line: line_num,
                    column: line.find("unwrap").unwrap_or(0),
                    severity: "warning".to_string(),
                    fix: None,
                });
            }

            // Check for panic!
            if trimmed.contains("panic!") && !trimmed.starts_with("//") {
                suggestions.push(CodeSuggestion {
                    kind: "quality".to_string(),
                    message: "Consider returning Result instead of using panic!".to_string(),
                    line: line_num,
                    column: line.find("panic").unwrap_or(0),
                    severity: "warning".to_string(),
                    fix: None,
                });
            }

            // Check for unsafe blocks
            if trimmed.starts_with("unsafe") {
                suggestions.push(CodeSuggestion {
                    kind: "security".to_string(),
                    message: "Unsafe block detected - ensure memory safety is maintained".to_string(),
                    line: line_num,
                    column: 0,
                    severity: "info".to_string(),
                    fix: None,
                });
            }
        }

        Ok(suggestions)
    }

    /// Analyze Python code
    fn analyze_python(&self, content: &str) -> Result<Vec<CodeSuggestion>> {
        let mut suggestions = Vec::new();
        let lines: Vec<&str> = content.lines().collect();

        for (i, line) in lines.iter().enumerate() {
            let line_num = i + 1;
            let trimmed = line.trim();

            // Check for bare except
            if trimmed == "except:" || trimmed.starts_with("except:") {
                suggestions.push(CodeSuggestion {
                    kind: "quality".to_string(),
                    message: "Avoid bare 'except:' - catch specific exceptions".to_string(),
                    line: line_num,
                    column: 0,
                    severity: "warning".to_string(),
                    fix: Some("except Exception as e:".to_string()),
                });
            }

            // Check for exec/eval
            if trimmed.contains("exec(") || trimmed.contains("eval(") {
                suggestions.push(CodeSuggestion {
                    kind: "security".to_string(),
                    message: "Avoid exec/eval - they can execute arbitrary code".to_string(),
                    line: line_num,
                    column: line.find("exec").or(line.find("eval")).unwrap_or(0),
                    severity: "error".to_string(),
                    fix: None,
                });
            }
        }

        Ok(suggestions)
    }

    /// Detect function lengths (simplified)
    fn detect_function_lengths(&self, content: &str) -> Vec<(String, usize, usize)> {
        let mut results = Vec::new();
        let lines: Vec<&str> = content.lines().collect();
        
        let mut in_function = false;
        let mut function_name = String::new();
        let mut function_start = 0;
        let mut brace_count = 0;

        for (i, line) in lines.iter().enumerate() {
            let trimmed = line.trim();

            // Detect function start (simplified)
            if (trimmed.starts_with("function ") || 
                trimmed.starts_with("async function ") ||
                trimmed.contains("= function") ||
                trimmed.contains("=> {") ||
                (trimmed.contains("(") && trimmed.contains(") {") && !trimmed.starts_with("//")))
                && !in_function
            {
                in_function = true;
                function_start = i + 1;
                
                // Extract name (simplified)
                if let Some(start) = trimmed.find("function ") {
                    let rest = &trimmed[start + 9..];
                    function_name = rest
                        .chars()
                        .take_while(|c| c.is_alphanumeric() || *c == '_')
                        .collect();
                } else {
                    function_name = format!("anonymous@{}", i + 1);
                }
            }

            // Count braces
            for c in line.chars() {
                if c == '{' {
                    brace_count += 1;
                } else if c == '}' {
                    brace_count -= 1;
                    if brace_count == 0 && in_function {
                        let length = i + 1 - function_start;
                        results.push((function_name.clone(), function_start, length));
                        in_function = false;
                    }
                }
            }
        }

        results
    }
}

fn file_path_contains(content: &str, pattern: &str) -> bool {
    content.to_lowercase().contains(pattern)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyzer_new() {
        let analyzer = CodeAnalyzer::new();
        assert!(!analyzer.enabled_rules.is_empty());
    }

    #[test]
    fn test_analyze_any_type() {
        let analyzer = CodeAnalyzer::new();
        let code = "const x: any = 5;";
        let suggestions = analyzer.analyze("test.ts", code).unwrap();
        assert!(suggestions.iter().any(|s| s.message.contains("any")));
    }
}
