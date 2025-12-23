// Cascade Engine - Dependency Graph Analysis
// Inspired by Windsurf's Cascade Engine for cross-file reasoning

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::fs;
use anyhow::Result;
use rayon::prelude::*;
use walkdir::WalkDir;

/// Code dependency graph for intelligent code analysis
pub struct CodeGraph {
    /// Map from file path to its dependencies (imports)
    dependencies: HashMap<String, HashSet<String>>,
    /// Map from file path to files that depend on it
    dependents: HashMap<String, HashSet<String>>,
    /// Symbol table for cross-file resolution
    symbols: HashMap<String, Vec<SymbolInfo>>,
}

#[derive(Clone, Debug)]
pub struct SymbolInfo {
    pub name: String,
    pub kind: SymbolKind,
    pub file: String,
    pub line: usize,
    pub exported: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub enum SymbolKind {
    Function,
    Class,
    Interface,
    Variable,
    Constant,
    Type,
    Module,
}

impl CodeGraph {
    pub fn new() -> Self {
        Self {
            dependencies: HashMap::new(),
            dependents: HashMap::new(),
            symbols: HashMap::new(),
        }
    }

    /// Analyze entire workspace and build dependency graph
    pub fn analyze_workspace(&mut self, workspace_path: &Path) -> Result<()> {
        log::info!("Analyzing workspace: {:?}", workspace_path);

        // Collect all TypeScript/JavaScript files
        let files: Vec<PathBuf> = WalkDir::new(workspace_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                let path = e.path();
                let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
                matches!(ext, "ts" | "tsx" | "js" | "jsx" | "rs" | "py")
                    && !path.to_string_lossy().contains("node_modules")
                    && !path.to_string_lossy().contains(".git")
            })
            .map(|e| e.path().to_path_buf())
            .collect();

        log::info!("Found {} source files to analyze", files.len());

        // Analyze files in parallel
        let results: Vec<(String, HashSet<String>, Vec<SymbolInfo>)> = files
            .par_iter()
            .filter_map(|path| {
                self.analyze_file(path).ok()
            })
            .collect();

        // Build graph from results
        for (file, deps, syms) in results {
            // Add dependencies
            self.dependencies.insert(file.clone(), deps.clone());

            // Add reverse dependencies (dependents)
            for dep in deps {
                self.dependents
                    .entry(dep)
                    .or_insert_with(HashSet::new)
                    .insert(file.clone());
            }

            // Add symbols
            for sym in syms {
                self.symbols
                    .entry(sym.name.clone())
                    .or_insert_with(Vec::new)
                    .push(sym);
            }
        }

        log::info!(
            "Built dependency graph: {} files, {} edges, {} symbols",
            self.dependencies.len(),
            self.edge_count(),
            self.symbols.len()
        );

        Ok(())
    }

    /// Analyze a single file for imports and exports
    fn analyze_file(&self, path: &Path) -> Result<(String, HashSet<String>, Vec<SymbolInfo>)> {
        let content = fs::read_to_string(path)?;
        let file_path = path.to_string_lossy().to_string();
        let mut deps = HashSet::new();
        let mut symbols = Vec::new();

        // Extract imports - TypeScript/JavaScript
        for line in content.lines() {
            let line = line.trim();

            // import { x } from 'module'
            if line.starts_with("import") {
                if let Some(from_idx) = line.find("from") {
                    let module = line[from_idx + 4..]
                        .trim()
                        .trim_matches(|c| c == '\'' || c == '"' || c == ';');
                    deps.insert(self.resolve_import(path, module));
                }
            }

            // require('module')
            if line.contains("require(") {
                if let Some(start) = line.find("require(") {
                    let rest = &line[start + 8..];
                    if let Some(end) = rest.find(')') {
                        let module = rest[..end]
                            .trim_matches(|c| c == '\'' || c == '"');
                        deps.insert(self.resolve_import(path, module));
                    }
                }
            }

            // Extract exports (simplified)
            if line.starts_with("export") {
                if line.contains("function") || line.contains("const") || line.contains("class") {
                    if let Some(name) = self.extract_export_name(line) {
                        let kind = if line.contains("function") {
                            SymbolKind::Function
                        } else if line.contains("class") {
                            SymbolKind::Class
                        } else {
                            SymbolKind::Variable
                        };

                        symbols.push(SymbolInfo {
                            name,
                            kind,
                            file: file_path.clone(),
                            line: 0, // Would need proper parsing
                            exported: true,
                        });
                    }
                }
            }
        }

        Ok((file_path, deps, symbols))
    }

    /// Resolve relative import to absolute path
    fn resolve_import(&self, from_file: &Path, import: &str) -> String {
        if import.starts_with('.') {
            // Relative import
            if let Some(parent) = from_file.parent() {
                let resolved = parent.join(import);
                // Try common extensions
                for ext in &["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"] {
                    let with_ext = format!("{}{}", resolved.to_string_lossy(), ext);
                    if PathBuf::from(&with_ext).exists() {
                        return with_ext;
                    }
                }
                return resolved.to_string_lossy().to_string();
            }
        }
        // Package import - return as-is
        import.to_string()
    }

    /// Extract export name from line
    fn extract_export_name(&self, line: &str) -> Option<String> {
        let keywords = ["function", "class", "const", "let", "var", "interface", "type"];
        
        for keyword in keywords {
            if let Some(idx) = line.find(keyword) {
                let rest = line[idx + keyword.len()..].trim();
                let name: String = rest
                    .chars()
                    .take_while(|c| c.is_alphanumeric() || *c == '_')
                    .collect();
                if !name.is_empty() {
                    return Some(name);
                }
            }
        }
        None
    }

    /// Get dependencies of a file
    pub fn get_dependencies(&self, file_path: &str) -> Vec<String> {
        self.dependencies
            .get(file_path)
            .map(|deps| deps.iter().cloned().collect())
            .unwrap_or_default()
    }

    /// Get files that depend on this file
    pub fn get_dependents(&self, file_path: &str) -> Vec<String> {
        self.dependents
            .get(file_path)
            .map(|deps| deps.iter().cloned().collect())
            .unwrap_or_default()
    }

    /// Get total edge count
    pub fn edge_count(&self) -> usize {
        self.dependencies.values().map(|v| v.len()).sum()
    }

    /// Find symbol across workspace
    pub fn find_symbol(&self, name: &str) -> Vec<&SymbolInfo> {
        self.symbols
            .get(name)
            .map(|syms| syms.iter().collect())
            .unwrap_or_default()
    }

    /// Get all files affected by changes to a file (transitive)
    pub fn get_impact_scope(&self, file_path: &str, max_depth: usize) -> HashSet<String> {
        let mut affected = HashSet::new();
        let mut to_process = vec![file_path.to_string()];
        let mut depth = 0;

        while !to_process.is_empty() && depth < max_depth {
            let mut next = Vec::new();

            for file in to_process {
                if affected.insert(file.clone()) {
                    if let Some(dependents) = self.dependents.get(&file) {
                        next.extend(dependents.iter().cloned());
                    }
                }
            }

            to_process = next;
            depth += 1;
        }

        affected
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_code_graph_new() {
        let graph = CodeGraph::new();
        assert_eq!(graph.edge_count(), 0);
    }
}
