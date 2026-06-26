export type WingmanAgentId = "planner" | "executor" | "nudger" | "vibe";

export interface WingmanAgent {
  id: WingmanAgentId;
  name: string;
  tagline: string;
  avatar: string;
  description: string;
  bgColor: string;
  accentColor: string;
  characterPill: string;
}

export interface TaskMicroStep {
  id: string;
  text: string;
  completed: boolean;
  helperText?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: string; // YYYY-MM-DD or custom string
  priority: "q1" | "q2" | "q3" | "q4"; // Eisenhower: Q1 (Urgent/Important), Q2 (Not Urgent/Important), Q3 (Urgent/Not Important), Q4 (Not Urgent/Not Important)
  energyRequired: "high" | "medium" | "low"; // Student energy-based scheduling
  status: "pending" | "doing" | "done";
  category: string; // e.g., "College Assignments", "Job Prep", "Gate/Exam", "Chores"
  microSteps: TaskMicroStep[];
  draftContent?: string; // Executor synthesized helper text, outline, or email draft
  createdTime: string;
}

export interface UserVibeState {
  mood: string;       // e.g., "Burnt Out", "Procrastinating", "Pumped", "Anxious", "Lazy"
  energyScore: number; // 1 to 10
  vibeAnalysisText: string;
  strategyAdjustment: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  agentId: WingmanAgentId;
  suggestedActions?: string[]; // Proactive suggestions list
  extractedTaskSuggestion?: {
    title: string;
    description: string;
    priority: "q1" | "q2" | "q3" | "q4";
    energyRequired: "high" | "medium" | "low";
    category: string;
    microSteps: string[];
  };
}
