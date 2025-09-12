import { createAgent, gemini } from "@inngest/agent-kit";

// Heuristic fallback when the AI is unavailable or returns non-JSON text
function ruleBasedFallback(ticket) {
  const text = `${ticket.title} ${ticket.description}`.toLowerCase();
  const skills = new Set();

  if (/(mongo|mongodb)/.test(text)) skills.add("MongoDB");
  if (/(express|node(\.js)?|server|api)/.test(text)) skills.add("Node.js");
  if (/(react|vite|frontend|ui)/.test(text)) skills.add("React");
  if (/(auth|login|jwt)/.test(text)) skills.add("Auth");

  let priority = "medium";
  if (/(down|cannot|can't|won't|crash|error|fail|not connect|timeout)/.test(text)) {
    priority = "high";
  } else if (/(slow|warning|sometimes)/.test(text)) {
    priority = "medium";
  }

  return {
    summary: ticket.title?.slice(0, 120) || "Ticket",
    priority,
    helpfulNotes:
      "Initial triage applied. Please collect logs, exact error messages, and steps to reproduce.",
    relatedSkills: Array.from(skills),
  };
}

function extractJsonSubstring(text) {
  if (typeof text !== "string") return null;
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function tryParseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Recursively search for the first long string field in any object/array
function findFirstText(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstText(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      const found = findFirstText(value[key]);
      if (found) return found;
    }
  }
  return null;
}

async function callAgentKit(prompt) {
  const supportAgent = createAgent({
    model: gemini({
      model: "gemini-1.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
    }),
    name: "AI Ticket Triage Assistant",
    system:
      "You are an expert AI assistant that processes technical support tickets. Respond ONLY in strict JSON. No markdown.",
  });

  const response = await supportAgent.run(prompt);

  // Try common shapes; fall back to deep search for text
  const candidates = [
    response?.output_text,
    response?.outputText,
    response?.output?.[0]?.content?.[0]?.text,
    response?.output?.[0]?.text,
    response?.text,
  ];
  let raw = candidates.find((v) => typeof v === "string" && v.length > 0);
  if (!raw) raw = findFirstText(response) || "";

  console.log("⚡ Raw Gemini output (agent-kit):", String(raw).slice(0, 500));
  return String(raw || "");
}

async function callGeminiHTTP(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 1024,
      },
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    console.error("⚠️ Gemini HTTP error:", res.status, msg);
    return "";
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).join("\n") ||
    "";
  console.log("⚡ Raw Gemini output (http):", String(text).slice(0, 500));
  return String(text || "");
}

function normalizeResult(ticket, obj) {
  const result = {
    summary: typeof obj?.summary === "string" && obj.summary.trim() ? obj.summary.trim() : ticket.title?.slice(0, 120) || "Ticket",
    helpfulNotes: typeof obj?.helpfulNotes === "string" ? obj.helpfulNotes : "",
    relatedSkills: Array.isArray(obj?.relatedSkills)
      ? obj.relatedSkills.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim())
      : [],
    priority: ["low", "medium", "high"].includes(String(obj?.priority).toLowerCase())
      ? String(obj.priority).toLowerCase()
      : "medium",
  };
  return result;
}

const analyzeTicket = async (ticket) => {
  // Guard: missing API key
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is not set. Using rule-based fallback.");
    return ruleBasedFallback(ticket);
  }

  const prompt = `Analyze this support ticket and return ONLY valid JSON in this exact shape:\n\n{\n  "summary": "Short summary",\n  "priority": "low|medium|high",\n  "helpfulNotes": "Technical guidance with external links",\n  "relatedSkills": ["React", "MongoDB"]\n}\n\nTicket:\n- Title: ${ticket.title}\n- Description: ${ticket.description}`;

  try {
    // 1) Try via agent-kit
    let raw = await callAgentKit(prompt);
    let parsed = tryParseJson(raw) || tryParseJson(extractJsonSubstring(raw));

    // 2) HTTP fallback if agent-kit returned nothing parseable
    if (!parsed) {
      raw = await callGeminiHTTP(prompt);
      parsed = tryParseJson(raw) || tryParseJson(extractJsonSubstring(raw));
    }

    if (!parsed) {
      console.warn("⚠️ No JSON parsed from AI. Falling back to heuristics.");
      return ruleBasedFallback(ticket);
    }

    return normalizeResult(ticket, parsed);
  } catch (err) {
    console.error("❌ AI analysis error:", err);
    return ruleBasedFallback(ticket);
  }
};

export default analyzeTicket;
