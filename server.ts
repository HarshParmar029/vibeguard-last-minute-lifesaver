import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON payloads
app.use(express.json());

// Lazy-loaded Gemini Client to prevent crash on startup if API key is missing
function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not configured. Please use the Secrets panel in the AI Studio UI to set it."
    );
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Robust retry wrapper with exponential backoff & fallback models
async function generateContentWithRetry(
  ai: any,
  params: {
    model: string;
    contents: any;
    config?: any;
  }
): Promise<any> {
  const maxRetries = 3;
  let delay = 1000;
  let lastError: any = null;

  // Let's try multiple models sequentially if there is high demand/503 errors
  const modelsToTry = [params.model];
  if (params.model === "gemini-3.5-flash") {
    // gemini-3.1-flash-lite is an extremely stable and cost-effective alternative
    modelsToTry.push("gemini-3.1-flash-lite");
  }

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Attempt ${attempt} utilizing model: ${modelName}`);
        const currentParams = {
          ...params,
          model: modelName
        };
        const response = await ai.models.generateContent(currentParams);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err.message || err);
        console.warn(`[Gemini API] Attempt ${attempt} failed with error: ${errMsg}`);

        // Check for 503, rate limits, or typical demand spike errors
        const isRetriable = errMsg.includes("503") || 
                            errMsg.includes("UNAVAILABLE") || 
                            errMsg.includes("429") || 
                            errMsg.includes("RESOURCE_EXHAUSTED") || 
                            errMsg.includes("high demand") || 
                            errMsg.includes("temporary");

        if (isRetriable && attempt < maxRetries) {
          console.log(`[Gemini API] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5; // Smooth exponential backoff
        } else {
          // Break inner loop to switch model or propagate failure
          break;
        }
      }
    }
  }

  throw lastError || new Error("Gemini API call failed after multiple attempts.");
}

// -------------------------------------------------------------
// 1. ENDPOINT: Proactive Vibe Diagnostic (/api/vibe/diagnose)
// -------------------------------------------------------------
app.post("/api/vibe/diagnose", async (req, res): Promise<any> => {
  try {
    const { message, currentActivity } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message text is required for diagnostics." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are the Vibe Monitor agent inside VibeGuard AI, a friendly, motivational productivity wingman.
Your job is to analyze the user's emotional state, procrastination levels, burnout triggers, and fatigue level from what they typed.
Identify if they are in high, medium, or low energy. 
Provide professional advice/strategy adjustments utilizing Indian college/student/work life metaphors if relevant (e.g. 'cutting chai break', 'semester exam backup', 'viva preparation', 'group project partners').
Suggest 2 custom immediate actionable tasks or low-energy victories to rebuild momentum.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        mood: { 
          type: Type.STRING, 
          description: "One or two words capturing their current energy mood, e.g., 'Burnt Out', 'Procrastinating', 'Panicked', 'Excited', 'Lazy', 'Tired'" 
        },
        energyScore: { 
          type: Type.INTEGER, 
          description: "An estimated score from 1 (completely exhausted/sleeping) to 10 (fully pumped/hyperactive)" 
        },
        vibeAnalysisText: { 
          type: Type.STRING, 
          description: "A friendly, conversational diagnosis sentence acknowledging their feeling and giving an direct, step-by-step pick-me-up." 
        },
        strategyAdjustment: { 
          type: Type.STRING, 
          description: "A clear practical adjustment strategy to rescue their day, e.g. 'Postpone high-effort DSA sheet to morning. Finish 2 quick forms first.'" 
        },
        lowEnergyVictories: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "2 simple, 5-minute atomic sub-tasks they can do right now with zero friction to get started."
        }
      },
      required: ["mood", "energyScore", "vibeAnalysisText", "strategyAdjustment", "lowEnergyVictories"]
    };

    const userPrompt = `USER MESSAGE: "${message}"\nCURRENT ACTIVITY CONTEXT: "${currentActivity || "None specified"}"`;

    const result = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.3
      }
    });

    const parsedData = JSON.parse(result.text || "{}");
    res.json(parsedData);

  } catch (error: any) {
    console.error("Vibe diagnose error details:", error);
    const errorMsg = error.message || "Unknown error";
    let warning = "Bhai, look like Google servers are thoda high load right now.";
    if (errorMsg.includes("GEMINI_API_KEY")) {
      warning = "Bhai, clear issue configured validation: GEMINI_API_KEY settings list is missing.";
    }

    // Friendly offline Indian English fallback response matching expected structure
    res.json({
      mood: "Thoda Tired Vibe",
      energyScore: 4,
      vibeAnalysisText: `Arey yaar, system is slightly offline or busy! (${warning}) Master wingman and Vibe Monitor left you a prompt helper. Tension nahi leni, we will still push forward to finish that task!`,
      strategyAdjustment: "Postpone tedious long hours of theory. Take a quick local cutting chai break, then finish 2 tiny tasks under 5 minutes.",
      lowEnergyVictories: [
        "Drink a tall glass of cool water right now",
        "Open your active document / assignment tab to clear blank page block"
      ]
    });
  }
});

