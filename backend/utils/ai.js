import { createAgent, gemini } from "@inngest/agent-kit";
import dotenv from 'dotenv';
dotenv.config();

const supportAgent = createAgent({
    model: gemini({
        model: "gemini-1.5-flash-8b",
        apiKey: process.env.GEMINI_API_KEY,
    }),
    name: "AI Ticket Triage Assistant",
    system: `You are an expert AI assistant that processes technical support tickets.

Your job is to:
1. Summarize the issue.
2. Estimate its priority.
3. Provide helpful notes and resource links for human moderators.
4. List relevant technical skills required.

IMPORTANT:
- Respond with *only* valid raw JSON.
- Do NOT include markdown, code fences, comments, or any extra formatting.
- The format must be a raw JSON object.

Repeat: Do not wrap your output in markdown or code fences.`,
});

const analyzeTicket = async (ticket) => {
    const prompt = `You are a ticket triage agent. Only return a strict JSON object with no extra text, headers, or markdown.

Analyze the following support ticket and provide a JSON object with:

- summary: A short 1-2 sentence summary of the issue.
- priority: One of "low", "medium", or "high".
- helpfulNotes: A detailed technical explanation that a moderator can use to solve this issue. Include useful external links or resources if possible.
- relatedSkills: An array of relevant skills required to solve the issue (e.g., ["React", "MongoDB"]).

Respond ONLY in this JSON format and do not include any other text or markdown in the answer:

{
  "summary": "Short summary of the ticket",
  "priority": "high",
  "helpfulNotes": "Here are useful tips...",
  "relatedSkills": ["React", "Node.js"]
}

---

Ticket information:

- Title: ${ticket.title}
- Description: ${ticket.description}
`;

    try {
        const response = await supportAgent.run(prompt);

        const rawContent =
            response.output?.[0]?.content ||
            response.output?.[0]?.context ||
            response.output?.[0]?.data ||
            "";


        const match = rawContent.match(/\{[\s\S]*\}/);
        if (!match) {
            throw new Error("No valid JSON object found in AI response.");
        }

        let parsed;
        try {
            parsed = JSON.parse(match[0]);
        } catch (err) {
            console.error("🚨 JSON parse error:", err.message);
            throw err;
        }

        return parsed;


    } catch (error) {
        console.error("🚨 AI Error:", error);
        throw error;
    }
};

export default analyzeTicket;