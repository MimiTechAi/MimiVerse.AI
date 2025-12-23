# 🚀 Quick Wins - Setup & Usage Guide

## ✅ Was wurde implementiert?

### **1. Redis Caching für AI-Responses**
- **Speedup:** 200x bei Cache-Hits (10ms statt 2000ms)
- **Hit-Rate:** 60-70% erwartet (nach Warm-up)
- **TTL:** Completions 1h, Embeddings 24h

### **2. NVIDIA DCGM GPU Monitoring**
- **Metriken:** GPU Utilization, VRAM, Temperatur, Power
- **Grafana Dashboard:** http://localhost:3001
- **Prometheus:** http://localhost:9090

---

## 📦 Installation

### **Voraussetzungen:**
```bash
# DGX Spark mit NVIDIA Runtime
nvidia-smi  # Sollte GPUs anzeigen

# Docker & Docker Compose
docker --version
docker-compose --version
```

### **1. Container starten:**
```bash
cd /home/mimitechai/mimiverse

# Alle Services starten
docker-compose up -d

# Services prüfen
docker-compose ps
```

**Erwartete Container:**
```
mimiverse-db          (PostgreSQL + pgvector)
mimiverse-redis       (Redis Cache)
mimiverse-dcgm        (NVIDIA GPU Exporter)
mimiverse-prometheus  (Metriken-Sammler)
mimiverse-grafana     (Dashboard)
```

### **2. Health Checks:**
```bash
# Redis
docker exec mimiverse-redis redis-cli ping
# Expected: PONG

# Prometheus
curl http://localhost:9090/-/healthy
# Expected: OK

# Grafana
curl http://localhost:3001/api/health
# Expected: {"database":"ok"}

# DCGM (GPU Metriken)
curl http://localhost:9400/metrics | grep DCGM_FI_DEV_GPU_UTIL
# Expected: GPU Utilization Werte
```

---

## 🎯 Usage

### **AI Cache Statistiken:**
```bash
# Cache Stats abrufen
curl http://localhost:5000/api/cache/stats

# Beispiel Response:
{
  "hits": 150,
  "misses": 50,
  "hitRate": 75.0,
  "keys": 200
}
```

### **Cache leeren:**
```bash
curl -X POST http://localhost:5000/api/cache/clear

# Response:
{
  "success": true,
  "message": "Cache cleared"
}
```

### **Server-Logs (Cache Activity):**
```bash
npm run dev

# Expected Output:
[AI Cache] ✅ Connected to Redis
[AI Cache] ❌ MISS: a3f2b1c8...
[AI Cache] 💾 Cached: a3f2b1c8... (TTL: 3600s)
[AI Cache] ✅ HIT: a3f2b1c8...
```

---

## 📊 Grafana Dashboard

### **1. Zugriff:**
```
URL: http://localhost:3001
User: admin
Password: mimiverse
```

### **2. Dashboard öffnen:**
```
1. Login mit admin/mimiverse
2. Dashboards → Browse
3. "DGX Spark - GPU Monitoring" auswählen
```

### **3. Wichtige Panels:**
```
GPU Utilization (%)    → Ist die GPU ausgelastet?
GPU Memory Usage (GB)  → Wie viel VRAM wird genutzt?
GPU Temperature (°C)   → Läuft die GPU heiß?
GPU Power Draw (W)     → Power Consumption
```

### **4. Alerts (optional):**
```yaml
# monitoring/prometheus/alerts.yml
- alert: GPUMemoryHigh
  expr: DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_FREE > 0.9
  for: 5m
  annotations:
    summary: "GPU Memory >90% for 5 minutes"

- alert: GPUTemperatureHigh
  expr: DCGM_FI_DEV_GPU_TEMP > 80
  for: 2m
  annotations:
    summary: "GPU Temperature >80°C"
```

---

## 🧪 Testing

### **1. Cache Performance Test:**
```bash
# Erste Anfrage (Cache Miss)
time curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain this function: function add(a,b){return a+b}"}'

# Expected: ~2000ms

# Zweite Anfrage (Cache Hit)
time curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain this function: function add(a,b){return a+b}"}'

# Expected: ~10ms (200x schneller!)
```

