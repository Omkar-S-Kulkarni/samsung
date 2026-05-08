# ADEO Health Intelligence Platform

ADEO is a production-grade, on-device health intelligence platform combining a multi-agent LLM pipeline, Digital Twin simulation engine, and a real-time React dashboard — all running locally with zero cloud dependency.

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn api_server:app --reload --port 8000
```

> **Note:** `uvicorn` is installed into the user Python path. Always run it as `python3 -m uvicorn`, not bare `uvicorn`.

### 2. Frontend

```bash
npm install
npm run dev
```

The Vite dev server starts at **http://localhost:5173** and hot-reloads on every change.

### 3. AI Coach (Optional — requires Ollama)

```bash
# Install Ollama from https://ollama.com
ollama serve
ollama pull llama3.2   # or any other model
```

The AI Coach auto-detects running Ollama models and streams responses on-device.

---

## 🏗️ Project Structure

```
samsung/
├── backend/                        # Python FastAPI + ML pipeline
│   ├── api_server.py               # REST API (port 8000)
│   ├── requirements.txt            # Python dependencies
│   └── pipeline/                   # Intelligence modules
│       ├── health_coach.py         # Main orchestrator
│       ├── feature_engineering.py  # Signal feature extraction
│       ├── ml_models.py            # Stress & anomaly models
│       ├── rag_system.py           # FAISS-backed memory
│       ├── digital_twin.py         # Physiological twin model
│       ├── personalization_engine.py
│       └── ...                     # 20+ intelligence modules
│
├── src/                            # React frontend (Vite)
│   ├── App.jsx                     # Root app + real-time polling loop
│   ├── VitalsPanel.jsx             # Real-time vitals dashboard
│   ├── AICoach.jsx                 # PULSE AI chat interface
│   ├── DigitalTwin.jsx             # Twin state visualizer
│   ├── Progress.jsx                # Goals & rewards
│   ├── Signals.jsx                 # 7-day signal trends
│   ├── store/
│   │   └── vitalsStore.js          # Zustand global state store
│   ├── components/
│   │   ├── VitalsComponents.jsx    # Shared UI primitives
│   │   ├── LiveHeartRateGraph.jsx  # HR chart + peak/anomaly detection
│   │   ├── HRVTrendGraph.jsx       # RMSSD variability chart
│   │   ├── ActivityIntensityGraph.jsx # Zone-based activity chart
│   │   ├── StepCountTracker.jsx    # Step goal ring + stats
│   │   ├── SpO2Display.jsx         # Blood oxygen display
│   │   └── MultiSignalChart.jsx    # Combined signal overlay
│   └── index.css                   # Design system + animations
│
├── package.json                    # Frontend dependencies
└── vite.config.js                  # Vite + Tailwind config
```

---

## ⚡ Real-Time Vitals Dashboard

The **Vitals** tab (`VitalsPanel.jsx`) delivers a production-quality health monitoring experience:

| Feature | Details |
|---|---|
| **Live HR Graph** | 1s streaming, peak detection, anomaly highlighting, 10/30/60s window |
| **HRV Trend** | RMSSD-derived from HR history, improving/declining trend arrows |
| **Activity Zones** | 5 zones (Rest → Peak) with color gradients and distribution bars |
| **Step Tracker** | Animated progress ring, calories & distance estimates, milestone ticks |
| **SpO₂ Display** | Green/Yellow/Red coding (95–100 / 90–94 / <90), graceful unavailable state |
| **Signal Quality** | 4-bar indicator (Excellent/Good/Moderate/Poor) computed from HR variance |
| **Multi-Signal** | Toggleable overlay of HR + HRV + Intensity on dual-axis chart |
| **Neural Insights** | AI-generated analysis panel for HRV correlation, activity sync, O₂ status |
| **Backend Alerts** | Emergency alerts (HR extremes, hypoxia) surfaced in real time |

**State management:** All vitals flow through a single [Zustand](https://github.com/pmndrs/zustand) store (`vitalsStore.js`). Components subscribe to only the slices they need — zero prop drilling, zero unnecessary re-renders.

---

## 🤖 PULSE AI Coach

The **Coach** tab (`AICoach.jsx`) is a fully on-device AI health coach:

| Feature | Details |
|---|---|
| **Streaming Chat** | Token-by-token streaming from local Ollama models |
| **Context-Aware** | Live vitals (HR, Readiness, Fatigue, Risk) injected into every prompt |
| **Voice Input** | Web Speech API — click mic, speak, transcribed automatically |
| **Voice Output** | Speech Synthesis — toggle to hear PULSE read responses aloud |
| **Animated Waveform** | 5-bar bouncing visualizer replaces the mic icon while recording |
| **Quick Questions** | Categorized chips (Heart / Recovery / Training / Wellness) with color themes |
| **Markdown Rendering** | Full GFM support — tables, lists, code blocks, blockquotes |
| **Feedback Buttons** | 👍 / 👎 per message, "Explain this" re-prompt, copy-to-clipboard |
| **Multi-turn History** | Full conversation context passed to the model each turn |
| **Model Selector** | Auto-fetches available Ollama models, live status indicator |
| **Framer Motion** | Each message bubble animates in with fade + slide |

---

## 🧠 Backend Intelligence Phases

| Phase | Feature |
|---|---|
| **A–C** | Preprocessing, Feature Engineering, ML Models (stress / anomaly) |
| **D** | RAG Memory (FAISS vector store, decay, summarization) |
| **E** | Multi-modal Fusion Engine |
| **F** | Emergency Detection (HR extremes, hypoxia) |
| **G** | Event-Triggered Inference (significant delta detection) |
| **H** | Battery-Adaptive Sampling |
| **K** | Goal-Driven System & Reward Engine |
| **L** | Feedback-Based Learning & Preference Modeling |
| **M** | Bulletproof Privacy (AES-256 local encryption) |
| **N** | Cross-Device Sync & Intelligent Task Offloading |
| **🧬** | Digital Twin & "What-If" Simulation Engine |
| **⚛️** | React Frontend with 1s Real-Time Sync |

---

## 🛡️ Privacy & Security

- **Zero Cloud Leakage** — all processing happens on-device
- **Encrypted Vault** — AES-256 (Fernet) for profiles and sensitive metrics
- **Permission Control** — granular biometric and location data permissions
- **On-Device LLM** — PULSE AI runs entirely via local Ollama; no API keys needed

---

## 🛠️ Technology Stack

### Frontend
| Library | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 8 | Build tool & dev server |
| Tailwind CSS | 4 | Utility styling |
| Framer Motion | 12 | Animations & transitions |
| Zustand | 5 | Global state management |
| Recharts | 3 | Real-time data charts |
| D3 | 7 | Data utilities |
| Lucide React | latest | Icon system |
| React Markdown | 10 | GFM rendering in chat |

### Backend
| Library | Purpose |
|---|---|
| FastAPI + Uvicorn | REST API server |
| Scikit-learn | Stress & anomaly ML models |
| FAISS (faiss-cpu) | Vector memory for RAG |
| Ollama | Local LLM inference |
| NumPy / Pandas | Data processing |
| Cryptography | AES-256 encryption |

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/process` | Process a real-time vitals sample |
| `GET` | `/dashboard/{user_id}` | Full dashboard state snapshot |
| `POST` | `/goals` | Set a health goal |
| `POST` | `/feedback` | Submit insight feedback |
| `GET` | `/memory/{user_id}` | Retrieve RAG memory entries |
| `POST` | `/privacy/permissions` | Update biometric permissions |
| `GET` | `/export/{user_id}` | Export all user data |

---

## 📋 Development Notes

- **Backend port:** 8000 — **Frontend port:** 5173
- The frontend polls `/dashboard/{user_id}` every **5 seconds** and POSTs to `/process` every **1 second**
- Run `python3 -m uvicorn ...` (not bare `uvicorn`) — the binary path may not be in `$PATH` on macOS
- Ollama must be running separately (`ollama serve`) for the AI Coach to work
