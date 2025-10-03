
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.trim(),
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // ✅ Use latest lightweight model (you can change if needed)
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const rawContent = completion.choices[0]?.message?.content || "";
    console.log("🤖 Raw OpenAI output:", rawContent);

    let parsed;
    try {
      parsed = JSON.parse(rawContent.trim());
      console.log("✅ Parsed AI JSON directly:", parsed);
    } catch (err) {
      console.log("🚨 Direct JSON parse failed, trying RegExp extraction.");
      const regex = /\{[\s\S]*\}/;
      const match = regex.exec(rawContent);
      if (!match) {
        console.error("🚨 No valid JSON object found.");
        return {
          summary: "No summary provided",
          priority: "medium",
          helpfulNotes: "No helpful notes provided",
          relatedSkills: [],
        };
      }
      try {
        parsed = JSON.parse(match[0]);
        console.log("✅ Parsed AI JSON from extracted match:", parsed);
      } catch (parseErr) {
        console.error("🚨 JSON parse error:", parseErr.message);
        return {
          summary: "No summary provided",
          priority: "medium",
          helpfulNotes: "No helpful notes provided",
          relatedSkills: [],
        };
      }
    }

    // Validate fields
    const validatedResponse = {
      summary: parsed.summary || "No summary provided",
      priority: ["low", "medium", "high"].includes(parsed.priority)
        ? parsed.priority
        : "medium",
      helpfulNotes: parsed.helpfulNotes || "No helpful notes provided",
      relatedSkills: Array.isArray(parsed.relatedSkills)
        ? parsed.relatedSkills
        : [],
    };

    console.log("✅ Final validated AI response:", validatedResponse);
    return validatedResponse;
  } catch (error) {
    console.error("🚨 OpenAI Error:", error);
    throw error;
  }
};

export default analyzeTicket;
