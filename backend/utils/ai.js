// --------------------
// ✅ Load environment variables safely
// --------------------
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";

// Resolve current directory so dotenv can find .env no matter where this runs
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// --------------------
// ✅ OpenAI Client Setup
// --------------------
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing. Check your .env file path.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --------------------
// ✅ Analyze Ticket Function
// --------------------
const analyzeTicket = async (ticket) => {
  try {
    const prompt = `
You are an expert technical support AI.
Respond ONLY in valid JSON (no markdown, comments, or extra text).

{
  "summary": "Short issue summary",
  "priority": "low | medium | high",
  "helpfulNotes": "Technical notes or suggestions",
  "relatedSkills": ["React", "MongoDB"]
}

Ticket:
- Title: ${ticket.title}
- Description: ${ticket.description}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    console.log("⚡ Raw OpenAI output:", raw);

    try {
      return JSON.parse(raw);
    } catch {
      // try to extract JSON if it has extra text
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      return { error: "Failed to parse AI response", raw };
    }
  } catch (error) {
    console.error("❌ Error in analyzeTicket:", error);
    return { error: error.message };
  }
};

export default analyzeTicket;
