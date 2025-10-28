/**
 * utils/ai.js
 * -------------
 * Handles AI analysis for support tickets using OpenAI's API.
 * Includes retry logic, JSON parsing safeguards, and Render-friendly network settings.
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Agent } from "http";
import { Agent as HttpsAgent } from "https";

// --------------------
// 🌍 Load environment variables
// --------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// --------------------
// 🔐 Validate API key
// --------------------
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ CRITICAL: Missing environment variable OPENAI_API_KEY.");
  process.exit(1);
}

// --------------------
// ⚙️ Configure HTTP agents (Render-safe)
// --------------------
const httpAgent = new Agent({ keepAlive: false, timeout: 25000 });
const httpsAgent = new HttpsAgent({ keepAlive: false, timeout: 25000 });

// --------------------
// 🤖 Initialize OpenAI client
// --------------------
const openai = new OpenAI({
  apiKey,
  httpAgent,
  httpsAgent,
  defaultHeaders: { "User-Agent": "Render/Node" },
});

// --------------------
// 🔁 Retry logic with exponential backoff
// --------------------
const callOpenAI = async (prompt, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        timeout: 25000,
      });
      return completion;
    } catch (err) {
      console.warn(`⚠️ OpenAI call failed (Attempt ${i + 1}/${retries}): ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // Wait before retry
    }
  }
};

// --------------------
// 🧠 Analyze Ticket Function
// --------------------
const analyzeTicket = async (ticket) => {
  try {
    const prompt = `
You are an expert technical support AI.
Respond ONLY in valid JSON (no markdown, comments, or extra text).

The output MUST conform to the following JSON structure exactly:
{
  "summary": "Short, concise issue summary",
  "priority": "low | medium | high",
  "helpfulNotes": "Technical notes or troubleshooting suggestions using Markdown format (e.g., headers, bullet points).",
  "relatedSkills": ["React", "MongoDB", "Node.js"]
}

Ticket Details:
- Title: ${ticket.title}
- Description: ${ticket.description}
`;

    const completion = await callOpenAI(prompt);
    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    console.log("⚡ Raw AI output:", raw);

    // Parse JSON safely
    try {
      return JSON.parse(raw);
    } catch (parseError) {
      console.error("❌ JSON Parse Error. Attempting salvage:", parseError.message);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("No valid JSON found in AI response.");
    }
  } catch (error) {
    const errorMessage = error.message || "Unknown OpenAI API Error";
    console.error("❌ analyzeTicket failed:", errorMessage);

    // Fallback structured response
    return {
      error: `API Call Failed: ${errorMessage.substring(0, 80)}...`,
      summary: "AI analysis failed due to API connection error.",
      priority: "medium",
      helpfulNotes: `### Deployment Error\n\n**API Call Failed:** \`${errorMessage}\`\n\nPossible causes:\n- Missing or invalid OPENAI_API_KEY\n- Render network timeout\n- Blocked outbound requests\n\n**Fix Suggestions:**\n1. Verify the OPENAI_API_KEY in Render Environment Variables.\n2. Redeploy the service.\n3. If using the free Render plan, upgrade to enable outbound networking.`,
      relatedSkills: [],
    };
  }
};

export default analyzeTicket;

