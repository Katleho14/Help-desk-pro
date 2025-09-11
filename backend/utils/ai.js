import { createAgent, gemini } from "@inngest/agent-kit";

const analyzeTicket = async (ticket) => {
  const supportAgent = createAgent({
    model: gemini({
      model: "gemini-1.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
    }),
    name: "AI Ticket Triage Assistant",
    system: `You are an expert AI assistant that processes support tickets.
Respond ONLY with a valid raw JSON object.
Do NOT use markdown, code fences, or extra text.`,
  });

  const response = await supportAgent.run(`
Analyze the following support ticket and return ONLY a JSON object with:

- summary: short 1–2 sentence summary
- priority: "low" | "medium" | "high"
- helpfulNotes: detailed technical notes
- relatedSkills: array of skills (e.g. ["React", "Node.js"])

Ticket:
- Title: ${ticket.title}
- Description: ${ticket.description}
`);

  const raw = response.output[0].context;
  console.log("Gemini raw response:", raw);

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("❌ Failed to parse Gemini response:", e.message, raw);
    return null;
  }
};

export default analyzeTicket;