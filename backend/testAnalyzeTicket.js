import dotenv from "dotenv";
import OpenAI from "openai";

// Load environment variables from .env
dotenv.config();

console.log("Loaded API Key:", process.env.OPENAI_API_KEY ? "✅ Exists" : "❌ Missing");

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Test function
async function testAnalyzeTicket() {
  try {
    console.log("🔍 Running AI ticket analysis test...");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `
            Customer reports: "The printer isn't working and keeps showing a paper jam error. 
            I already tried restarting it and checking for stuck paper."
            
            Please provide a short helpful summary and possible next steps.
          `,
        },
      ],
    });

    console.log("\n✅ AI Response:");
    console.log(response.choices[0].message.content);

  } catch (error) {
    console.error("\n❌ Error running testAnalyzeTicket:");
    console.error(error.message);
  }
}

// Run the test
testAnalyzeTicket();