// -------------------------------------------------------------
// 2. ENDPOINT: Task Deconstruction (/api/task/deconstruct)
// -------------------------------------------------------------
app.post("/api/task/deconstruct", async (req, res): Promise<any> => {
  const { title, description, category, priority, currentEnergy } = req.body;
  try {
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "Task title is required for breakdown." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are Planner Bhai and Draft Executor inside VibeGuard AI.
Create a smart roadmap of 3-5 atomic micro-steps to solve this task.
For at least one micro-step, provide a 'helperText' hint or checklist.
Additionally, write a custom drafted preview or starter code/outline ('draftContent') of what they need to write or code, so they don't have to face a blank page!
Use highly energetic, motivating, student/workplace friendly language (English with light hints of fun Indian slang like 'bhai', 'yaar', 'jugaad').`;

    const userPrompt = `Deconstruct this task and provide a helpful starter template:
Title: "${title}"
Description: "${description || "None provided"}"
Category: "${category || "College"}"
Priority Context: "${priority || "q1"}"
Current energy state: "${currentEnergy || "medium"}"`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        microSteps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "Atomic action-item message (e.g., 'Copy the predictive parsing C++ skeleton from resources')" },
              helperText: { type: Type.STRING, description: "Quick tactical guideline or tip to clear this successfully (e.g., 'Ensure state stack checks if string is exhausted')" }
            },
            required: ["text"]
          }
        },
        suggestedDraft: { 
          type: Type.STRING, 
          description: "An actual boiler-plate script, email outline, cover letter draft, or slide list that acts as the hard-draft of their task" 
        },
        motivationalHook: {
          type: Type.STRING,
          description: "An energetic nudge to get them started right away."
        }
      },
      required: ["microSteps", "suggestedDraft", "motivationalHook"]
    };

    const result = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.4
      }
    });

    const parsedData = JSON.parse(result.text || "{}");
    res.json(parsedData);

  } catch (error: any) {
    console.error("Task deconstruct error details:", error);
    const errorMsg = error.message || "Unknown error";
    let warning = "Planner Bhai is out for some local samosas, but left this awesome blueprint!";
    if (errorMsg.includes("GEMINI_API_KEY")) {
      warning = "Lagta hai, GEMINI_API_KEY verification failed in AI Studio secrets menu.";
    }

    res.json({
      microSteps: [
        { text: "Break this down: Complete the cover structure first.", helperText: "Write just 2-3 brief key sentences." },
        { text: "Set a stopwatch timer for 25 Mins (Pomodoro mode).", helperText: "Turn off notification alerts / keep your phone inside drawer." },
        { text: "Verify references or ask a friend for clarification query.", helperText: "Keep it simple, don't over-engineer it." }
      ],
      suggestedDraft: `// 📝 Jvgaad Draft Blueprint for "${title || "your task"}"\n// Status alert: ${warning}\n\n[Section 1: Initial Hook]\n- Introduce the core problem you're addressing (keep it within 2 lines)\n\n[Section 2: Execution Details]\n- Highlight the 2 major parameters, criteria, or sub-tasks\n\n[Section 3: Summary Conclusion]\n- Final proof checklist (Double check spelling + links)\n`,
      motivationalHook: "Bhai, server side thoda overload hai, but trust me, your personal hustle has no limits! Start completing step 1 now."
    });
  }
});

