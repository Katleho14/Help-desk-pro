
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


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
            model: "gpt-3.5-turbo", // Use OpenAI's gpt-3.5-turbo model
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
        });

        const rawContent = completion.choices[0]?.message?.content || "";
        console.log("🤖 Raw OpenAI output:", rawContent);

        let parsed;
        try {
            // First, try to parse the entire response as JSON
            parsed = JSON.parse(rawContent.trim());
            console.log("✅ Parsed AI JSON directly:", parsed);
        } catch (err) {
            console.log("🚨 Direct JSON parse failed, trying to extract JSON from response.");
            // If direct parse fails, try to extract JSON using regex
            const match = rawContent.match(/\{[\s\S]*\}/);
            if (!match) {
                console.error("🚨 No valid JSON object found in AI response.");
                throw new Error("No valid JSON object found in AI response.");
            }
            try {
                parsed = JSON.parse(match[0]);
                console.log("✅ Parsed AI JSON from extracted match:", parsed);
            } catch (parseErr) {
                console.error("🚨 JSON parse error on extracted match:", parseErr.message);
                throw parseErr;
            }
        }

        // Validate the parsed response
        if (!parsed || typeof parsed !== 'object') {
            throw new Error("Invalid AI response structure");
        }

        // Ensure required fields with defaults
        const validatedResponse = {
            summary: parsed.summary || "No summary provided",
            priority: ["low", "medium", "high"].includes(parsed.priority) ? parsed.priority : "medium",
            helpfulNotes: parsed.helpfulNotes || "No helpful notes provided",
            relatedSkills: Array.isArray(parsed.relatedSkills) ? parsed.relatedSkills : []
        };

        console.log("✅ Validated AI response:", validatedResponse);
        return validatedResponse;

    } catch (error) {
        console.error("🚨 OpenAI Error:", error);
        throw error;
    }
};

export default analyzeTicket;