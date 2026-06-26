# ⚡ VibeGuard AI — The Last-Minute Life Saver

> **Your proactive AI productivity wingman.** VibeGuard doesn't just remind you about deadlines — it actively helps you finish the work, one atomic step at a time.

Built for **Vibe2Ship 2026** — India's biggest vibe coding hackathon by **Coding Ninjas x Google for Developers**.

---

## 🚀 The Problem

Students, professionals, and entrepreneurs constantly miss deadlines, assignments, and meetings — not because they don't care, but because traditional reminder apps are **passive**. They ping you and leave the real work entirely up to you.

**VibeGuard flips that model.** It plans, breaks down, drafts, and nudges — so the gap between "I have a deadline" and "I'm actually making progress" disappears.

## 💡 The Solution

VibeGuard AI is powered by **four specialized AI agents**, all running on Gemini, working together to take a task from "overwhelming" to "done":

| Agent | Role |
|---|---|
| 🧠 **Planner Agent** | Breaks tasks into atomic micro-steps using the Eisenhower Matrix, factoring in deadline urgency and your current energy level |
| ⚙️ **Executor Agent** | Actually *generates* the content you need — SQL schemas, code snippets, email drafts, document outlines — on demand |
| 🔔 **Nudger Agent** | Sends context-aware, motivating reminders instead of generic pings |
| 📊 **Vibe Monitor** | Detects your mood/energy (Energized, Focused, Tired, Stressed) and re-prioritizes your task list accordingly |

## ✨ Key Features

- **Atomic Action Checklists** — every task is broken into small, completable next steps instead of one intimidating block of work
- **On-demand content generation** — "Generate Schema Now," "Write Sample Code," "Create PDF Outline," and "Draft Email" buttons synthesize real, usable output instantly
- **Focused Sprint Mode** — a distraction-free, Pomodoro-style focus timer synced to your live checklist
- **Vibe Check selector** — pick your current energy (⚡ Energized / 🧠 Focused / 🥱 Tired / 😱 Stressed) and watch the task list and strategy adapt in real time
- **Predictive insights** — estimated time-to-completion based on task complexity and your current vibe
- **Hours Saved & Hustle Streak tracking** — a live dashboard that quantifies your productivity momentum
- **Power Nap Reminder** — because last-minute warriors need recovery breaks too
- **Resilient by design** — automatic retry with exponential backoff, model fallback, and offline-ready fallback responses, so the app stays usable even under API rate limits

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + Express (TypeScript)
- **AI:** Google Gemini API (via Google AI Studio)
- **Deployment:** Google Cloud Run
- **Build tool:** Google AI Studio Build Mode

## 🔧 Google Technologies Used

- Gemini API (multi-agent orchestration: planning, content generation, mood detection)
- Google AI Studio (full-stack app development and deployment)
- Google Cloud Run (production hosting)

## 📦 Getting Started

```bash
# Clone the repo
git clone https://github.com/HarshParmar029/vibeguard-last-minute-lifesaver.git
cd vibeguard-last-minute-lifesaver

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your own GEMINI_API_KEY in .env

# Run locally
npm run dev
```

## 🌐 Live Demo

🔗 **[Live App](#)** — deployed on Google Cloud Run
*(link added after deployment)*

## 📁 Project Structure

```
vibeguard-last-minute-lifesaver/
├── src/
│   ├── App.tsx          # Main application & UI
│   ├── data.ts          # Task & agent data models
│   └── types.ts         # TypeScript type definitions
├── server.ts             # Express backend, Gemini API integration
├── index.html
├── package.json
└── .env.example
```

## 🎯 Built For

**Vibe2Ship 2026** — Problem Statement: *"The Last-Minute Life Saver"*

> Build an AI-powered productivity companion that proactively assists users in planning, prioritizing, and completing tasks before deadlines are missed.

## 👤 Author

**Harsh Parmar**

---

*Built with hustle, chai, and a lot of "Chalo bhai, ek aur task!" energy.* ☕
