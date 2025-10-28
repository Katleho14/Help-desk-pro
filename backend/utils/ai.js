import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Agent } from "http";
import { Agent as HttpsAgent } from "https";

// --------------------
// 🌍 Load Environment Variables
// --------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// --------------------
// 🔐 Validate OpenAI API Key
// --------------------
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ CRITICAL: Missing environment variable OPENAI_API_KEY.");
  process.exit(1);
}

// --------------------
// ⚙️ Setup HTTP/HTTPS Agents
// Disable keep-alive to avoid Render connection timeouts
// --------------------
const httpAgent = new Agent({ keepAlive: false, timeout: 25000 });
const httpsAgent = new HttpsAgent({ keepAlive: false, timeout: 25000 });

// --------------------
// 🤖 Initialize OpenAI Client (fixed config)
// --------------------
const openai = new OpenAI({
  apiKey,
  httpAgent,
  httpsAgent,
  defaultHeaders: { "User-Agent": "Render/Node" },
});

// --------------------
// 🧠 Helper: Retry Logic with Exponential Backoff
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
      await new Promise((res) => setTimeout(res, 1000 * (i + 1))); // Exponential delay
    }
  }
};

// --------------------
// 🚀 Main Function: Analyze Ticket
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
  "relatedSkills": ["React", "MongoDB", "node.js"]
}

Ticket Details:
- Title: ${ticket.title}
- Description: ${ticket.description}
`;

    // Call OpenAI with retry and timeout logic
    const completion = await callOpenAI(prompt);
    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    console.log("⚡ Raw AI output:", raw);

    // Parse JSON safely
    try {
      return JSON.parse(raw);
    } catch (parseError) {
      console.error("❌ JSON Parse Error. Attempting salvage:", parseError.message);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (salvageError) {
          console.error("❌ Salvage Failed:", salvageError.message);
          return {
            error: "Failed to parse AI response, even after salvage.",
            raw,
          };
        }
      }
      return { error: "No valid JSON found in AI response.", raw };
    }
  } catch (error) {
    const errorMessage = error.message || "Unknown OpenAI API Error";
    console.error("❌ Error during OpenAI API call:", errorMessage);

    // Structured fallback response
    return {
      error: `API Call Failed: ${errorMessage.substring(0, 80)}...`,
      summary: "AI analysis failed due to API connection error.",
      priority: "medium",
      helpfulNotes: `### Deployment Error\n\n**API Call Failed:** \`${errorMessage}\`\n\nThis likely indicates one of the following:\n- Network timeout or blocked outbound request on Render.\n- Invalid or missing \`OPENAI_API_KEY\`.\n- Render free tier network sandbox issue.\n- Excessive keep-alive connections or resource constraints.\n\n**Recommended Fixes:**\n1. Verify the \`OPENAI_API_KEY\` is correctly set in Render Environment Variables.\n2. Redeploy after saving.\n3. If error persists, restart the Render service to clear stuck connections.`,
      relatedSkills: [],
    };
  }
};

export default analyzeTicket;

