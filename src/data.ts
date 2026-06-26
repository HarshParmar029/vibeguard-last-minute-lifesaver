import { WingmanAgent, Task } from "./types";

export const WINGMAN_AGENTS: WingmanAgent[] = [
  {
    id: "planner",
    name: "Planner Bhai",
    tagline: "Smart Task Deconstructor / Eisenhower Prioritizer",
    avatar: "📊",
    description: "Breaks complex tasks down to atomic steps and prioritizes them based on your current physical energy level & deadlines.",
    bgColor: "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/50",
    accentColor: "text-indigo-600 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-900/30",
    characterPill: "Step-by-Step Optimizer"
  },
  {
    id: "executor",
    name: "Draft Executor",
    tagline: "Draft Synthesizer & Micro-Step Solver",
    avatar: "⚙️",
    description: "Actively writes your code snippets, emails, messages, resume bullets, or handles initial drafting so you never start with empty pages.",
    bgColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50",
    accentColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/30",
    characterPill: "Active Companion"
  },
  {
    id: "nudger",
    name: "Hustle Nudger",
    tagline: "Indian College Context Reminder & Coach",
    avatar: "⏰",
    description: "Serves humorous, custom context-aware warnings, student-friendly reminders, and high-energy motivational pushes to overcome lethargy.",
    bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50",
    accentColor: "text-amber-655 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/30",
    characterPill: "High Energy Booster"
  },
  {
    id: "vibe",
    name: "Vibe Monitor",
    tagline: "Energy Adjuster & Procrastination Killer",
    avatar: "🧠",
    description: "Assesses your dynamic burnout levels, fatigue, or stress, rewriting your schedule so you can start with small low-energy wins first.",
    bgColor: "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50",
    accentColor: "text-rose-600 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-900/30",
    characterPill: "Empathy Optimizer"
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Complete Compiler Design Lab Manual PDF",
    description: "Copy code and draw finite automata diagrams for the predictive parser experiment. Submission is tomorrow mid-night!",
    deadline: "2026-06-24",
    priority: "q1",
    energyRequired: "high",
    status: "pending",
    category: "College Lab Docs",
    microSteps: [
      { id: "s1-1", text: "Download the lab specification PDF shared on WhatsApp group", completed: true, helperText: "Done already." },
      { id: "s1-2", text: "Write down the C/C++ parser program for predictive parser", completed: false, helperText: "Executor can generate code template!" },
      { id: "s1-3", text: "Draw Left Factoring states on paper or Draw.io", completed: false },
      { id: "s1-4", text: "Export PDF and submit on Google Classroom or email to Sharma Sir", completed: false }
    ],
    draftContent: "// Predictive Parser Template\n#include <stdio.h>\n#include <string.h>\n// Write your state checks based on the Grammar...",
    createdTime: "2026-06-23T01:30:00Z"
  },
  {
    id: "task-2",
    title: "Cold Mail 5 Startups for Winter Internships",
    description: "Need to polish dynamic resume & draft customized cover statements pointing to React & node skills.",
    deadline: "2026-06-27",
    priority: "q2",
    energyRequired: "medium",
    status: "doing",
    category: "Job Hunting",
    microSteps: [
      { id: "s2-1", text: "Find 5 early-stage founders on LinkedIn or Wellfound", completed: true },
      { id: "s2-2", text: "Craft high-conversion cold email templates", completed: false, helperText: "Let Draft Executor write the pitch!" },
      { id: "s2-3", text: "Customize links for Github portfolio projects", completed: false },
      { id: "s2-4", text: "Trigger mails and book follow-up reminders in calendar", completed: false }
    ],
    draftContent: "Subject: React Front-end Developer Intern Proposal\n\nDear Founders,\n\nI noticed your recent feature on...",
    createdTime: "2026-06-23T00:10:00Z"
  },
  {
    id: "task-3",
    title: "Chase Group Project Partner for PPT Updates",
    description: "Siddhesh hasn't done his slides for the software engineering project. We need to present on Wednesday morning.",
    deadline: "2026-06-24",
    priority: "q3",
    energyRequired: "low",
    status: "pending",
    category: "Group projects",
    microSteps: [
      { id: "s3-1", text: "Ping him politely on WhatsApp", completed: false },
      { id: "s3-2", text: "If no reply, call or tag him clearly in group chat without sounding angry", completed: false }
    ],
    createdTime: "2026-06-23T02:00:00Z"
  }
];

export const CATEGORIES = [
  "College Lab Docs",
  "Job Hunting",
  "Group projects",
  "Exam Study Tracker",
  "Placement/Coding Prep",
  "Daily Chores"
];

// Indian student and youth slang motivation phrases
export const SLANG_NUDGES = [
  "Bhai, standard tomorrow's exam holds more weight than BGMI ranking! Let's complete the lab files first! 🎮",
  "Don't worry, Sharma Sir won't accept 'the dog ate my IDE' for excuses. Let's finish and upload that PDF! 📄",
  "Chai break targets after clearing 2 micro-steps. Come on, you have 90% potential!",
  "Procrastination is harmful. Go clean that repository and push code right now! ☕",
  "If Siddhesh isn't doing the slides, send him a nice nudge. Use our Draft Executor to make him work! 💬"
];

export const EDUCATION_PILLS = [
  {
    title: "Energy & Energy-Based Scheduling",
    concept: "We match tasks with college energy cycles (High, Medium, Low). Do complex proofs/GATE algorithms when sharp (High Energy), standard emails/administrative forms when sleepy (Low Energy).",
    tip: "Instead of staring at a blank DSA sheet at 10 PM, update your calendar (Low Energy) and schedule heavy tree traversals for 9 AM (High Energy)."
  },
  {
    title: "Eisenhower Matrix for Indian Workspace",
    concept: "Q1 is Urgent/Important (Exams tomorrow, manual copies, client pitch). Q2 is long-term crucial (Interview/Leetcode prep, mock tests). Prioritize Q2 to end Q1 crisis cycles completely!",
    tip: "Allocate 40 mins daily to Q2 (Placement prep) before touch-and-go assignment deadlines creep in."
  },
  {
    title: "Proactive Task Deconstruction",
    concept: "Vagueness creates delay. 'Study Compiler' is too massive. Deconstruct to: 'Write token stream definitions for standard compiler structures'. Clear goals reduce hesitation.",
    tip: "Keep atomic goals. If a step takes more than twenty minutes, chop it down smaller."
  }
];
