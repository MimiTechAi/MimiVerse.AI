// File Indexer - Fast parallel file indexing for workspace search
// Optimized for large codebases using Rayon

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::fs;
use anyhow::Result;
use rayon::prelude::*;
use walkdir::WalkDir;
use sha2::{Sha256, Digest};

use crate::FileMatch;

/// File index for fast workspace search
pub struct FileIndex {
    /// Map from file path to file info
    files: HashMap<String, FileInfo>,
    /// Inverted index for content search
    content_index: HashMap<String, Vec<String>>,
    /// Total lines of code
    total_lines: usize,
}

#[derive(Clone, Debug)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub lines: usize,
    pub hash: String,
    pub language: String,
}

impl FileIndex {
    pub fn new() -> Self {
        Self {
            files: HashMap::new(),
            content_index: HashMap::new(),
            total_lines: 0,
        }
    }

    /// Index all files in directory
    pub fn index_directory(&mut self, dir: &Path) -> Result<()> {
        log::info!("Indexing directory: {:?}", dir);

        // Collect files
        let files: Vec<PathBuf> = WalkDir::new(dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.file_type().is_file()
                    && !e.path().to_string_lossy().contains("node_modules")
                    && !e.path().to_string_lossy().contains(".git")
                    && !e.path().to_string_lossy().contains("target")
            })
            .map(|e| e.path().to_path_buf())
            .collect();

        log::info!("Found {} files to index", files.len());

        // Index files in parallel
        let indexed: Vec<FileInfo> = files
            .par_iter()
            .filter_map(|path| self.index_file(path).ok())
            .collect();

        // Store in index
        self.total_lines = 0;
        for info in indexed {
            self.total_lines += info.lines;
            
            // Build content index (words -> files)
            let words = self.extract_words(&info.name);
            for word in words {
                self.content_index
                    .entry(word.to_lowercase())
                    .or_insert_with(Vec::new)
                    .push(info.path.clone());
            }

            self.files.insert(info.path.clone(), info);
        }

        log::info!(
            "Indexed {} files, {} lines total",
            self.files.len(),
            self.total_lines
        );

        Ok(())
    }

    /// Index a single file
    fn index_file(&self, path: &Path) -> Result<FileInfo> {
        let metadata = fs::metadata(path)?;
        let content = fs::read_to_string(path).unwrap_or_default();
        
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let extension = path
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();

        let language = self.detect_language(&extension);
        let lines = content.lines().count();
        
        // Compute hash for change detection
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        let hash = hex::encode(hasher.finalize());

        Ok(FileInfo {
            path: path.to_string_lossy().to_string(),
            name,
            extension,
            size: metadata.len(),
            lines,
            hash,
            language,
        })
    }

    /// Detect language from extension
    fn detect_language(&self, ext: &str) -> String {
        match ext {
            "ts" | "tsx" => "TypeScript".to_string(),
            "js" | "jsx" => "JavaScript".to_string(),
            "rs" => "Rust".to_string(),
            "py" => "Python".to_string(),
            "go" => "Go".to_string(),
            "java" => "Java".to_string(),
            "c" | "h" => "C".to_string(),
            "cpp" | "cc" | "hpp" => "C++".to_string(),
            "css" | "scss" | "less" => "CSS".to_string(),
            "html" | "htm" => "HTML".to_string(),
            "json" => "JSON".to_string(),
            "yaml" | "yml" => "YAML".to_string(),
            "md" => "Markdown".to_string(),
            "sql" => "SQL".to_string(),
            "sh" | "bash" => "Shell".to_string(),
            _ => "Other".to_string(),
        }
    }

    /// Extract searchable words from text
    fn extract_words(&self, text: &str) -> Vec<String> {
        text.split(|c: char| !c.is_alphanumeric() && c != '_')
            .filter(|w| w.len() >= 2)
            .map(|w| w.to_string())
            .collect()
    }

    /// Fuzzy search files
    pub fn search(&self, query: &str) -> Vec<FileMatch> {
        let query_lower = query.to_lowercase();
        let query_words: Vec<&str> = query_lower.split_whitespace().collect();

        let mut results: Vec<FileMatch> = self
            .files
            .values()
            .filter_map(|info| {
                let name_lower = info.name.to_lowercase();
                let path_lower = info.path.to_lowercase();

                // Calculate match score
                let mut score = 0.0;

                // Exact name match
                if name_lower == query_lower {
                    score += 100.0;
                }
                // Name contains query
                else if name_lower.contains(&query_lower) {
                    score += 50.0;
                }
                // Path contains query
                else if path_lower.contains(&query_lower) {
                    score += 25.0;
                }
                // Words match
                else {
                    for word in &query_words {
                        if name_lower.contains(word) {
                            score += 10.0;
                        }
                        if path_lower.contains(word) {
                            score += 5.0;
                        }
                    }
                }

                if score > 0.0 {
                    Some(FileMatch {
                        path: info.path.clone(),
                        name: info.name.clone(),
                        line: None,
                        snippet: None,
                        score: score as f32,
                    })
                } else {
                    None
                }
            })
            .collect();

        // Sort by score
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(50); // Limit results

        results
    }

    /// Get file count
    pub fn file_count(&self) -> usize {
        self.files.len()
    }

    /// Get total lines
    pub fn total_lines(&self) -> usize {
        self.total_lines
    }

    /// Get files by language
    pub fn files_by_language(&self) -> HashMap<String, usize> {
        let mut by_lang: HashMap<String, usize> = HashMap::new();
        for info in self.files.values() {
            *by_lang.entry(info.language.clone()).or_insert(0) += 1;
        }
        by_lang
    }

    /// Check if file has changed (by hash)
    pub fn has_changed(&self, path: &str, new_hash: &str) -> bool {
        self.files
            .get(path)
            .map(|info| info.hash != new_hash)
            .unwrap_or(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_index_new() {
        let index = FileIndex::new();
        assert_eq!(index.file_count(), 0);
    }
}
