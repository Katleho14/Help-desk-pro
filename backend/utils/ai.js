// backend/utils/ai.js
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // ✅ Works with project-based keys
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    console.log("⚡ Raw AI output:", raw);

    return JSON.parse(raw);
  } catch (error) {
    console.error("❌ Error in analyzeTicket:", error.message);

    return {
      error: `API Call Failed: ${error.message}`,
      summary: "AI analysis failed due to API error.",
      priority: "medium",
      helpfulNotes: `### Deployment Error\n\n**API Call Failed:** \`${error.message}\`\n\nPossible causes:\n- Missing or invalid OPENAI_API_KEY\n- Render network issue\n- Temporary OpenAI service outage.`,
      relatedSkills: [],
    };
  }
};

export default analyzeTicket;

