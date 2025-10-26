import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
// The 'http' and 'https' modules are core Node.js modules for creating custom agents.
import { Agent } from "http";
import { Agent as HttpsAgent } from "https";

// Resolve current directory so dotenv can find .env no matter where this runs
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// --------------------
// ✅ OpenAI Client Setup (Fixed for OpenAI ONLY)
// --------------------
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ CRITICAL: AI API Key (OPENAI_API_KEY) is missing.");
}

// Create custom agents to explicitly disable connection keep-alive.
// This is the essential fix for "Connection error" timeouts in cloud environments.
const httpAgent = new Agent({ keepAlive: false, timeout: 25000 });
const httpsAgent = new HttpsAgent({ keepAlive: false, timeout: 25000 });

const openai = new OpenAI({
  apiKey: apiKey,
  // Use the custom agents for all HTTP/HTTPS traffic
  httpAgent: (url) => (url.protocol === 'http:' ? httpAgent : httpsAgent),
});

// --------------------
// ✅ Analyze Ticket Function
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

    // Increased timeout is handled by the custom agent configuration above.
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    console.log("⚡ Raw AI output:", raw);

    try {
      return JSON.parse(raw);
    } catch (parseError) {
      console.error("❌ JSON Parse Error. Attempting to salvage JSON...", parseError.message);
      // Try to extract JSON if it has extra text (common deployment issue)
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (salvageError) {
          console.error("❌ Failed to salvage JSON:", salvageError.message);
          return { error: "Failed to parse AI response, even after salvaging.", raw };
        }
      }
      return { error: "Failed to parse AI response, no JSON found.", raw };
    }
  } catch (error) {
    const errorMessage = error.message || "Unknown OpenAI API Error";
    console.error("❌ Error during OpenAI API call in analyzeTicket:", errorMessage);
    // Return structured failure response to be caught by Inngest function
    return { 
        error: `API Call Failed: ${errorMessage.substring(0, 50)}...`,
        summary: "AI analysis failed due to deployment API error.",
        priority: "medium",
        // This helpful note remains the key diagnostic message.
        helpfulNotes: `### Deployment Error\n\n**API Call Failed:** \`${errorMessage}\`\n\nThis likely indicates a network timeout, resource constraint, or invalid API key configuration on the Render server.`,
        relatedSkills: []
    };
  }
};

export default analyzeTicket;

