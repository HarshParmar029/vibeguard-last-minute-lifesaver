/**
 * VibeGuard AI
 * Built by Harsh Parmar
 * © 2026 — Vibe2Ship Hackathon Submission
 */
import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, 
  Sparkles, 
  Send, 
  History, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ArrowRight, 
  Trash2, 
  Copy, 
  Check, 
  Layers, 
  Sliders, 
  TrendingUp, 
  Volume2, 
  VolumeX,
  Mic, 
  MicOff, 
  ChevronRight, 
  PlusCircle, 
  Target, 
  CheckSquare, 
  Square,
  HelpCircle,
  Clock,
  BookOpen,
  MessageSquare,
  Sparkle,
  Play,
  Pause,
  RotateCcw,
  X,
  Coffee
} from "lucide-react";
import { WINGMAN_AGENTS, INITIAL_TASKS, CATEGORIES, SLANG_NUDGES, EDUCATION_PILLS } from "./data";
import { Task, TaskMicroStep, UserVibeState, ChatMessage, WingmanAgentId } from "./types";

// Setup Speech Synthesis
const speakMessage = (text: string, voiceSettings?: { pitch?: number; rate?: number }) => {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    // Cancel any active speech
    window.speechSynthesis.cancel();
    // Strip markdown formatting simple regex
    const cleanText = text.replace(/[*#`_\[\]]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = voiceSettings?.pitch || 1.1; // Friendly energetic pitch
    utterance.rate = voiceSettings?.rate || 1.0;
    
    // Attempt to pick a fun dynamic voice
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith("en-IN") || v.name.includes("Google") || v.name.includes("Natural"));
    if (naturalVoice) utterance.voice = naturalVoice;

    window.speechSynthesis.speak(utterance);
  }
};

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"workspace" | "chat" | "education">("workspace");
  const [showAbout, setShowAbout] = useState(false);

  // --- PERSISTENT DATA STATE ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hoursSaved, setHoursSaved] = useState<number>(() => {
    const saved = localStorage.getItem("vibeguard_hours_saved");
    return saved ? parseFloat(saved) : 4.5;
  });
  const [streak, setStreak] = useState<number>(() => {
    const saved = localStorage.getItem("vibeguard_streak");
    return saved ? parseInt(saved, 10) : 7;
  });
  const [userVibe, setUserVibe] = useState<UserVibeState>({
    mood: "Energized",
    energyScore: 8,
    vibeAnalysisText: "You are sharp and ready! Ideal for high-effort placement coding prep or manual files.",
    strategyAdjustment: "Focus on Q2 (Long-term Important) tasks before exhaustion sneaks in at night.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const addHoursSaved = (amount: number) => {
    setHoursSaved(prev => {
      const val = Math.round((prev + amount) * 10) / 10;
      localStorage.setItem("vibeguard_hours_saved", val.toString());
      return val;
    });
  };

  const advanceStreak = () => {
    setStreak(prev => {
      const val = prev + 1;
      localStorage.setItem("vibeguard_streak", val.toString());
      return val;
    });
  };

  // --- WORKSPACE LAYOUT & FORM STATE ---
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<"all" | "q1" | "q2" | "q3" | "q4">("all");
  const [energyFilter, setEnergyFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // New Task Form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState(CATEGORIES[0]);
  const [newTaskPriority, setNewTaskPriority] = useState<"q1" | "q2" | "q3" | "q4">("q1");
  const [newTaskEnergy, setNewTaskEnergy] = useState<"high" | "medium" | "low">("medium");
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [formError, setFormError] = useState("");

  // AI Task Deconstruction / Executor loading
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [decError, setDecError] = useState("");

  // Vibe Diagnostic (procrastination / burnout check)
  const [directVibeInput, setDirectVibeInput] = useState("");
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [vibeError, setVibeError] = useState("");
  const [slangNudge, setSlangNudge] = useState(SLANG_NUDGES[0]);

  // --- AUDIO FEATURES & GLOBAL VOICE OPTION ---
  const [isSSTSupported, setIsSSTSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTTSMuted, setIsTTSMuted] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  // --- MULTI-AGENT CHAT STATE ---
  const [activeAgentId, setActiveAgentId] = useState<WingmanAgentId>("planner");
  const [chatInputs, setChatInputs] = useState<Record<WingmanAgentId, string>>({
    planner: "",
    executor: "",
    nudger: "",
    vibe: ""
  });
  
  const [chatHistory, setChatHistory] = useState<Record<WingmanAgentId, ChatMessage[]>>({
    planner: [
      {
        id: "p1",
        role: "model",
        text: "Arre bhai! I am **Planner Bhai**, your smart task deconstructor. Paste any chaotic deadline or class assignment here, and I'll chop it down into atomic work steps with Eisenhower Priority levels. What are we planning today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: "planner",
        suggestedActions: ["Breakdown Compiler Lab", "Prioritize Resume Prep", "Organize Exam Schedule"]
      }
    ],
    executor: [
      {
        id: "e1",
        role: "model",
        text: "Hey! **Draft Executor** in the house! ⚙️ I don't let you face empty blank pages. Need a starter C++ parser template, a slick cold pitch email, or a polite WhatsApp alert text to push your project partners? Give me the task, and I will write the draft instantly!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: "executor",
        suggestedActions: ["Generate cold pitch", "Write Siddhesh alert", "Create Compiler code"]
      }
    ],
    nudger: [
      {
        id: "n1",
        role: "model",
        text: "Wake up, boss! **Hustle Nudger** here. ⏰ Endless phone scrolling is not going to clear your backlog! Let us get active. Tell me the task you are delaying, and I'll feed you custom high-energy student logic and motivation!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: "nudger",
        suggestedActions: ["Kick procrastinating", "Gimme Chai logic", "Deadline alert"]
      }
    ],
    vibe: [
      {
        id: "v1",
        role: "model",
        text: "Hello friend. I am the **Vibe Monitor**. 🧠 Tired? Stressed out? Burnout is real, and dragging your feet on high-energy work makes it worse. Tell me exactly how you feel, and I will adjust your plan so we bag some quick, easy low-energy victories first!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: "vibe",
        suggestedActions: ["I feel sleepy & lazy", "I am highly stressed", "Ready to attack!"]
      }
    ]
  });
  const [isChatting, setIsChatting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const activeAgent = WINGMAN_AGENTS.find(a => a.id === activeAgentId) || WINGMAN_AGENTS[0];
  const activeAgentHistory = chatHistory[activeAgentId];
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- ATOMIC ACTION & CUSTOM GENERATOR MOUNTS ---
  const [isAtomicActive, setIsAtomicActive] = useState(false);
  const [atomicTimeSeconds, setAtomicTimeSeconds] = useState(1500); // 25 Min Pomodoro default
  const [atomicPlaying, setAtomicPlaying] = useState(false);
  const [atomicSprintTask, setAtomicSprintTask] = useState<Task | null>(null);
  const [showNapReminder, setShowNapReminder] = useState(false);

  const [customGenOutput, setCustomGenOutput] = useState<{ content: string; explanation: string } | null>(null);
  const [isCustomGenerating, setIsCustomGenerating] = useState(false);
  const [customGenError, setCustomGenError] = useState("");
  const [activeGenType, setActiveGenType] = useState<"sql_schema" | "sql_queries" | "pdf_outline" | "email_draft" | "general">("sql_schema");
  const [customGeneratorUserPrompt, setCustomGeneratorUserPrompt] = useState("");

  // Countdown timer ticker
  useEffect(() => {
    let timer: any = null;
    if (atomicPlaying && atomicTimeSeconds > 0) {
      timer = setInterval(() => {
        setAtomicTimeSeconds(prev => prev - 1);
      }, 1000);
    } else if (atomicTimeSeconds === 0 && atomicPlaying) {
      setAtomicPlaying(false);
      speakMessage("Oye shabaash! Atomic focus sprint is complete. Samosa-chai target achieved! Take a break!");
    }
    return () => clearInterval(timer);
  }, [atomicPlaying, atomicTimeSeconds]);

  // Dynamic Generator handler calling server backend
  const handleCustomExecutorGenerate = async (
    type: "sql_schema" | "sql_queries" | "pdf_outline" | "email_draft" | "general",
    customPrompt?: string
  ) => {
    const taskObj = selectedTask || atomicSprintTask || (tasks.length > 0 ? tasks[0] : null);
    if (!taskObj) {
      setCustomGenError("Arey bhai, first select or create a task so we have structural context!");
      return;
    }

    setIsCustomGenerating(true);
    setCustomGenError("");
    setCustomGenOutput(null);

    try {
      const response = await fetch("/api/executor/generate_custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: taskObj.title,
          taskDescription: (taskObj.description || "") + (customPrompt ? ` [Additional: ${customPrompt}]` : ""),
          generationType: type
        })
      });

      if (!response.ok) {
        let errStr = "Failed to contact Executor Agent server.";
        try {
          const dat = await response.json();
          if (dat?.error) errStr = dat.error;
        } catch (_) {}
        throw new Error(errStr);
      }

      const resJson = await response.json();
      setCustomGenOutput({
        content: resJson.generatedContent || "",
        explanation: resJson.briefExplanation || ""
      });

      // Update selectedTask's draftContent in state if it's currently selected to preserve the cache
      if (selectedTask && selectedTask.id === taskObj.id) {
        const revisedTask = {
          ...selectedTask,
          draftContent: resJson.generatedContent
        };
        updateTaskInState(revisedTask);
      }

      if (!isTTSMuted) {
        speakMessage("Ji bindaas! Executor Agent finished drafting code. Copy from the preview now!");
      }
    } catch (err: any) {
      console.error(err);
      setCustomGenError(err.message || "Something went wrong during code Generation.");
    } finally {
      setIsCustomGenerating(false);
    }
  };

  // Quick direct vibe check selector - auto adjusts task filters
  const handleQuickVibeCheck = (mood: "Energized" | "Focused" | "Tired" | "Stressed") => {
    let score = 8;
    let analysis = "";
    let strategy = "";
    
    if (mood === "Energized") {
      score = 9;
      analysis = "You are in Absolute Macha Mode! Energy levels are through the roof. Ready to crush massive tasks.";
      strategy = "Planner Bhai recommendation: Attack Q1 critical priorities immediately. Use Executor to draft schemas!";
      setEnergyFilter("all");
    } else if (mood === "Focused") {
      score = 8;
      analysis = "Calm, steady, and laser-focused. Ideal for high-density reading or code implementation.";
      strategy = "Filter set to Q2 tasks. Keep phone in drawer and compile files directly!";
      setEnergyFilter("all");
    } else if (mood === "Tired") {
      score = 3;
      analysis = "Lagta hai battery khatam ho rahi hai! Let's take it easy. Small, low-energy victories first.";
      strategy = "Energy filter auto-set to LOW. Easy tasks loaded. Nudger says: chai block target achieved!";
      setEnergyFilter("low");
    } else if (mood === "Stressed") {
      score = 4;
      analysis = "Stress load is high! Deadline anxiety is paralyzing. Breathe in, breathe out.";
      strategy = "Planner Bhai suggests breaking down ONE small Q1 item. Click 'Start Micro Task' in list!";
      setEnergyFilter("low");
    }

    const nextVibe = {
      mood,
      energyScore: score,
      vibeAnalysisText: analysis,
      strategyAdjustment: strategy,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    syncVibeState(nextVibe);

    // Speak motivation!
    speakMessage(`Vibe check updated to ${mood}! ${analysis}`);
  };

  // Convert seconds to human MM:SS format
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  // Initialize Data & Speech
  useEffect(() => {
    // Force dark mode active
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark");
    }
    // Sync storage
    const storedTasks = localStorage.getItem("vibeguard_productivity_tasks");
    if (storedTasks) {
      try {
        const parsed = JSON.parse(storedTasks);
        setTasks(parsed);
        if (parsed.length > 0) {
          setSelectedTask(parsed[0]);
        }
      } catch (err) {
        console.error("Failed to parse stored tasks", err);
        setTasks(INITIAL_TASKS);
        setSelectedTask(INITIAL_TASKS[0]);
      }
    } else {
      setTasks(INITIAL_TASKS);
      setSelectedTask(INITIAL_TASKS[0]);
    }

    const storedVibe = localStorage.getItem("vibeguard_productivity_vibe");
    if (storedVibe) {
      try {
        setUserVibe(JSON.parse(storedVibe));
      } catch (e) {
        console.error(e);
      }
    }

    // Setup Web Speech API Voice Input
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-IN"; // Target Indian accent / english smoothly
        
        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error", event);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognitionInstance(rec);
        setIsSSTSupported(true);
      }
    }

    // Pick random slang nudge
    const rand = Math.floor(Math.random() * SLANG_NUDGES.length);
    setSlangNudge(SLANG_NUDGES[rand]);
  }, []);

  // Save Tasks to localStorage helper
  const syncTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem("vibeguard_productivity_tasks", JSON.stringify(newTasks));
  };

  const syncVibeState = (v: UserVibeState) => {
    setUserVibe(v);
    localStorage.setItem("vibeguard_productivity_vibe", JSON.stringify(v));
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeAgentHistory]);

  // Speech Recognition input processor
  const toggleListening = (target: "direct_vibe" | "chat") => {
    if (!recognitionInstance) return;

    if (isListening) {
      recognitionInstance.stop();
      return;
    }

    recognitionInstance.onresult = (event: any) => {
      const speechToTextResult = event.results[0][0].transcript;
      if (target === "direct_vibe") {
        setDirectVibeInput(prev => (prev ? prev + " " + speechToTextResult : speechToTextResult));
      } else {
        setChatInputs(prev => ({
          ...prev,
          [activeAgentId]: prev[activeAgentId] ? prev[activeAgentId] + " " + speechToTextResult : speechToTextResult
        }));
      }
      setIsListening(false);
    };

    recognitionInstance.start();
  };

  // --- ACTIONS ---

  // 1. Submit Vibe Analyzer Diagnostic
  const handleVibeDiagnose = async (overrideMessage?: string) => {
    const finalMsg = overrideMessage || directVibeInput;
    if (!finalMsg.trim()) return;

    setIsDiagnosing(true);
    setVibeError("");

    try {
      const response = await fetch("/api/vibe/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalMsg,
          currentActivity: selectedTask ? selectedTask.title : "None specified"
        })
      });

      if (!response.ok) {
        let errMsg = "Server could not parse productivity state.";
        try {
          const errData = await response.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const result = await response.json();
      
      const newVibe: UserVibeState = {
        mood: result.mood || "Balanced",
        energyScore: result.energyScore || 5,
        vibeAnalysisText: result.vibeAnalysisText || "Analyzed successfully.",
        strategyAdjustment: result.strategyAdjustment || "No immediate schedule shifts required.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      syncVibeState(newVibe);
      setDirectVibeInput("");

      // Read output aloud if voice is unmuted
      if (!isTTSMuted) {
        speakMessage(`Diagnosed Mood is ${newVibe.mood}. Strategy: ${newVibe.strategyAdjustment}`);
      }

    } catch (err: any) {
      console.error(err);
      setVibeError(err.message || "Failed to process mood analyzer. Verify your setup.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  // 2. Add custom task manual submit
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      setFormError("Task title is required.");
      return;
    }

    const newTask: Task = {
      id: "task-" + Date.now(),
      title: newTaskTitle,
      description: newTaskDesc,
      deadline: newTaskDeadline || "No major deadline",
      priority: newTaskPriority,
      energyRequired: newTaskEnergy,
      status: "pending",
      category: newTaskCategory,
      microSteps: [],
      createdTime: new Date().toISOString()
    };

    const updated = [newTask, ...tasks];
    syncTasks(updated);
    setSelectedTask(newTask);

    // Reset Form
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskDeadline("");
    setNewTaskPriority("q1");
    setNewTaskEnergy("medium");
    setFormError("");
    setShowNewTaskForm(false);
  };

  // Delete Task
  const handleDeleteTask = (id: string) => {
    const remaining = tasks.filter(t => t.id !== id);
    syncTasks(remaining);
    if (selectedTask?.id === id) {
      setSelectedTask(remaining.length > 0 ? remaining[0] : null);
    }
  };

  // Edit Task helper
  const updateTaskInState = (updated: Task) => {
    const mapping = tasks.map(t => t.id === updated.id ? updated : t);
    syncTasks(mapping);
    if (selectedTask?.id === updated.id) {
      setSelectedTask(updated);
    }
  };

  // Toggle MicroStep completetion status
  const handleToggleStep = (taskId: string, stepId: string) => {
    const parentTask = tasks.find(t => t.id === taskId);
    if (!parentTask) return;

    const renewedSteps = parentTask.microSteps.map(s => s.id === stepId ? { ...s, completed: !s.completed } : s);
    const completedCount = renewedSteps.filter(s => s.completed).length;
    
    // Automatically shift status
    let nextStatus = parentTask.status;
    if (completedCount === renewedSteps.length && renewedSteps.length > 0) {
      nextStatus = "done";
    } else if (completedCount > 0) {
      nextStatus = "doing";
    }

    const justCompletedMicro = renewedSteps.find(s => s.id === stepId)?.completed;

    if (nextStatus === "done" && parentTask.status !== "done") {
      addHoursSaved(1.8);
      advanceStreak();
      speakMessage("Superb choice! All micro steps finished. Entire task marked as completed! 🚀");
    } else if (justCompletedMicro) {
      addHoursSaved(0.3); // 20 minutes saved per microstep
    }

    updateTaskInState({
      ...parentTask,
      microSteps: renewedSteps,
      status: nextStatus
    });
  };

  // Trigger Gemini Task Deconstructor to get robust micro-steps dynamically
  const handleAIDeconstructTask = async (task: Task) => {
    setIsDeconstructing(true);
    setDecError("");

    try {
      const response = await fetch("/api/task/deconstruct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          currentEnergy: userVibe.energyScore > 5 ? "high" : "low"
        })
      });

      if (!response.ok) {
        let errMsg = "Could not contact Planner Bhai for task breakdown.";
        try {
          const errData = await response.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const outcome = await response.json();
      
      const newSteps: TaskMicroStep[] = outcome.microSteps.map((step: any, idx: number) => ({
        id: `ai-step-${idx}-${Date.now()}`,
        text: step.text,
        completed: false,
        helperText: step.helperText || undefined
      }));

      const isHighPriority = task.priority === "q1" || task.priority === "q2";

      updateTaskInState({
        ...task,
        microSteps: [...task.microSteps, ...newSteps],
        draftContent: outcome.suggestedDraft || task.draftContent,
        status: "doing"
      });

      if (!isTTSMuted) {
        speakMessage(outcome.motivationalHook || "Task parsed successfully, let's complete it step by step!");
      }

    } catch (err: any) {
      console.error(err);
      setDecError(err.message || "Something went wrong during deconstruction.");
    } finally {
      setIsDeconstructing(false);
    }
  };

  // Send Chat message to chosen Safety Wingman
  const handleSendChatMessage = async (presetTextStr?: string) => {
    const rawInputText = presetTextStr || chatInputs[activeAgentId];
    if (!rawInputText.trim() || isChatting) return;

    // Reset current tab input
    setChatInputs(prev => ({ ...prev, [activeAgentId]: "" }));
    setChatError(null);

    const userMessage: ChatMessage = {
      id: "usr-" + Date.now(),
      role: "user",
      text: rawInputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      agentId: activeAgentId
    };

    const currentAgentDialogue = [...activeAgentHistory, userMessage];

    // Push local state
    setChatHistory(prev => ({
      ...prev,
      [activeAgentId]: currentAgentDialogue
    }));

    setIsChatting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: activeAgentId,
          messages: currentAgentDialogue.map(m => ({ role: m.role, text: m.text })),
          currentTaskList: tasks
        })
      });

      if (!response.ok) {
        let errMsg = "Wingman server failed to receive response.";
        try {
          const errData = await response.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const outcomeJson = await response.json();

      const assistantMessage: ChatMessage = {
        id: "ai-" + Date.now(),
        role: "model",
        text: outcomeJson.reply || "Sorry bhai, had a small glitch processing that proposal.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: activeAgentId,
        suggestedActions: outcomeJson.suggestedActions || [],
        extractedTaskSuggestion: outcomeJson.extractedTaskSuggestion || undefined
      };

      setChatHistory(prev => ({
        ...prev,
        [activeAgentId]: [...currentAgentDialogue, assistantMessage]
      }));

      // Speak model response if unmuted
      if (!isTTSMuted) {
        speakMessage(outcomeJson.reply);
      }

    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "Chat link offline. Set your settings key first.");
    } finally {
      setIsChatting(false);
    }
  };

  // Parse and render rich custom response text (converts broad bold and italics cleanly for pure CSS rendering)
  const renderMessageContent = (text: string) => {
    const parts = text.split("\n").map((line, index) => {
      // Very elegant standard string replacement for bold and backticks
      let processed = line;
      
      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      
      // Simple custom parse block
      const regex = /(\*\*|`)(.*?)\1/g;
      let match;
      let keyCounter = 0;

      while ((match = regex.exec(processed)) !== null) {
        const matchIndex = match.index;
        const type = match[1];
        const content = match[2];

        // Add preceding text
        if (matchIndex > lastIndex) {
          elements.push(processed.substring(lastIndex, matchIndex));
        }

        if (type === "**") {
          elements.push(<strong key={keyCounter++} className="font-extrabold text-slate-900 dark:text-white underline decoration-indigo-400/40">{content}</strong>);
        } else {
          elements.push(<code key={keyCounter++} className="bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 text-xs px-1.5 py-0.5 rounded font-mono font-medium">{content}</code>);
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < processed.length) {
        elements.push(processed.substring(lastIndex));
      }

      return (
        <p key={index} className="mb-2 leading-relaxed text-xs sm:text-sm">
          {elements.length > 0 ? elements : line}
        </p>
      );
    });

    return <div className="space-y-1 font-sans">{parts}</div>;
  };

  // Convert priority identifier into clean text representation
  const getPriorityInfo = (pri: string) => {
    switch (pri) {
      case "q1": return { label: "Q1: Urgent & Important", color: "text-red-650 dark:text-red-400 bg-red-100/55 dark:bg-red-950/40 border-red-200" };
      case "q2": return { label: "Q2: Long-term Growth", color: "text-indigo-650 dark:text-indigo-400 bg-indigo-100/55 dark:bg-indigo-950/40 border-indigo-200" };
      case "q3": return { label: "Q3: Immediate Chore", color: "text-amber-650 dark:text-amber-400 bg-amber-100/55 dark:bg-amber-950/40 border-amber-200" };
      default: return { label: "Q4: Low-Value Activity", color: "text-slate-600 dark:text-slate-450 bg-slate-100 dark:bg-slate-800 border-slate-250" };
    }
  };

  const getEnergyLevelInfo = (energy: string) => {
    switch (energy) {
      case "high": return { label: "High Energy Required", icon: "⚡", style: "border-orange-200 text-orange-700 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400" };
      case "medium": return { label: "Medium Effort Level", icon: "💪", style: "border-sky-200 text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400" };
      default: return { label: "Low Lazy Effort", icon: "☕", style: "border-emerald-250 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" };
    }
  };

  // Add the AI generated recommendation card dynamically to the board
  const addExtractedTask = (extracted: NonNullable<ChatMessage["extractedTaskSuggestion"]>) => {
    const generated: Task = {
      id: "ai-ext-" + Date.now(),
      title: extracted.title,
      description: extracted.description,
      deadline: "Within this week",
      priority: extracted.priority || "q2",
      energyRequired: extracted.energyRequired || "medium",
      status: "pending",
      category: extracted.category || "AI Suggestion",
      microSteps: extracted.microSteps.map((step, idx) => ({
        id: `ext-step-${idx}-${Date.now()}`,
        text: step,
        completed: false
      })),
      createdTime: new Date().toISOString()
    };

    const updated = [generated, ...tasks];
    syncTasks(updated);
    setSelectedTask(generated);
    setActiveTab("workspace");
  };

  // Copy helper text to clipboard
  const [copyFeedback, setCopyFeedback] = useState(false);
  const handleCopyDraft = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const [copiedRewriteKey, setCopiedRewriteKey] = useState<string | null>(null);
  const copyTextToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRewriteKey(key);
    setTimeout(() => setCopiedRewriteKey(null), 2000);
  };

  // Filter tasks based on settings
  const filteredTasks = tasks.filter((task) => {
    const matchesPriority = taskFilter === "all" || task.priority === taskFilter;
    const matchesEnergy = energyFilter === "all" || task.energyRequired === energyFilter;
    const matchesCategory = categoryFilter === "all" || task.category === categoryFilter;
    return matchesPriority && matchesEnergy && matchesCategory;
  });

  // Calculate real-time global statistics for real-time progress tracker
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === "done").length;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const q1CountLeft = tasks.filter(t => t.priority === "q1" && t.status !== "done").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-200">
      
      {/* GLOBAL HEADER BAR */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md px-4 py-2.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand Identification */}
          <div className="flex items-center gap-3 self-start md:self-center">
            <div className="w-11 h-11 bg-indigo-600 dark:bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none animate-pulse">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold font-display tracking-tight text-slate-900 dark:text-white">VibeGuard AI</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-200/50">Proactive Wingman</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bhai, never miss a deadline. Your atomic productivity assistant.</p>
            </div>
          </div>

          {/* Quick Voice Settings & Current Vibe State preview */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            
            {/* Audio configuration status */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <button
                onClick={() => setIsTTSMuted(!isTTSMuted)}
                className="p-1 rounded bg-white dark:bg-slate-700 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer mr-1.5"
                title={isTTSMuted ? "Unmute Voice Readings" : "Mute Read-Aloud"}
              >
                {isTTSMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-bounce" />}
              </button>
              <span className="text-[10px] font-bold text-slate-650 dark:text-slate-350 mr-2">TTS READOUT:</span>
              <span className="text-[10px] uppercase font-black tracking-wide text-slate-505">
                {isTTSMuted ? "MUTED" : "ACTIVE 🔊"}
              </span>
            </div>

            {/* Current diagnosed energy profile */}
            <div className="flex items-center bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900 px-3 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                <span>Vibe Status:</span>
                <span className="bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded-md font-extrabold text-xs">
                  {userVibe.mood} ({userVibe.energyScore}/10 ⚡)
                </span>
              </span>
            </div>

            {/* Main Tabs switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                id="tab-workspace"
                onClick={() => setActiveTab("workspace")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "workspace"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                Workspace
              </button>
              <button
                id="tab-chat"
                onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "chat"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Wingman Chat
              </button>
              <button
                id="tab-education"
                onClick={() => setActiveTab("education")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "education"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Vibe Codex
              </button>
            </div>

            {/* About Hackathon Trigger */}
            <button
              id="btn-about-hackathon"
              onClick={() => setShowAbout(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer hover:scale-105"
              title="About VibeGuard AI & Creator"
            >
              <HelpCircle className="w-4 h-4 text-indigo-500" />
            </button>

          </div>
        </div>
      </header>

      {/* EMERGENCY HUSTLE WARNING BAR */}
      <div className="bg-amber-500 text-slate-950 font-bold text-xs py-1.5 text-center px-4 flex items-center justify-center gap-2">
        <Sparkle className="w-4 h-4 text-slate-950 fill-slate-950 animate-spin" />
        <span>Today's Hustle Advice: "{slangNudge}"</span>
        <button 
          onClick={() => {
            const r = Math.floor(Math.random() * SLANG_NUDGES.length);
            setSlangNudge(SLANG_NUDGES[r]);
          }}
          className="underline hover:text-white ml-2 text-[10px] uppercase tracking-wider"
        >
          Skip Advice
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6">

        {/* ========================================= */}
        {/* TAB 1: WORKSPACE & TASK TRACKER           */}
        {/* ========================================= */}
        {activeTab === "workspace" && (
          <div className="space-y-6">

            {/* REAL-TIME PROGRESS TRACKER & ADAPTIVE VIBE STATUS PANEL */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Card 1: Visual Progress Bar Meter */}
              <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Progress tracker</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{completedTasksCount} / {totalTasksCount} Done</span>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white transition-all">{progressPercent}%</span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-400">
                      {progressPercent === 100 
                        ? "Macha Mode! ☕☕" 
                        : progressPercent >= 70 
                        ? "Shocking speed! 🔥" 
                        : progressPercent >= 40 
                        ? "Sharma Sir approved! 💪" 
                        : progressPercent > 0 
                        ? "Momentum building! 🚀" 
                        : "Empty board, generate steps!"}
                    </span>
                  </div>

                  {/* Complete Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-3 mb-4 overflow-hidden border border-slate-200/50 dark:border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Critical Q1</span>
                    <span className={`text-sm font-black block ${q1CountLeft > 0 ? "text-red-500" : "text-slate-500"}`}>
                      {q1CountLeft} Left
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Active</span>
                    <span className="text-sm font-black text-indigo-500 block">
                      {totalTasksCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Chai Target</span>
                    <span className="text-sm font-black text-amber-500 block">
                      {progressPercent >= 40 ? "Achieved" : "Doing"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Adaptive Dynamic Vibe Status Info */}
              <div className={`md:col-span-4 bg-gradient-to-br rounded-3xl p-5 text-white shadow-md flex flex-col justify-between transition-all duration-300 ${
                userVibe.mood.toLowerCase().includes("lazy") || userVibe.mood.toLowerCase().includes("sleepy") || userVibe.mood.toLowerCase().includes("tired")
                  ? "from-amber-500 to-orange-600 shadow-orange-500/10"
                  : userVibe.mood.toLowerCase().includes("stress") || userVibe.mood.toLowerCase().includes("burn") || userVibe.mood.toLowerCase().includes("anxious")
                  ? "from-rose-500 to-red-600 shadow-rose-500/10"
                  : userVibe.mood.toLowerCase().includes("pumped") || userVibe.mood.toLowerCase().includes("energized") || userVibe.mood.toLowerCase().includes("energetic")
                  ? "from-indigo-600 to-emerald-600 shadow-indigo-500/10"
                  : "from-indigo-600 to-slate-800 shadow-slate-500/10"
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold uppercase text-[10px] tracking-widest bg-white/20 px-2 py-0.5 rounded">Active Vibe Status</span>
                    <span className="text-[10px] bg-black/25 px-2 py-0.5 rounded font-mono">Fatigue: {10 - userVibe.energyScore}/10</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">
                      {userVibe.mood.toLowerCase().includes("lazy") || userVibe.mood.toLowerCase().includes("sleepy") || userVibe.mood.toLowerCase().includes("tired")
                        ? "🥱"
                        : userVibe.mood.toLowerCase().includes("stress") || userVibe.mood.toLowerCase().includes("burn") || userVibe.mood.toLowerCase().includes("anxious")
                        ? "😱"
                        : userVibe.mood.toLowerCase().includes("pumped") || userVibe.mood.toLowerCase().includes("energized") || userVibe.mood.toLowerCase().includes("energetic")
                        ? "⚡"
                        : "🧠"}
                    </span>
                    <h3 className="text-sm font-black tracking-tight">{userVibe.mood} Mode</h3>
                  </div>

                  <p className="text-[11px] text-white/95 leading-relaxed font-medium line-clamp-2 italic mb-2">
                    "{userVibe.vibeAnalysisText}"
                  </p>
                </div>

                {/* VIBE CHECK SELECTOR PILLS */}
                <div className="pt-2 border-t border-white/20">
                  <span className="text-[9px] uppercase font-black text-white/80 block tracking-widest mb-1">Interactive Vibe Check:</span>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() => handleQuickVibeCheck("Energized")}
                      className={`text-[9px] font-bold py-1 px-0.5 rounded text-center transition-all cursor-pointer ${
                        userVibe.mood === "Energized" ? "bg-white text-indigo-700 font-extrabold scale-105 shadow-sm" : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                      title="Set Energized Mode"
                    >
                      ⚡ Ready
                    </button>
                    <button
                      onClick={() => handleQuickVibeCheck("Focused")}
                      className={`text-[9px] font-bold py-1 px-0.5 rounded text-center transition-all cursor-pointer ${
                        userVibe.mood === "Focused" ? "bg-white text-emerald-800 font-extrabold scale-105 shadow-sm" : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                      title="Set Focused Mode"
                    >
                      🧠 Focus
                    </button>
                    <button
                      onClick={() => handleQuickVibeCheck("Tired")}
                      className={`text-[9px] font-bold py-1 px-0.5 rounded text-center transition-all cursor-pointer ${
                        userVibe.mood === "Tired" ? "bg-white text-amber-800 font-extrabold scale-105 shadow-sm" : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                      title="Set Tired Mode"
                    >
                      🥱 Tired
                    </button>
                    <button
                      onClick={() => handleQuickVibeCheck("Stressed")}
                      className={`text-[9px] font-bold py-1 px-0.5 rounded text-center transition-all cursor-pointer ${
                        userVibe.mood === "Stressed" ? "bg-white text-rose-800 font-extrabold scale-105 shadow-sm" : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                      title="Set Stressed Mode"
                    >
                      😱 Stress
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: Weekly Streak & Hours Saved Analytics */}
              <div className="md:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-widest block">Live Analytics</span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>

                  {/* Stat 1: Hours Saved */}
                  <div className="mb-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500 font-bold shrink-0">
                      <Coffee className="w-5 h-5 text-amber-500 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-bold leading-none mb-0.5">Hours Saved</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-slate-900 dark:text-white">{hoursSaved}h</span>
                        <span className="text-[9px] text-slate-500">Today</span>
                      </div>
                    </div>
                  </div>

                  {/* Stat 2: Streak Counter */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 font-bold shrink-0">
                      🔥
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-bold leading-none mb-0.5">Hustle Streak</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-slate-900 dark:text-white">{streak} Days</span>
                        <span className="text-[9px] text-emerald-500 font-bold font-mono">LIVE</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 font-mono italic leading-tight">
                  ⚡ Auto-saves workspace effort as you complete micro-tasks.
                </div>
              </div>

            </div>
            
            {/* Top Row: Vibe Analyzer Block + Diagnostic Input */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Sliders className="w-4.5 h-4.5" />
                  </div>
                  <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">Diagnose Procrastinating Mood</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Stuck? Sleeping? Feeling excessive load or anxiety of tomorrow's submissions? Speak or type it out. Vibe Monitor shifts planning parameters for quick momentum victories.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setDirectVibeInput("I feel super lazy and sleepy, lab file is pending but I cannot focus.");
                      handleVibeDiagnose("I feel super lazy and sleepy, lab file is pending but I cannot focus.");
                    }}
                    className="text-[10px] bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 border border-slate-205 dark:border-slate-800 px-2 py-0.5 rounded-md"
                  >
                    Lazy & Sleepy 🥱
                  </button>
                  <button
                    onClick={() => {
                      setDirectVibeInput("Extremely high stress levels of exams and backlogs!");
                      handleVibeDiagnose("Extremely high stress levels of exams and backlogs!");
                    }}
                    className="text-[10px] bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 border border-slate-205 dark:border-slate-800 px-2 py-0.5 rounded-md"
                  >
                    High Stress / Backlogged 😱
                  </button>
                  <button
                    onClick={() => {
                      setDirectVibeInput("Pumped up! Ready to knock down placing prep manual tasks.");
                      handleVibeDiagnose("Pumped up! Ready to knock down placing prep manual tasks.");
                    }}
                    className="text-[10px] bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 border border-slate-205 dark:border-slate-800 px-2 py-0.5 rounded-md"
                  >
                    Pumped & Energetic ⚡
                  </button>
                </div>
              </div>

              {/* Central Input for Diagnose */}
              <div className="lg:col-span-7 space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={directVibeInput}
                    onChange={(e) => setDirectVibeInput(e.target.value)}
                    placeholder="Tell AI Vibe Monitor: 'I feel completely stuck on line 4 of my code...' or use voice dictation."
                    className="w-full text-xs sm:text-sm p-3.5 pr-24 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 font-sans"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1.5">
                    {isSSTSupported && (
                      <button
                        onClick={() => toggleListening("direct_vibe")}
                        className={`p-2 rounded-xl transition-all ${
                          isListening 
                            ? "bg-red-500 text-white animate-pulse" 
                            : "bg-slate-200 dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                        }`}
                        title="Dictate with voice"
                      >
                        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleVibeDiagnose()}
                      disabled={isDiagnosing || !directVibeInput.trim()}
                      className="bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 text-white text-xs px-3 py-2 rounded-xl font-bold font-display"
                    >
                      {isDiagnosing ? "Analyzing..." : "Diagnose"}
                    </button>
                  </div>
                </div>

                {vibeError && (
                  <p className="text-[11px] text-red-500 italic font-medium">{vibeError}</p>
                )}

                {/* Response summary widget */}
                <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">AI Strategy Adjustments</span>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">"{userVibe.strategyAdjustment}"</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[9px] text-slate-400 block font-medium">Diagnosed at {userVibe.timestamp}</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Estimated Fatigue: {10 - userVibe.energyScore}/10</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Task Board controls: filters, add buttons */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 p-4 rounded-2xl">
              
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                
                {/* Priority Filters */}
                <div>
                  <span className="text-[10px] font-bold text-slate-450 block mb-1 uppercase tracking-wider">Eisenhower Matrix Focus</span>
                  <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
                    <button
                      onClick={() => setTaskFilter("all")}
                      className={`px-2.5 py-1 rounded-md transition-all ${taskFilter === "all" ? "bg-white dark:bg-slate-700 shadow-2xs" : "text-slate-450"}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTaskFilter("q1")}
                      className={`px-2.5 py-1 rounded-md transition-all ${taskFilter === "q1" ? "bg-red-500 text-white shadow-2xs" : "text-slate-450"}`}
                    >
                      Q1 (Defend)
                    </button>
                    <button
                      onClick={() => setTaskFilter("q2")}
                      className={`px-2.5 py-1 rounded-md transition-all ${taskFilter === "q2" ? "bg-indigo-500 text-white shadow-2xs" : "text-slate-450"}`}
                    >
                      Q2 (Growth)
                    </button>
                    <button
                      onClick={() => setTaskFilter("q3")}
                      className={`px-2.5 py-1 rounded-md transition-all ${taskFilter === "q3" ? "bg-amber-500 text-slate-950 shadow-2xs" : "text-slate-450"}`}
                    >
                      Q3 (Delegate)
                    </button>
                  </div>
                </div>

                {/* Effort Filters */}
                <div>
                  <span className="text-[10px] font-bold text-slate-450 block mb-1 uppercase tracking-wider">Energy Required</span>
                  <select
                    value={energyFilter}
                    onChange={(e) => setEnergyFilter(e.target.value as any)}
                    className="text-xs p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-705"
                  >
                    <option value="all">⚡ All Energy Levels</option>
                    <option value="high">⚡ High Focus Only</option>
                    <option value="medium">💪 Medium Focus Only</option>
                    <option value="low">☕ Low Effort Victory</option>
                  </select>
                </div>

                {/* Categories */}
                <div>
                  <span className="text-[10px] font-bold text-slate-455 block mb-1 uppercase tracking-wider">Course/Sector</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="text-xs p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-705"
                  >
                    <option value="all">📚 All Sectors</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Create Task action trigger */}
              <button
                onClick={() => setShowNewTaskForm(!showNewTaskForm)}
                className="w-full md:w-auto bg-green-600 hover:bg-green-500 text-white font-bold font-display px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-transform hover:-translate-y-0.5"
              >
                <PlusCircle className="w-4 h-4" />
                Add Proactive Deadline
              </button>

            </div>

            {/* Task Add Form Overlay / Section */}
            {showNewTaskForm && (
              <form onSubmit={handleCreateTask} className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
                <h3 className="text-sm font-bold font-display uppercase tracking-widest text-slate-900 dark:text-white">New Submission Target Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">Task Name / Deliverable</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Copy predictive parser code sample"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">Critical Deadline Date</label>
                    <input
                      type="date"
                      value={newTaskDeadline}
                      onChange={(e) => setNewTaskDeadline(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Brief context / why we delay</label>
                  <textarea
                    placeholder="e.g. Siddhesh is group lead but not responsive, Sharma Sir will not accept delay."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="w-full text-xs p-2.5 min-h-[60px] bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-650 block mb-1">Eisenhower Matrix Segment</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                      className="w-full text-xs p-2.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 rounded-xl"
                    >
                      <option value="q1">🔥 Q1: Urgent & Important</option>
                      <option value="q2">💡 Q2: Long-Term Growth / Vital</option>
                      <option value="q3">⚡ Q3: Quick/Urgent but less crucial</option>
                      <option value="q4">☕ Q4: Low importance / Delegate</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-650 block mb-1">Energy Required</label>
                    <select
                      value={newTaskEnergy}
                      onChange={(e) => setNewTaskEnergy(e.target.value as any)}
                      className="w-full text-xs p-2.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 rounded-xl"
                    >
                      <option value="high">⚡ High Focus (Mental calculations/proofs)</option>
                      <option value="medium">💪 Medium Focus (Standard copy coding/recitations)</option>
                      <option value="low">☕ Low Effort Victory (Simple form, update calendars)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-655 block mb-1">Category / Topic</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 rounded-xl"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formError && <p className="text-xs text-red-500 font-medium">{formError}</p>}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTaskForm(false)}
                    className="text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 px-4 py-2 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-display px-4 py-2 rounded-xl text-xs cursor-pointer"
                  >
                    Save Proactive Task
                  </button>
                </div>
              </form>
            )}

            {/* Split Screen Dashboard: list (left 5 cols) + focus check detail panel (right 7 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: List representation */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-extrabold text-slate-450 uppercase tracking-widest block">Active Tasks ({filteredTasks.length})</span>
                  <span className="text-[10px] text-slate-400">Click any card to select details</span>
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200/90 dark:border-slate-800 p-12 text-center rounded-2xl">
                    <CheckCircle2 className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                    <h3 className="text-xs font-bold font-display text-slate-600 dark:text-slate-400 mb-1">Clear Deadline Slate!</h3>
                    <p className="text-[11px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                      No tasks matched the filters. Go add a custom task or reset matrix parameters to find your goals.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                    {filteredTasks.map((task) => {
                      const pri = getPriorityInfo(task.priority);
                      const en = getEnergyLevelInfo(task.energyRequired);
                      const isSelected = selectedTask?.id === task.id;
                      
                      // Highlight low effort if diagnosed and user is low energy
                      const isLowEnergyNudge = userVibe.energyScore <= 5 && task.energyRequired === "low";

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? "bg-white dark:bg-slate-800 border-indigo-650 dark:border-indigo-500 shadow-md scale-[1.01]"
                              : "bg-white dark:bg-slate-900/60 border-slate-200 hover:border-slate-350 dark:border-slate-850 hover:bg-white"
                          } ${isLowEnergyNudge ? "ring-2 ring-emerald-500/30 ring-offset-2 dark:ring-offset-slate-950" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2.5 mb-1.5">
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/80 font-bold px-1.5 py-0.5 rounded">
                              {task.category}
                            </span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-405 shrink-0" />
                              <span className="text-[10px] text-slate-450">{task.deadline}</span>
                            </div>
                          </div>

                          <h3 className={`text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white line-clamp-1 ${task.status === "done" ? "line-through opacity-55" : ""}`}>
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-450 line-clamp-1 mt-0.5 font-mono">
                              {task.description}
                            </p>
                          )}

                          {/* Horizontal Pills info */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${pri.color}`}>
                              {pri.label.slice(0, 11)}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase flex items-center gap-1 ${en.style}`}>
                              <span>{en.icon}</span>
                              <span>{en.label.slice(0, 11)}</span>
                            </span>
                            
                            {/* Low effort victory badge */}
                            {isLowEnergyNudge && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500 text-white font-extrabold rounded-md uppercase animate-pulse">
                                Low Energy Victory! ☕
                              </span>
                            )}

                            {/* Completed step fractional count */}
                            <div className="ml-auto text-[9px] font-bold text-slate-500 flex items-center gap-1 font-mono">
                              {task.microSteps.length > 0 ? (
                                <>
                                  <span>Checklist:</span>
                                  <span className="bg-slate-150 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                    {task.microSteps.filter(s => s.completed).length}/{task.microSteps.length}
                                  </span>
                                </>
                              ) : (
                                <span className="text-pink-600 dark:text-pink-400 flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0 animate-bounce" /> Split Needed
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Beautiful Interactive Card Progress Bar */}
                          {task.microSteps.length > 0 ? (
                            <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-200/40 dark:border-slate-850">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-350"
                                style={{ width: `${Math.round((task.microSteps.filter(s => s.completed).length / task.microSteps.length) * 100)}%` }}
                              />
                            </div>
                          ) : (
                            <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full h-1.5 overflow-hidden border border-dashed border-indigo-200/40 dark:border-slate-800">
                              <div className="bg-pink-500 h-full rounded-full animate-pulse" style={{ width: `15%` }} />
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Interactive Detail Check Panel (Actively helps COMPLETE tasks) */}
              <div className="lg:col-span-7">
                {!selectedTask ? (
                  <div className="bg-slate-100/50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 min-h-[480px] flex flex-col items-center justify-center text-center p-8">
                    <Target className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold font-display text-slate-700 dark:text-slate-300 mb-1">Focus & Execute Panel</h3>
                    <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                      Select any deadline from the list on the left to deconstruct it into atomic checklist goals, generate quick starter email/code drafts, and claim victory.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-205 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-6">
                    
                    {/* Detail Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950 px-2 py-0.5 rounded">
                            {selectedTask.category}
                          </span>
                          <span className="text-xs text-slate-400">Created {new Date(selectedTask.createdTime).toLocaleDateString()}</span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-slate-905 dark:text-white leading-snug">
                          {selectedTask.title}
                        </h2>
                        {selectedTask.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-105 dark:border-slate-900">
                            Context: "{selectedTask.description}"
                          </p>
                        )}
                      </div>

                      {/* Delete actions */}
                      <button
                        onClick={() => handleDeleteTask(selectedTask.id)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-105 transition-colors cursor-pointer self-end sm:self-start"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Metadata indicators of Priority + Energy */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Priority quadrant */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">Matrix Quadrant</span>
                          <span className="text-xs font-semibold text-slate-805">
                            {getPriorityInfo(selectedTask.priority).label}
                          </span>
                        </div>
                        <Target className="w-4 h-4 text-indigo-500 shrink-0" />
                      </div>

                      {/* Focus energy */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">Your Focus Level Match</span>
                          <span className="text-xs font-semibold text-slate-805">
                            {getEnergyLevelInfo(selectedTask.energyRequired).label}
                          </span>
                        </div>
                        <span className="text-lg">{getEnergyLevelInfo(selectedTask.energyRequired).icon}</span>
                      </div>

                    </div>

                    {/* Predictive Insight Box */}
                    <div className="p-3.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/25 dark:border-indigo-500/30 rounded-2xl flex items-center gap-3">
                      <span className="text-xl animate-pulse">🔮</span>
                      <div>
                        <span className="text-[10px] text-indigo-400 dark:text-indigo-300 block uppercase font-bold tracking-widest leading-none mb-1">VibeGuard AI Predictive Insight</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          Based on your current <span className="font-bold text-indigo-600 dark:text-indigo-400">{userVibe.mood} Vibe</span> and previous sprint completion rates, you are <span className="font-bold text-emerald-500 underline decoration-dashed">likely to complete this task in {selectedTask.priority === "q1" ? "2.5" : selectedTask.priority === "q2" ? "1.8" : selectedTask.microSteps.length > 3 ? "2.0" : "0.8"} hours</span>.
                        </p>
                      </div>
                    </div>

                    {/* Interactive Atomic Micro-Steps Checklist */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                          <CheckSquare className="w-4.5 h-4.5 text-indigo-500" />
                          Atomic Action Checklist
                        </h3>

                        {/* Quick AI deconstruction button */}
                        <button
                          type="button"
                          disabled={isDeconstructing}
                          onClick={() => handleAIDeconstructTask(selectedTask)}
                          className="text-xs text-indigo-650 hover:text-indigo-500 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border border-indigo-200/30 cursor-pointer"
                        >
                          {isDeconstructing ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                              Deconstructing to bits...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                              Get AI Deconstruct Breakdown
                            </>
                          )}
                        </button>
                      </div>

                      {decError && <p className="text-xs text-red-500 italic mt-1">{decError}</p>}

                      {selectedTask.microSteps.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-850 text-center text-xs text-slate-500 space-y-3">
                          <p>Bhai, this is too generic! Complete tasks with ease by breaking them into manageable atomic steps first.</p>
                          <button
                            type="button"
                            onClick={() => handleAIDeconstructTask(selectedTask)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-[11px] uppercase tracking-wide cursor-pointer text-center mx-auto block hover:scale-105 transition-all w-fit"
                          >
                            🚀 Autogenerate Steps with Planner Bhai
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {selectedTask.microSteps.map((step) => (
                            <div
                              key={step.id}
                              onClick={() => handleToggleStep(selectedTask.id, step.id)}
                              className={`p-3 rounded-xl border flex items-start gap-3 text-left transition-colors cursor-pointer ${
                                step.completed
                                  ? "bg-slate-50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 opacity-60"
                                  : "bg-white dark:bg-slate-850/50 border-slate-200 hover:bg-slate-50 dark:border-slate-800"
                              }`}
                            >
                              {step.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-500 shrink-0 mt-0.5" />
                              )}
                              <div className="space-y-0.5 w-full">
                                <p className={`text-xs sm:text-sm font-semibold ${step.completed ? "line-through text-slate-400" : "text-slate-800 dark:text-white"}`}>
                                  {step.text}
                                </p>
                                {step.helperText && (
                                  <p className="text-[10px] text-indigo-500 italic font-mono leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/20 p-1.5 rounded border border-indigo-100/30">
                                    💡 TIP: {step.helperText}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Executor Draft Section (Don't start on blank pages) */}
                    <div className="bg-indigo-50/40 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 p-4 space-y-4">
                      
                      {/* Section Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-black tracking-widest text-indigo-700 dark:text-indigo-400 block">
                            ⚡ Executor Agent Content Synth
                          </span>
                          <span className="text-[10px] text-slate-500 block leading-tight">
                            Generates complete copy-paste files on-demand for "{selectedTask.title}"
                          </span>
                        </div>
                        
                        {/* Status label / Quick action */}
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Ready to Write
                        </span>
                      </div>

                      {/* Immediate custom action pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCustomExecutorGenerate("sql_schema")}
                          disabled={isCustomGenerating}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all border border-indigo-700 hover:scale-[1.02]"
                        >
                          💾 Generate Full Schema
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCustomExecutorGenerate("general", "write professional sample code with comments")}
                          disabled={isCustomGenerating}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold py-1.5 px-1.5 text-slate-800 dark:text-slate-100 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-200 dark:border-slate-700 hover:scale-[1.02]"
                        >
                          💻 Write Sample Code
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCustomExecutorGenerate("pdf_outline")}
                          disabled={isCustomGenerating}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold py-1.5 px-1.5 text-slate-800 dark:text-slate-100 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-200 dark:border-slate-700 hover:scale-[1.02]"
                        >
                          📄 Create PDF Outline
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAtomicActive(true);
                            setAtomicSprintTask(selectedTask);
                            setAtomicPlaying(true);
                            speakMessage(`Macha mode activated! Focus sprint started for ${selectedTask.title}. Let's do this!`);
                          }}
                          className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-[10px] font-bold py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all border border-amber-600 hover:scale-[1.02]"
                        >
                          🔥 Start Micro Task
                        </button>
                      </div>

                      {/* Custom prompt text box section */}
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={customGeneratorUserPrompt}
                          onChange={(e) => setCustomGeneratorUserPrompt(e.target.value)}
                          placeholder="Or type custom request (e.g. 'add user class', 'Sharma sir apology')"
                          className="w-full text-[11px] p-2 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-150 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customGeneratorUserPrompt.trim()) {
                              handleCustomExecutorGenerate("general", customGeneratorUserPrompt);
                              setCustomGeneratorUserPrompt("");
                            }
                          }}
                          disabled={isCustomGenerating || !customGeneratorUserPrompt.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2 px-3 rounded-xl text-[10px] shrink-0 cursor-pointer transition-transform active:scale-95 text-center"
                        >
                          Gen ✨
                        </button>
                      </div>

                      {/* Error & Loader state indicators */}
                      {customGenError && (
                        <p className="text-[11px] text-red-500 italic font-medium">{customGenError}</p>
                      )}

                      {isCustomGenerating && (
                        <div className="bg-slate-100 dark:bg-slate-950 rounded-xl p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 animate-pulse space-y-1.5">
                          <p className="text-xs font-semibold text-slate-750">⚡ Executor Agent is typing custom content code...</p>
                          <p className="text-[10px] text-indigo-505 italic">"Planner Bhai says: tension mat lo, system is synthesizing optimal solutions!"</p>
                        </div>
                      )}

                      {/* Render custom output OR standard draft content if present */}
                      {(customGenOutput || selectedTask.draftContent) && !isCustomGenerating && (
                        <div className="space-y-3 pt-1">
                          
                          {/* Explanation of layout */}
                          {customGenOutput?.explanation && (
                            <div className="bg-amber-50/55 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100/40 text-[11px] text-amber-900 dark:text-amber-300 italic font-mono leading-relaxed">
                              💡 {customGenOutput.explanation}
                            </div>
                          )}

                          <div className="relative">
                            <pre className="text-[11px] p-3 w-full bg-slate-900 border border-slate-800 text-emerald-400 rounded-xl overflow-x-auto font-mono max-h-[190px] leading-relaxed select-all whitespace-pre-wrap break-all">
                              {customGenOutput?.content || selectedTask.draftContent}
                            </pre>
                            
                            <button
                              type="button"
                              onClick={() => handleCopyDraft(customGenOutput?.content || selectedTask.draftContent || "")}
                              className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-750 text-white text-[9px] font-bold px-2 py-1 rounded border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {copyFeedback ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5 animate-bounce" />
                                  Copy Draft
                                </>
                              )}
                            </button>
                          </div>

                        </div>
                      )}

                      {!customGenOutput && !selectedTask.draftContent && !isCustomGenerating && (
                        <p className="text-xs text-slate-500 italic text-center py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl">
                          Starter drafts will populate here. Tap "Gen Schema" or "Write Queries" above, and Draft Executor will actively generate actual schema, outline or files!
                        </p>
                      )}

                    </div>

                    {/* Task Progress Bar & Action completion toggle */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">Priority Weight:</span>
                        <select
                          value={selectedTask.priority}
                          onChange={(e) => {
                            updateTaskInState({ ...selectedTask, priority: e.target.value as any });
                          }}
                          className="text-xs p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 rounded-xl text-slate-705"
                        >
                          <option value="q1">Q1 (Urgent/Important)</option>
                          <option value="q2">Q2 (Growth Important)</option>
                          <option value="q3">Q3 (Chore / Delegate)</option>
                          <option value="q4">Q4 (Low value / Postpone)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-600 mr-1">Status:</span>
                        <button
                          onClick={() => {
                            const nextStatus = selectedTask.status === "done" ? "pending" : "done";
                            // If marking done, tick all micro steps true for completeness
                            const mappedSteps = nextStatus === "done"
                              ? selectedTask.microSteps.map(s => ({ ...s, completed: true }))
                              : selectedTask.microSteps;

                            if (nextStatus === "done") {
                              addHoursSaved(1.8);
                              advanceStreak();
                              speakMessage("Mubarak ho! Task complete! Added one point eight hours saved to your streak board.");
                            }

                            updateTaskInState({
                              ...selectedTask,
                              status: nextStatus,
                              microSteps: mappedSteps
                            });
                          }}
                          className={`font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer hover:scale-102 ${
                            selectedTask.status === "done"
                              ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200"
                              : "bg-indigo-600 text-white shadow-xs"
                          }`}
                        >
                          {selectedTask.status === "done" ? "Done & Smashed! 🎉" : "Mark Done"}
                        </button>
                      </div>

                    </div>

                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ========================================= */}
        {/* TAB 2: SPECIALIZED MULTI-AGENT CHAT       */}
        {/* ========================================= */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[580px]">
            
            {/* Left Sidebar: Select specialised agent (4 cols) */}
            <div className="lg:col-span-4 space-y-4 flex flex-col">
              
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold font-display uppercase tracking-widest text-slate-905 dark:text-white">Active Wingman Agents</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
                  Toggle between 4 safety and acceleration advisors instantly. We automatically feed your live Task Board context into the conversations to keep suggestions strictly context-aware.
                </p>
              </div>

              {/* Agents picker list */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] lg:max-h-none">
                {WINGMAN_AGENTS.map((agent) => {
                  const isSelected = activeAgentId === agent.id;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setActiveAgentId(agent.id)}
                      className={`p-4 rounded-3xl border border-slate-200 text-left transition-all cursor-pointer flex gap-4 ${
                        isSelected
                          ? "bg-white dark:bg-slate-800 border-indigo-650 dark:border-indigo-500 ring-2 ring-indigo-500/10 shadow-md scale-[1.01]"
                          : "bg-white dark:bg-slate-900/60 border-slate-200 hover:border-slate-350 dark:border-slate-850 hover:bg-white"
                      }`}
                    >
                      <div className="text-3xl p-1 bg-slate-50 dark:bg-slate-950 rounded-xl w-14 h-14 flex items-center justify-center shrink-0 border border-slate-205">
                        {agent.avatar}
                      </div>

                      <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-905 dark:text-white">
                            {agent.name}
                          </h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${agent.accentColor}`}>
                            {agent.characterPill}
                          </span>
                        </div>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold tracking-tight">
                          {agent.tagline}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed line-clamp-2">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right Side: Conversation Panel (8 cols) */}
            <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden items-stretch justify-between min-h-[500px]">
              
              {/* Header inside chat */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl w-10 h-10 bg-slate-50 dark:bg-slate-955 border border-slate-200 rounded-xl flex items-center justify-center">
                    {activeAgent.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold font-display text-xs sm:text-sm text-slate-905 dark:text-white">
                        {activeAgent.name} Status Lounge
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p className="text-[10px] text-slate-450">Active on-the-go chat, voice synthesis un-muted.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">HISTORY STATUS:</span>
                  <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                    {activeAgentHistory.length} Message turns
                  </span>
                </div>
              </div>

              {/* Message scroll container */}
              <div className="p-4 sm:p-5 flex-1 min-h-[300px] max-h-[460px] overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
                {activeAgentHistory.map((msg, index) => {
                  const isUser = msg.role === "user";
                  return (
                    <div key={msg.id || index} className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-2.5`}>
                      
                      {!isUser && (
                        <div className="text-lg w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {activeAgent.avatar}
                        </div>
                      )}

                      <div className="flex flex-col max-w-[85%] sm:max-w-[75%] space-y-1.5">
                        
                        {/* Text Speech Bubble */}
                        <div className={`p-3.5 rounded-2xl border text-sm ${
                          isUser
                            ? "bg-indigo-600 text-white border-indigo-700 rounded-tr-none shadow-xs"
                            : "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-805 rounded-tl-none shadow-2xs"
                        }`}>
                          {renderMessageContent(msg.text)}
                        </div>

                        {/* Speech buttons for model responses */}
                        {!isUser && (
                          <div className="flex items-center gap-2 pl-1.5">
                            <span className="text-[9px] text-slate-400 font-medium">Model Reply | {msg.timestamp}</span>
                            <button
                              onClick={() => speakMessage(msg.text)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-500 font-bold flex items-center gap-0.5"
                              title="Hear voice synthesis reading"
                            >
                              🔊 Read Aloud
                            </button>
                            <button
                              onClick={() => copyTextToClipboard(msg.text, `chat-${index}`)}
                              className="text-[10px] text-slate-500 hover:text-slate-700 font-bold flex items-center gap-0.5 ml-2"
                            >
                              {copiedRewriteKey === `chat-${index}` ? "Copied!" : "📋 Copy"}
                            </button>
                          </div>
                        )}

                        {/* Direct ONE-CLICK Task Suggestion upgrade interface */}
                        {!isUser && msg.extractedTaskSuggestion && (
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 p-3 rounded-2xl space-y-2 mt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-500 animate-spin" />
                                Proactive Task Proposed By Wingman!
                              </span>
                              <span className="text-[9px] bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-slate-900 dark:text-emerald-400 px-2 py-0.5 rounded font-black font-mono">
                                {msg.extractedTaskSuggestion.priority.toUpperCase()}
                              </span>
                            </div>

                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {msg.extractedTaskSuggestion.title}
                            </p>
                            <p className="text-[11px] text-slate-550 leading-relaxed font-mono">
                              "{msg.extractedTaskSuggestion.description}"
                            </p>

                            <div className="space-y-1">
                              <span className="text-[9px] font-black tracking-widest uppercase block text-slate-400">Micro-steps breakdown:</span>
                              {msg.extractedTaskSuggestion.microSteps.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[11px] font-mono text-slate-700 dark:text-slate-350">
                                  <span>🚀</span>
                                  <span>{s}</span>
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={() => addExtractedTask(msg.extractedTaskSuggestion!)}
                              className="w-full bg-emerald-600 hover:bg-emerald-505 dark:bg-emerald-500 text-white font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer mt-1 hover:scale-101 transition-transform"
                            >
                              <PlusCircle className="w-4.5 h-4.5" />
                              Add This To My Target Board
                            </button>
                          </div>
                        )}

                      </div>

                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Preset Action Pill recommendations */}
              {activeAgentHistory.length > 0 && activeAgentHistory[activeAgentHistory.length - 1].suggestedActions && (
                <div className="px-5 py-2.5 border-t border-slate-105 bg-slate-55/60 dark:bg-slate-950/80 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 select-none">Bhai, click to suggest:</span>
                  <div className="flex gap-2">
                    {activeAgentHistory[activeAgentHistory.length - 1].suggestedActions?.map((suggested, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChatMessage(suggested)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900 text-[11px] px-3.5 py-1.5 rounded-full font-bold shrink-0 transition-transform hover:-translate-y-0.5 cursor-pointer"
                      >
                        {suggested} →
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Form Entry */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/30">
                {chatError && (
                  <p className="text-xs text-red-500 font-bold text-center italic">{chatError}</p>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={chatInputs[activeAgentId]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setChatInputs(prev => ({
                          ...prev,
                          [activeAgentId]: val
                        }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendChatMessage();
                      }}
                      placeholder={`Message ${activeAgent.name}...`}
                      className="w-full text-xs sm:text-sm p-3.5 pr-14 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-150 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 font-sans"
                    />

                    {/* Microphone Dictate inside input */}
                    {isSSTSupported && (
                      <button
                        onClick={() => toggleListening("chat")}
                        className={`absolute right-3.5 top-2.5 p-2 rounded-xl transition-all ${
                          isListening 
                            ? "bg-red-500 text-white animate-pulse" 
                            : "bg-slate-200 dark:bg-slate-850 text-slate-600 dark:text-slate-350 hover:bg-slate-300"
                        }`}
                        title="Voice dictation input"
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleSendChatMessage()}
                    disabled={isChatting || !chatInputs[activeAgentId].trim()}
                    className={`p-3.5 rounded-2xl flex items-center justify-center text-white cursor-pointer hover:scale-102 transition-all shrink-0 ${
                      !chatInputs[activeAgentId].trim() 
                        ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed" 
                        : "bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500"
                    }`}
                  >
                    {isChatting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-450 px-1 pt-0.5">
                  <span className="font-medium">Active Agent: <strong className="text-slate-700 dark:text-slate-300">{activeAgent.name}</strong></span>
                  <span className="font-semibold underline">Supports complete English & Hindi speech dictation.</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================= */}
        {/* TAB 3: EDUCATION CODE BOOK (PSYCHOLOGY)   */}
        {/* ========================================= */}
        {activeTab === "education" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
            
            <div className="pb-4 border-b border-slate-100 dark:border-slate-850">
              <div className="flex items-center gap-2 mb-1.5">
                <Target className="w-6 h-6 text-indigo-600" />
                <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white uppercase tracking-wider">The Vibe-Productivity Codex</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Traditional task lists ignore human emotion and physical energy reserves. VibeGuard AI unites psychological models with active AI generation so you never start with blank pages. Here is our secret sauce.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {EDUCATION_PILLS.map((pill, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg w-8 h-8 flex items-center justify-center">
                      0{idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-905 dark:text-white font-display">
                      {pill.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                    {pill.concept}
                  </p>

                  <div className="pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-indigo-700 dark:text-indigo-400 font-bold leading-normal">
                    💡 ACTION TIP: {pill.tip}
                  </div>
                </div>
              ))}
            </div>

            {/* Core motivation disclaimer / Indian life highlights */}
            <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 p-4 rounded-2xl space-y-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-500" />
                Proactive Indian Student/Work Context:
              </h4>
              <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                Whether you're prepping for Placement Aptitude tests on LeetCode, kopi-ing Sharma Sir's Compiler lab file experiments at 2 AM, or chasing free-riders like Siddhesh on group project slides — our system automatically drafts standard communication templates or boilerplate scripts. No more overthinking or delays. Let's make it happen. Just click "Get AI Deconstruct breakdown" to start!
              </p>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER BRUTALIST ACCENTS */}
      <footer className="mt-12 py-8 bg-white border-t border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-center text-xs text-slate-400 space-y-2 select-none">
        <p className="font-bold uppercase tracking-widest text-[10px] text-indigo-500">VIBEGUARD AI PRODUCTIVITY ENGINE • v4.2 PRO</p>
        <p className="px-4 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          VibeGuard AI — Built by <span className="font-semibold text-indigo-600 dark:text-indigo-400">Harsh Parmar</span> | © 2026 Harsh Parmar. All rights reserved. | Built for <span className="font-semibold text-emerald-500">Vibe2Ship 2026 (Coding Ninjas x Google for Developers)</span>
        </p>
        <p className="text-[10px]">Current Time: {new Date().toLocaleDateString()} {userVibe.timestamp}</p>
      </footer>

      {/* FLOATING ACTION SPOTLIGHT: VOICE COMMAND & START ATOMIC ACTION BUTTONS */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
        {/* Voice Command Button */}
        <button
          id="btn-floating-voice"
          onClick={() => {
            toggleListening("direct_vibe");
            speakMessage("Bhai, I am listening! Voice command active. Tell me what is on your mind!");
          }}
          className={`font-extrabold sm:px-5 sm:py-3 px-4 py-2.5 rounded-full flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group text-xs sm:text-sm border border-slate-700/50 ${
            isListening 
              ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse" 
              : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
          title="Speak a voice command"
        >
          <div className="relative">
            {isListening && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
            <Mic className="w-4 h-4 text-emerald-400 group-hover:animate-bounce" />
          </div>
          <span className="tracking-wider uppercase font-display text-[10px] sm:text-xs">
            {isListening ? "Listening... 🎙️" : "Voice Command 🎙️"}
          </span>
        </button>

        {/* Start Atomic Action Button */}
        <button
          id="btn-floating-atomic"
          onClick={() => {
            setIsAtomicActive(true);
            // Auto bootstrap selected task or first pending task if not set
            if (!atomicSprintTask) {
              const activeTask = selectedTask || tasks.find(t => t.status !== "done") || (tasks.length > 0 ? tasks[0] : null);
              setAtomicSprintTask(activeTask);
            }
          }}
          className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-extrabold sm:px-5 sm:py-3.5 px-4 py-3 rounded-full flex items-center gap-2 shadow-xl hover:scale-105 transition-transform duration-300 animate-bounce cursor-pointer group text-xs sm:text-sm"
          title="Kickstart Focus mode with Planner Bhai"
        >
          <Sparkle className="w-5 h-5 text-white fill-white animate-spin group-hover:scale-110" />
          <span className="tracking-wider uppercase text-[10px] sm:text-xs">Start Atomic Action ⚡</span>
        </button>
      </div>

      {/* IMMERSIVE FOCUS MODE / SPRINT OVERLAY MODAL */}
      {isAtomicActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl relative text-white space-y-6 overflow-y-auto max-h-[92vh]">
            
            {/* Modal Exit */}
            <button
              onClick={() => {
                setIsAtomicActive(false);
                setAtomicPlaying(false);
                setShowNapReminder(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Identity */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white animate-pulse">
                <Sparkle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold font-display uppercase tracking-widest text-amber-400">
                  ⚡ VibeGuard Focused Sprint
                </h3>
                <p className="text-[11px] text-slate-400">
                  Planner Bhai Focus Module: Zero distractions, absolute execution!
                </p>
              </div>
            </div>

            {/* Task selector and detail inside Sprint */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block">Currently Sprinting On:</label>
              <select
                value={atomicSprintTask?.id || ""}
                onChange={(e) => {
                  const t = tasks.find(item => item.id === e.target.value);
                  if (t) setAtomicSprintTask(t);
                }}
                className="w-full text-xs p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:ring-1 focus:ring-amber-500"
              >
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                ))}
              </select>
              {atomicSprintTask?.description && (
                <p className="text-[11px] text-slate-400 italic font-mono leading-normal px-1">
                  💡 Context Alert: "{atomicSprintTask.description}"
                </p>
              )}
            </div>

            {/* POWER NAP REMINDER WARRIOR CARD */}
            {showNapReminder ? (
              <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 p-5 rounded-2xl space-y-4 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">🛌</span>
                  <div>
                    <h4 className="text-sm font-extrabold text-indigo-400 uppercase tracking-widest">
                       Hostel Power Nap Mode Activated!
                    </h4>
                    <span className="text-[10px] text-slate-400 block font-medium">For last-minute legendary warriors</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 text-xs text-slate-300 leading-relaxed font-mono space-y-2">
                  <p>
                    <strong>Plan of Action:</strong> "Bhai, direct ground reality advice:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                    <li>Set an alarm on your phone for <strong>20 Minutes</strong>.</li>
                    <li>Drink half-glass cool water right now to trigger metabolic awakening.</li>
                    <li>Lie down on your standard bunk bed or chair, close eyes, relax completely.</li>
                    <li>We paused the countdown. No heavy submission thoughts allowed!</li>
                  </ul>
                  <p className="text-amber-500 italic mt-2 text-[11px] font-bold">
                    "Sharma Sir accepts your brain refresh; overworking is suicide!"
                  </p>
                </div>

                <div className="flex gap-2 pt-1 justify-end">
                  <button
                    onClick={() => {
                      setShowNapReminder(false);
                      setAtomicPlaying(true); // resume countdown gracefully
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wide cursor-pointer transition-colors"
                  >
                    ⏰ Wakeup & Resume Action!
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE COUNTDOWN CONTROLS */
              <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
                
                {/* Huge Countdown Display */}
                <div className="space-y-1">
                  <span className="text-5xl font-black font-mono tracking-wider text-amber-500 dark:text-amber-400 drop-shadow-md">
                    {formatTime(atomicTimeSeconds)}
                  </span>
                  <div className="flex items-center justify-center gap-1.5 text-slate-405">
                    <span className="w-2 h-2 rounded-full bg-emerald-505 animate-ping" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                      {atomicPlaying ? "STRICT COUNTDOWN BURNING" : "PAUSED"}
                    </span>
                  </div>
                </div>

                {/* Control Action Buttons Row */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAtomicPlaying(!atomicPlaying)}
                    className={`p-3 rounded-full flex items-center justify-center transition-all ${
                      atomicPlaying 
                        ? "bg-amber-500 text-slate-950 hover:bg-amber-400" 
                        : "bg-indigo-600 text-white hover:bg-indigo-500"
                    } cursor-pointer hover:scale-105`}
                    title={atomicPlaying ? "Pause focus timer" : "Play focus timer"}
                  >
                    {atomicPlaying ? <Pause className="w-5 h-5 fill-slate-950 text-slate-950" /> : <Play className="w-5 h-5 fill-white text-white" />}
                  </button>
                  <button
                    onClick={() => setAtomicTimeSeconds(1500)} // Reset to 25 mins
                    className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer hover:scale-105"
                    title="Reset timer"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  
                  {/* Power Nap Remind Trigger */}
                  <button
                    onClick={() => {
                      setAtomicPlaying(false);
                      setShowNapReminder(true);
                      speakMessage("Chalo bhai, set alarm for twenty minutes, take a glass of water, sleep tightly. Reboot focus later!");
                    }}
                    className="bg-indigo-950 text-indigo-400 border border-indigo-800 hover:bg-indigo-900 text-xs font-bold py-2 px-3.5 rounded-full flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
                  >
                    🛌 Power Nap Reminder
                  </button>
                </div>

                {/* Dynamic Hostel Metaphor/One-Liner */}
                <span className="text-xs text-indigo-300 italic font-medium px-4 block">
                  {atomicPlaying 
                    ? `"${slangNudge}"` 
                    : `"Tension nahi leni, step back, re-center, and begin. Chai break targets await!"`}
                </span>

              </div>
            )}

            {/* MICRO-STEPS SYNC CHECKLIST INSIDE SPRINT MODE */}
            {atomicSprintTask && (
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">
                  🎯 Checklist Completed Right Inside focus sprint:
                </span>
                
                {atomicSprintTask.microSteps.length === 0 ? (
                  <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-4 text-center text-xs text-slate-505">
                    <p>No micro-steps created yet. Run Planner Bhai breakdown on main workspace tab first!</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {atomicSprintTask.microSteps.map((step) => (
                      <div
                        key={step.id}
                        onClick={() => {
                          handleToggleStep(atomicSprintTask.id, step.id);
                          // Keep local instance in sync
                          setAtomicSprintTask({
                            ...atomicSprintTask,
                            microSteps: atomicSprintTask.microSteps.map(s => s.id === step.id ? { ...s, completed: !s.completed } : s)
                          });
                        }}
                        className={`p-2.5 rounded-xl border border-slate-800 text-left transition-colors cursor-pointer flex items-center gap-3 bg-slate-950/40 hover:bg-slate-950/80 ${
                          step.completed ? "opacity-55" : ""
                        }`}
                      >
                        <div className="shrink-0">
                          {step.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <div className="w-4 h-4 rounded border border-slate-600" />
                          )}
                        </div>
                        <div className="w-full">
                          <p className={`text-xs font-bold leading-tight ${step.completed ? "line-through text-slate-505" : "text-slate-100"}`}>
                            {step.text}
                          </p>
                          {step.helperText && !step.completed && (
                            <p className="text-[9px] text-amber-400 italic">💡 {step.helperText}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* GORGEOUS ABOUT / HACKATHON CREDITS MODAL */}
      {showAbout && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
            <button
              onClick={() => setShowAbout(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-indigo-600 dark:bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                <Shield className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white font-display">VibeGuard AI</h3>
              <span className="inline-block text-[11px] uppercase font-bold tracking-widest bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full border border-emerald-900">
                Official Hackathon Entry
              </span>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Creator / Solo Dev:</span>
                  <span className="font-extrabold text-indigo-400">Harsh Parmar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Built For:</span>
                  <span className="font-extrabold text-emerald-400 text-right">Vibe2Ship 2026 Hackathon</span>
                </div>
                <div className="flex justify-between text-right">
                  <span className="text-slate-500 font-medium text-left">Organizers:</span>
                  <span className="font-semibold text-slate-200">Coding Ninjas × Google for Developers</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Project Description</span>
                <p className="leading-relaxed text-slate-400">
                  VibeGuard AI is an advanced, voice-enabled, agentic productivity assistant designed specifically for developers, students, and professionals dealing with burnout and tight deadlines. It dynamically tunes schedules to the user's energy vibes using server-side Gemini 3.5 intelligence.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAbout(false)}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
            >
              Great! Let's Go 🚀
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
