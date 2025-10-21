import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js";
import mongoose from "mongoose";

export const onTicketCreated = inngest.createFunction(
  { id: "on-ticket-created", retries: 2 },
  { event: "ticket/created" },
  async ({ event, step }) => {
    const { ticketId, title, description, createdBy } = event.data;
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);
    let aiResponse = null;
    let validPriority = "medium"; // Default priority
    let relatedSkills = [];
    let finalStatus = "OPEN";

    try {
      console.log(`🎟️ Ticket event received for: ${ticketId}`);

      // 1. AI Analysis via OpenAI
      console.log("🤖 Sending ticket to AI for analysis...");
      aiResponse = await step.run("analyze-ticket", async () => {
        const result = await analyzeTicket({ title, description });
        console.log("🧠 AI Response (Raw):", result);
        return result;
      });

      // 2. Process and Save AI results
      await step.run("process-and-save-ai-results", async () => {
        // Assume failure/OPEN status initially
        let updateData = {
          status: "OPEN",
          priority: validPriority,
          summary: "AI analysis is currently unavailable or failed. Reviewing manually.",
          helpfulNotes: "The automated analysis could not complete successfully. Please assign manually.",
          relatedSkills: [],
        };

        if (aiResponse && aiResponse.summary && aiResponse.priority) {
          // If the AI returned valid data, update our local variables and the updateData object
          const normalizedPriority = ["low", "medium", "high"].includes(aiResponse.priority.toLowerCase())
            ? aiResponse.priority.toLowerCase()
            : "medium";

          validPriority = normalizedPriority;
          relatedSkills = aiResponse.relatedSkills || [];
          finalStatus = "IN_PROGRESS";

          updateData = {
            summary: aiResponse.summary,
            priority: validPriority,
            helpfulNotes: aiResponse.helpfulNotes || "No detailed notes provided by AI.",
            relatedSkills: relatedSkills,
            status: finalStatus,
          };
        } else {
             // Use the default OPEN status and log the issue
             console.warn(`⚠️ AI response missing key fields for ticket ${ticketId}. Setting status to OPEN.`);
        }
        
        // Final database update using the determined updateData object
        await Ticket.findByIdAndUpdate(ticketObjectId, updateData);
      });

      // 3. Assign a moderator (this step now uses the updated 'relatedSkills' from step 2)
      const moderator = await step.run("assign-moderator", async () => {
        let user = null;

        if (relatedSkills.length > 0) {
          // Find a moderator whose skills match any related skill
          user = await User.findOne({
            role: "moderator",
            skills: { $in: relatedSkills }, // Simple and effective array matching
          });
        }

        // fallback to admin if no moderator matches or AI didn't provide skills
        if (!user) user = await User.findOne({ role: "admin" });

        await Ticket.findByIdAndUpdate(ticketObjectId, { assignedTo: user?._id || null });
        console.log("👤 Assigned moderator:", user?.email || "None");
        return user;
      });

      // 4. Notify moderator via email
      await step.run("send-notification-email", async () => {
        if (moderator) {
          await sendMail(
            moderator.email,
            `🎟️ New Ticket Assigned: ${title}`,
            `A new ticket titled "${title}" has been assigned to you.

            AI Summary: ${aiResponse?.summary || 'N/A'}
            Priority: ${validPriority}`
          );
        }
      });

      console.log("✅ Ticket processed successfully with AI insights and moderator assignment.");
      return { success: true };
    } catch (err) {
      console.error("❌ Error in onTicketCreated (Final Catch):", err.message);
      // Ensure status is updated to prevent indefinite PROCESSING state
      try {
           await Ticket.findByIdAndUpdate(ticketObjectId, { status: "ERROR", priority: "medium" });
      } catch (dbErr) {
           console.error("❌ Failed to set status to ERROR:", dbErr.message);
      }
      return { success: false, error: err.message };
    }
  }
);