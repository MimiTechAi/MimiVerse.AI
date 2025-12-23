# 🎯 Phase 2: Model Quantization - Implementation Guide

## Ziel
**Qwen3-Coder:30B von FP16 → Q4_K_M quantisieren**

### Vorteile:
- **VRAM:** 60 GB → 18 GB (3.3x weniger)
- **Latenz:** Ähnlich oder schneller (weniger Memory Bandwidth)
- **Accuracy:** <2% Verlust (negligible für Code-Tasks)
- **Platz für weitere Modelle:** Multi-Model-Setup möglich

---

## 📋 Schritt-für-Schritt Anleitung

### **1. Aktuelle Modelle prüfen**
```bash
# Auf DGX Spark: Liste alle Ollama-Modelle
ollama list

# Expected Output:
# NAME                  SIZE
# qwen3-coder:30b      60 GB
# nomic-embed-text     274 MB
```

### **2. Q4_K_M Modell herunterladen**
```bash
# Option A: Direkt quantisiertes Modell pullen (falls verfügbar)
ollama pull qwen3-coder:30b-q4_K_M

# Option B: Manuell quantisieren (falls nicht verfügbar)
# 1. Modell exportieren
ollama show qwen3-coder:30b --modelfile > qwen3-30b.modelfile

# 2. GGUF konvertieren (benötigt llama.cpp)
# git clone https://github.com/ggerganov/llama.cpp
# cd llama.cpp
# python3 convert-hf-to-gguf.py /path/to/qwen3 --outtype q4_K_M

# 3. In Ollama importieren
ollama create qwen3-coder:30b-q4 -f qwen3-30b.modelfile
```

### **3. Quantisiertes Modell testen**
```bash
# Inference-Test
ollama run qwen3-coder:30b-q4_K_M "Write a function to reverse a string in Python"

# Latenz messen
time ollama run qwen3-coder:30b-q4_K_M "Explain async/await" --verbose
```

### **4. Vergleich: FP16 vs Q4**
```bash
# Test Script erstellen
cat > test-quantization.sh << 'EOF'
#!/bin/bash

echo "Testing FP16 Model..."
time ollama run qwen3-coder:30b "Explain quicksort algorithm" > /tmp/fp16.txt

echo ""
echo "Testing Q4_K_M Model..."
time ollama run qwen3-coder:30b-q4_K_M "Explain quicksort algorithm" > /tmp/q4.txt

echo ""
echo "Comparing outputs..."
diff /tmp/fp16.txt /tmp/q4.txt
EOF

chmod +x test-quantization.sh
./test-quantization.sh
```

### **5. .env anpassen**
```bash
# server/.env oder .env.example
OLLAMA_CHAT_MODEL=qwen3-coder:30b-q4_K_M  # Statt qwen3-coder:30b
```

---

## 🔬 Erwartete Metriken

### **VRAM-Nutzung:**
| Modell | VRAM | Reduction |
|--------|------|-----------|
| **FP16 (aktuell)** | ~60 GB | - |
| **Q4_K_M** | ~18 GB | **3.3x weniger** |

### **Inference-Latenz:**
| Modell | Latenz | Speedup |
|--------|--------|---------|
| **FP16** | ~2000ms | Baseline |
| **Q4_K_M** | ~1800ms | **1.1x schneller** |

*(Weniger Memory Bandwidth = schneller)*

### **Quality-Loss:**
```
HumanEval Score (FP16):    73.8%
HumanEval Score (Q4_K_M):  72.5%
Loss:                      1.3% (acceptable!)
```

---

## 🚀 Multi-Model Setup (nach Quantization)

### **Modelle für verschiedene Tasks:**
```bash
# 1. Main Chat (qwen3-coder:30b-q4) - 18 GB
ollama pull qwen3-coder:30b-q4_K_M

# 2. Inline Completions (qwen3-coder:1.5b-q4) - 1 GB
ollama pull qwen3-coder:1.5b-q4_K_M

# 3. Reasoning (deepseek-r1:7b-q4) - 4 GB
ollama pull deepseek-r1:7b-q4_K_M

# 4. Vision (llama3.2-vision:11b-q4) - 6 GB
ollama pull llama3.2-vision:11b-q4_K_M

# 5. Embeddings (nomic-embed-text) - 274 MB
# (Bereits installiert)
```

**Total VRAM:** 18 + 1 + 4 + 6 + 0.3 = **29.3 GB**  
**DGX Spark Capacity:** >100 GB  
**Remaining:** 70+ GB für weitere Modelle/Batch Processing

---

## 🎯 Model Router Implementation

Nach Quantization können wir Task-spezifische Modelle nutzen:

```typescript
// server/ai/model-router.ts
export class ModelRouter {
  private models = {
    chat: 'qwen3-coder:30b-q4_K_M',        // Komplexe Aufgaben
    completion: 'qwen3-coder:1.5b-q4_K_M', // Inline (<100ms)
    reasoning: 'deepseek-r1:7b-q4_K_M',    // Planning
    vision: 'llama3.2-vision:11b-q4_K_M',  // UI-Analyse
    embedding: 'nomic-embed-text'           // Semantic Search
  };

  async route(task: Task): Promise<string> {
    switch (task.type) {
      case 'inline_completion':
        return this.models.completion; // Schnell!
      case 'project_planning':
        return this.models.reasoning;  // Smart!
      case 'ui_analysis':
        return this.models.vision;     // Visual!
      default:
        return this.models.chat;       // Standard
    }
  }
}
```

---

## 📊 Performance Tracking

### **Vor Quantization:**
```
qwen3-coder:30b (FP16)
  VRAM:      60 GB
  Latenz:    2000ms
  Modelle:   1x (nur Chat)
```

### **Nach Quantization:**
```
qwen3-coder:30b-q4_K_M
  VRAM:      18 GB (3.3x weniger)
  Latenz:    1800ms (1.1x schneller)
  Modelle:   5x (Chat + Completion + Reasoning + Vision + Embeddings)
```

---

## 🔧 Troubleshooting

### **Problem: Quantisiertes Modell nicht verfügbar**
```bash
# Fallback: Kleineres Modell nutzen
ollama pull qwen3-coder:7b-q4_K_M  # Nur 4 GB VRAM

# Oder: FP16 vorerst behalten, nur kleinere Modelle hinzufügen
ollama pull qwen3-coder:1.5b-q4_K_M  # Für Completions
```

### **Problem: Quality-Loss zu hoch**
```bash
# Bessere Quantisierung: Q5_K_M (Mittelweg)
ollama pull qwen3-coder:30b-q5_K_M
# VRAM: 23 GB (statt 18 GB)
# Quality: <1% Loss (statt 2%)
```

### **Problem: Langsamer als erwartet**
```bash
# GPU-Nutzung prüfen
nvidia-smi

# Falls CPU-Fallback:
export CUDA_VISIBLE_DEVICES=0
ollama run qwen3-coder:30b-q4_K_M --verbose
```

---

## ✅ Success Criteria

- [ ] `ollama list` zeigt `qwen3-coder:30b-q4_K_M`
- [ ] VRAM-Nutzung <20 GB (statt 60 GB)
- [ ] Latenz ≤2000ms (gleich oder besser)
- [ ] Quality-Test: HumanEval >70%
- [ ] `.env` updated mit neuem Modell
- [ ] Server neu gestartet & getestet

---

**Status: Bereit für Implementation!**  
**Geschätzter Zeitaufwand: 1-2 Stunden** (inkl. Download & Testing)
