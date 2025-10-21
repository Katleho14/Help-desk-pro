import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import OpenAI from "openai";

// Resolve current directory so dotenv can find .env no matter where this runs
// NOTE: On Render, environment variables are injected directly and this dotenv call is less critical
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// --------------------
// ✅ OpenAI Client Setup
// --------------------
// Use GEMINI_API_KEY if available (as your original setup used Gemini) but fallback to OpenAI
const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ CRITICAL: AI API Key (GEMINI_API_KEY or OPENAI_API_KEY) is missing.");
}

const openai = new OpenAI({
  apiKey: apiKey,
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      // Add a higher timeout for the API request itself for deployment stability
      timeout: 25000, // 25 seconds API timeout
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
        // Edited this line to ensure the full error message is used in the notes
        helpfulNotes: `### Deployment Error\n\n**API Call Failed:** \`${errorMessage}\`\n\nThis likely indicates a network timeout, resource constraint, or invalid API key configuration on the Render server.`,
        relatedSkills: []
    };
  }
};

export default analyzeTicket;