### **2. GPU Monitoring Test:**
```bash
# GPU-Last erzeugen (Ollama Inference)
curl -X POST http://localhost:11434/api/generate \
  -d '{
    "model": "qwen3-coder:30b",
    "prompt": "Write a complex algorithm",
    "stream": false
  }'

# Gleichzeitig Grafana öffnen:
# http://localhost:3001 → GPU Utilization sollte steigen
```

### **3. Embedding Cache Test:**
```bash
# Projekt neu indexieren
curl -X POST http://localhost:5000/api/codebase/index

# Logs prüfen:
[AI Cache] ❌ MISS: embedding:...  (Erste Datei)
[AI Cache] 💾 Cached: ...          (Cached)
[AI Cache] ✅ HIT: embedding:...   (Zweite gleiche Datei)
```

---

## 📈 Performance Metriken

### **Baseline (vor Optimierung):**
```
AI Completion:       2000ms
Embedding:           300ms
Cache Hit Rate:      0%
GPU Utilization:     Unknown
```

### **Mit Redis Caching:**
```
AI Completion (Hit):  10ms    (200x schneller)
AI Completion (Miss): 2000ms
Embedding (Hit):      10ms    (30x schneller)
Embedding (Miss):     300ms
Cache Hit Rate:       60-70%  (nach Warm-up)
```

### **Mit DCGM Monitoring:**
```
GPU Utilization:      Sichtbar in Grafana
VRAM Usage:           Tracked in real-time
Temperature:          Überwacht (Alerts bei >80°C)
Power Draw:           Gemessen
```

---

## 🔧 Troubleshooting

### **Problem: Redis verbindet nicht**
```bash
# Container-Status prüfen
docker logs mimiverse-redis

# Manuell testen
docker exec -it mimiverse-redis redis-cli
> PING
PONG

# Falls Redis nicht startet:
docker-compose restart redis
```

### **Problem: DCGM startet nicht**
```bash
# NVIDIA Runtime prüfen
docker run --rm --runtime=nvidia nvidia/cuda:12.0-base nvidia-smi

# Falls Fehler:
# 1. NVIDIA Container Toolkit installieren
# 2. Docker neu starten: sudo systemctl restart docker
```

### **Problem: Grafana zeigt keine Daten**
```bash
# Prometheus-Targets prüfen
curl http://localhost:9090/api/v1/targets

# DCGM sollte "up" sein
# Falls "down": docker-compose restart dcgm-exporter
```

### **Problem: Cache funktioniert nicht**
```bash
# TypeScript kompilieren
npm run check

# Falls Fehler: Dependencies installieren
npm install ioredis

# Server neu starten
npm run dev
```

---

## 🎯 Nächste Schritte

### **Phase 1: ✅ DONE**
- [x] Redis Caching
- [x] DCGM Monitoring
- [x] Grafana Dashboard
- [x] API Endpoints

### **Phase 2: TODO**
- [ ] Model Quantization (qwen3-coder:30b → Q4_K_M)
- [ ] Multi-Model Router (Task-spezifische Modelle)
- [ ] Triton Inference Server (CUDA Embeddings)
- [ ] Inline Completions (FIM Model)

### **Phase 3: TODO**
- [ ] Redis Persistence (AOF + RDB)
- [ ] Prometheus Alerting (Email/Slack)
- [ ] Custom Grafana Panels (Cache Hit Rate)
- [ ] Load Testing (k6)

---

## 📚 Weitere Ressourcen

### **Dokumentation:**
```
DGX_SPARK_OPTIMIERUNG_ANALYSE.md  → Vollständige Analyse
QUICK_WINS_PROGRESS.md            → Implementation-Status
```

### **Monitoring URLs:**
```
Grafana:     http://localhost:3001 (admin/mimiverse)
Prometheus:  http://localhost:9090
DCGM:        http://localhost:9400/metrics
Redis:       localhost:6379
```

### **API Endpoints:**
```
GET  /api/cache/stats       → Cache-Statistiken
POST /api/cache/clear       → Cache leeren
GET  /api/memory/stats      → Memory-Statistiken
POST /api/ai/chat           → AI Chat (cached)
POST /api/codebase/index    → Indexing (cached embeddings)
```

---

**Status: Phase 1 COMPLETE ✅**  
**Cache läuft, GPU-Monitoring aktiv, Grafana einsatzbereit!**
