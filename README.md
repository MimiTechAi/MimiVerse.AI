# Mimiverse IDE 🌌

<div align="center">

![Mimiverse Banner](https://mimiverse.ai/assets/hero-banner.png)

[![Release](https://img.shields.io/github/v/release/MimiTechAi/MimiVerse.AI?style=flat-square)](https://github.com/MimiTechAi/MimiVerse.AI/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/MimiTechAi/MimiVerse.AI/release.yml?branch=main&style=flat-square)](https://github.com/MimiTechAi/MimiVerse.AI/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg?style=flat-square)](https://github.com/MimiTechAi/MimiVerse.AI/releases)

**The First Native, Context-Aware AI IDE enabling Offline Intelligence.**

[Download Beta](https://github.com/MimiTechAi/MimiVerse.AI/releases) • [Website](https://mimiverse.ai) • [Documentation](https://docs.mimiverse.ai)

</div>

---

## 🚀 Overview

**Mimiverse** is not just another code editor; it's an **Autonomous Coding Environment** designed for the post-LLM era. Built on a hybrid architecture of **Electron**, **Rust**, and **TypeScript**, it bridges the gap between high-performance local editing and agentic AI orchestration.

Unlike cloud-only tools, Mimiverse offers a **True Offline Mode**, leveraging an embedded SQLite architecture and local vector search to give you full AI capabilities without leaving your machine (or your air-gapped network).

## ✨ Key Features

### 🧠 Mimi Engine (Rust)
Powered by a custom Rust backend, the Mimi Engine handles heavy lifting—file indexing, syntax analysis, and local search—at native speeds, keeping the UI silky smooth regardless of project size.

### 🔌 True Offline Capability
Work anywhere.
*   **Online**: Syncs with high-performance PostgreSQL & Cloud GPU clusters for massive model inference.
*   **Offline**: Seamlessly switches to local **SQLite** + **Better-SQLite3** storage. Your project history, vector embeddings, and chat context stay with you.

### 🤖 Agentic Context Window
Our proprietary **Token Budgeting System** intelligently manages context, ensuring the AI "remembers" what matters. It combines:
*   **Recent Files**
*   **Vector Semantic Search** (RAG)
*   **Active Tab Context**
*   **Terminal Output History**

### 📦 Cross-Platform Native
Built for everyone.
*   **macOS**: Universal Binary (Apple Silicon & Intel) `.dmg`
*   **Windows**: Native `.exe` installer via Squirrel
*   **Linux**: `.deb` and `.rpm` for Debian/RedHat distros

## 🛠️ Tech Stack

*   **Frontend**: React 19, TailwindCSS v4, Framer Motion, Radix UI
*   **Runtime**: Electron 29 (Process Isolation), Node.js 20+
*   **Performance Core**: Rust (Tauri-bridge ready)
*   **AI/Data**:
    *   **pgvector** (Production Vector Search)
    *   **SQLite** (Local Persistence)
    *   **Ollama Integration** (Local Inference)

## 📥 Installation

Grab the latest installer for your OS from the [Releases Page](https://github.com/MimiTechAi/MimiVerse.AI/releases).

### macOS
```bash
# Verify signature after download (Optional)
spctl -a -t exec -v /Applications/Mimiverse.app
```

### Windows
Download `Mimiverse-Setup-1.0.0.exe` and run the installer.

### Linux
```bash
# Debian/Ubuntu
sudo dpkg -i mimiverse_1.0.0_amd64.deb

# Fedora/RHEL
sudo rpm -i mimiverse-1.0.0.x86_64.rpm
```

## 🏗️ Building from Source

Prerequisites: Node.js 20+, Rust (Cargo), Git.

```bash
# 1. Clone the repository
git clone https://github.com/MimiTechAi/MimiVerse.AI.git
cd MimiVerse.AI

# 2. Install dependencies
npm install

# 3. Start Development Mode (Hot-Reload)
npm run dev

# 4. Build Production Artifacts
npm run electron:make
```

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and request features.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ by the Mimi Tech AI Team</p>
  <p><i>The Future of Coding is Autonomous.</i></p>
</div>