// -------------------------------------------------------------
// 2.5 ENDPOINT: Executor On-Demand Custom Generator (/api/executor/generate_custom)
// -------------------------------------------------------------
app.post("/api/executor/generate_custom", async (req, res): Promise<any> => {
  const { taskTitle, taskDescription, generationType } = req.body;
  if (!taskTitle) {
    return res.status(400).json({ error: "Task title is required to generate custom sample assets." });
  }

  try {
    const ai = getGeminiClient();

    const systemPromptMessage = `You are the Draft Executor Agent inside VibeGuard AI, a super competent coding and content writing wingman.
Your mission is to generate actually usable, high-quality sample files, schemas, queries, outlines, or email drafts for the user's active task.
Never write placeholders like '// to be filled'. Write real, solid code or content!
Speak with motivating, friendly, slightly desi Indian energy (light friendly words like 'Bhai', 'jugaad', 'bindaas', 'macha').`;

    const userPrompt = `TASK TITLE: "${taskTitle}"
TASK DESCRIPTION: "${taskDescription || "No detailed description provided"}"
GENERATION REQUEST: "${generationType}" (Write high-grade, complete outputs matching this requested type!)

Specifically, generate:
- If generationType is 'sql_schema': Generate a robust PostgreSQL or SQLite CREATE TABLE schema with indexes, types, and constraints.
- If generationType is 'sql_queries': Generate structured INSERT, SELECT, JOIN queries based on the task topic.
- If generationType is 'pdf_outline': Generate a highly detailed chapter/section document outline appropriate for a submission or report export, with sub-categories.
- If generationType is 'email_draft': Generate a complete, polished, and effective email copy (corporate, academic, or informal) with fields.
- If other/general: Generate an action-ready boilerplate template or code block.

Return your response in the requested JSON structure.`;

    const customGenerationSchema = {
      type: Type.OBJECT,
      properties: {
        generatedContent: {
          type: Type.STRING,
          description: "The complete, formatted copy-paste ready code, schema, SQL script, draft, or outline text with comments."
        },
        briefExplanation: {
          type: Type.STRING,
          description: "Friendly, confident short feedback explaining the architectural layout or draft outline highlights in 2-3 sentences max using light Indian slang."
        }
      },
      required: ["generatedContent", "briefExplanation"]
    };

    const result = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPromptMessage,
        responseMimeType: "application/json",
        responseSchema: customGenerationSchema,
        temperature: 0.5
      }
    });

    const parsedOutput = JSON.parse(result.text || "{}");
    res.json(parsedOutput);

  } catch (error: any) {
    console.error("Custom generator error details:", error);
    const errorMsg = error.message || "Unknown error";
    let warning = "Bhai, look like model server is slightly overloaded!";
    if (errorMsg.includes("GEMINI_API_KEY")) {
      warning = "Lagta hai, GEMINI_API_KEY setting check is missing.";
    }

    // Creative fallback generation matching requested type
    let fallbackContent = ``;
    if (generationType === "sql_schema") {
      fallbackContent = `-- 💾 Offline SQL Schema Jugaad for ${taskTitle}\nCREATE TABLE IF NOT EXISTS ${taskTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")} (\n  id SERIAL PRIMARY KEY,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  user_id INT NOT NULL,\n  status VARCHAR(50) DEFAULT 'pending',\n  payload JSONB\n);\n\nCREATE INDEX idx_status ON ${taskTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}(status);\n`;
    } else if (generationType === "sql_queries") {
      fallbackContent = `-- 📝 Practice Queries for ${taskTitle}\nSELECT * FROM ${taskTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")};\n\n-- Find pending statuses\nSELECT status, COUNT(*) \nFROM ${taskTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")} \nGROUP BY status;\n`;
    } else if (generationType === "pdf_outline") {
      fallbackContent = `# 📄 Submission Index outline: ${taskTitle}\n\n1. EXECUTIVE SUMMARY\n   1.1 Problem Statement & Background\n   1.2 Proposed Solutions & Key Scope\n\n2. TECHNICAL ARCHITECTURE\n   2.1 Database relational structure\n   2.2 Business logic workflow diagram\n\n3. EVALUATION MATRIX\n   3.1 Expected execution milestones\n   3.2 Conclusion and next actions\n`;
    } else {
      fallbackContent = `# 📝 starter outline: ${taskTitle}\n\nDear team / prof,\n\nI wanted to share our planned approach for "${taskTitle}"...\n\nThanks and regards,\nLast-minute Hustler\n`;
    }

    res.json({
      generatedContent: fallbackContent,
      briefExplanation: `Arey yaar, internet issue or server down! (${warning}) Master Executor generated this offline starter template directly for you so your workflow doesn't stop. Tension mat lo, implement this copy-paste ready blueprint right now!`
    });
  }
});

