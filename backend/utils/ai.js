import { createAgent, gemini } from "@inngest/agent-kit";

const analyzeTicket = async (ticket) => {
  const supportAgent = createAgent({
    model: gemini({
      model: "gemini-1.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
    }),
    name: "AI Ticket Triage Assistant",
    system: `You are an expert AI assistant that processes technical support tickets. 
Respond ONLY in valid JSON with no markdown, no comments.`,
  });

  const response = await supportAgent.run(`
Analyze this support ticket and return JSON:

{
  "summary": "Short summary",
  "priority": "low|medium|high",
  "helpfulNotes": "Technical guidance with external links",
  "relatedSkills": ["React", "MongoDB"]
}

Ticket:
- Title: ${ticket.title}
- Description: ${ticket.description}
`);

  const raw = response?.output?.[0]?.context || "";
  console.log("⚡ Raw Gemini output:", raw);

  try {
    // Try parse directly
    return JSON.parse(raw);
  } catch {
    // Fallback: extract JSON substring
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  }
};

export default analyzeTicket;