// -------------------------------------------------------------
// 3. ENDPOINT: Specialized Multi-Agent Chat (/api/chat)
// -------------------------------------------------------------
app.post("/api/chat", async (req, res): Promise<any> => {
  const { messages, agentId, currentTaskList } = req.body;
  
  // Choose agent info for fallback
  const fallbackAgentName = agentId === "executor" ? "Draft Executor" :
                            agentId === "nudger"   ? "Hustle Nudger" :
                            agentId === "vibe"     ? "Vibe Monitor" : "Planner Bhai";

  try {
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Conversation history array is required." });
    }

    const ai = getGeminiClient();

    // Map each agent prompt
    const agentMap: Record<string, { role: string; instruction: string }> = {
      planner: {
        role: "Planner Bhai",
        instruction: "You are Planner Bhai, the deconstruction god. Ask clarifying questions or pick a task, split it into 3-5 sub-steps, suggest whether it's Q1/Q2/Q3/Q4, and indicate if they can tackle it right now. Think step-by-step. Speak with motivation, confidence, and friendly slang like 'yaar' and 'bhai'."
      },
      executor: {
        role: "Draft Executor",
        instruction: "You are the Draft Executor. Your priority is to actively WRITE content for the user. If they have an assignment, draft code snippets or report outlines. If they need to ping Siddhesh, write the exact WhatsApp DM. If they want to write a placement support mail, write the complete draft. Always provide directly usable content so they do not face blank pages."
      },
      nudger: {
        role: "Hustle Nudger",
        instruction: "You are the Hustle Nudger. You give motivational kicks wrapped in context-aware reminders. Use awesome Indian college metaphors, friendly alerts, and relatable youth jokes. Inspire them to push past laziness, avoid endless scrolling, and clear at least one checklist item. Speak with massive energetic punch!"
      },
      vibe: {
        role: "Vibe Monitor",
        instruction: "You are the Vibe Monitor. Diagnose exhaustion, stress, or excitement. Adjust the user's workload accordingly. If they say 'I am tired/stressed/sleepy', gently suggest postponing high-energy chores, and instead present small atomic easy successes (5-minute tasks) so they maintain positive forward momentum without getting overwhelmed."
      }
    };

    const selectedAgentName = agentMap[agentId]?.role || "Planner Bhai";
    const selectedAgentInstruction = agentMap[agentId]?.instruction || agentMap["planner"].instruction;

    const systemPromptMessage = `You are ${selectedAgentName}, a core advisor inside "VibeGuard AI" — the world's most proactive mobile voice & text productivity wingman.
Your mission is to help the user never miss a deadline and actively COMPLETE tasks!

Core Directives:
1. Always think step-by-step.
2. Be proactive: automatically suggest 2 next actions as clickable pills list.
3. Be friendly, motivating, energetic, slightly fun, and understand Indian college/student/engineer/workplace dynamics (GATE prep, midnight manual copy, bad tea stalls, chais, viva, external exams, hostel life).
4. If the user mentions some task they need to do, proactively try to format it into an actionable task model inside 'extractedTaskSuggestion' so the app UI can automatically offer a one-click button for them to add it to their board!

Your response MUST be wrapped in the provided JSON schema. Ensure your conversation reply is beautiful and formatted with neat Markdown (bullet points, italic emphasis, simple linebreaks) for gorgeous rendering inside the chat speech bubbles.`;

    const chatResponseSchema = {
      type: Type.OBJECT,
      properties: {
        reply: { 
          type: Type.STRING, 
          description: "Conversational, energetic, helpful styled markdown reply answering the user query in the persona of the chosen agent." 
        },
        suggestedActions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Exactly 2 to 3 very brief proactive next steps the user can execute next (e.g. ['Generate Slide Draft', 'Draft Whatsapp Ping', 'Show Q2 long-term tasks'])"
        },
        extractedTaskSuggestion: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Atomic task title" },
            description: { type: Type.STRING, description: "Brief description of the challenge" },
            priority: { type: Type.STRING, description: "Eisenhower: chosen from 'q1', 'q2', 'q3', 'q4'" },
            energyRequired: { type: Type.STRING, description: "Energy required: chosen from 'low', 'medium', 'high'" },
            category: { type: Type.STRING, description: "Proposed category label" },
            microSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 to 4 atomic sub-steps to clear this task completely."
            }
          },
          required: ["title", "description", "priority", "energyRequired", "category", "microSteps"]
        }
      },
      required: ["reply", "suggestedActions"]
    };

    // Grab context of active tasks to make current advice deeply context-aware
    const tasksSummary = currentTaskList && Array.isArray(currentTaskList)
      ? `CURRENT USER DEADLINE BOARD: ${JSON.stringify(currentTaskList.map(t => ({ title: t.title, deadline: t.deadline, status: t.status, priority: t.priority })))}`
      : "No task list loaded yet.";

    const contentsPayload = [
      {
        role: "user",
        parts: [{ text: `Persona Instruction: ${selectedAgentInstruction}\n\nTask Context: ${tasksSummary}\n\nConversational history: ${JSON.stringify(messages.slice(-6))}\n\nProvide response in requested JSON schema.` }]
      }
    ];

    const result = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: contentsPayload,
      config: {
        systemInstruction: systemPromptMessage,
        responseMimeType: "application/json",
        responseSchema: chatResponseSchema,
        temperature: 0.7
      }
    });

    const parsedOutput = JSON.parse(result.text || "{}");
    res.json(parsedOutput);

  } catch (error: any) {
    console.error("Agent chat error details:", error);
    const errorMsg = error.message || "Unknown error";
    
    // Elegant system-down or busy fallback with custom diagnostics
    const isRateLimit = errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("demand");
    let siblingSlang = "Bhai, look like model servers are experiencing high demand right now (hostel mates must be copying viva answers)!";
    if (errorMsg.includes("GEMINI_API_KEY")) {
      siblingSlang = "Bhai, key settings check karo! GEMINI_API_KEY setup in Settings > Secrets is missing or invalid.";
    }

    const fallbackReply = `## 📡 Connection Mode: Active Offline Wingman

${siblingSlang}

**Technical Code:** \`${errorMsg.substring(0, 160)}\`

No worries yaar! Your advisor **${fallbackAgentName}** is here to rescue your momentum regardless. Here is your proactive immediate action checklist:

1. **Take a deep breath and have a tea break**: Re-center focus, cutting chai style.
2. **Setup your keys**: Click **Settings** (top right) to confirm your secret keys.
3. **Execute standard small sub-steps**: Pick your highest priority tasks and do a quick 5-min review.`;

    res.json({
      reply: fallbackReply,
      suggestedActions: ["Retry Agent Call", "Check Secret Keys", "Take 5-min Breathing Break"],
      extractedTaskSuggestion: {
        title: "Setup API Key or Retry Call",
        description: "Fix GEMINI_API_KEY or tap again to retry.",
        priority: "q1",
        energyRequired: "low",
        category: "System",
        microSteps: [
          "Check Secrets panel in the AI Studio platform",
          "Ensure GEMINI_API_KEY is configured properly",
          "Click \"Retry Agent Call\" pill to trigger connection"
        ]
      }
    });
  }
});

// -------------------------------------------------------------
// 4. VITE DEV SERVER MIDDLEWARE & STATIC SERVING IN PRODUCTION
// -------------------------------------------------------------
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    // Integrate Vite as a middleware for live source transpilation
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated successfully.");
  } else {
    // Production serving of compiled frontend bundle
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VibeGuard AI server initialized. Access via port ${PORT}.`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start custom Vite-Express server:", err);
});
