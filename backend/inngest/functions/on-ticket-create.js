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
    let finalStatus = "OPEN";
    let validPriority = "medium"; // Default to medium if AI fails

    try {
      console.log(`🎟️ Ticket event received for: ${ticketId}`);

      // 1. Set Status to PROCESSING (Controller sets it to PROCESSING, we confirm here)
      await step.run("set-status-processing", async () => {
        await Ticket.findByIdAndUpdate(ticketObjectId, { status: "PROCESSING" });
      });

      // 2. AI Analysis via OpenAI
      console.log("🤖 Sending ticket to AI for analysis...");
      aiResponse = await step.run("analyze-ticket", async () => {
        const result = await analyzeTicket({ title, description });
        console.log("🧠 AI Response (Raw):", result);
        return result;
      });

      // 3. Process and Save AI results
      let relatedSkills = [];
      
      if (aiResponse && aiResponse.summary) {
        // Validate priority and use a default if invalid
        const normalizedPriority = ["low", "medium", "high"].includes(aiResponse.priority?.toLowerCase())
          ? aiResponse.priority.toLowerCase()
          : "medium"; 
        
        validPriority = normalizedPriority;
        relatedSkills = aiResponse.relatedSkills || [];
        finalStatus = "IN_PROGRESS"; // Successful AI analysis means we can start working

        await step.run("update-ticket-with-ai", async () => {
          await Ticket.findByIdAndUpdate(ticketObjectId, {
            summary: aiResponse.summary || "AI Summary not available.",
            priority: validPriority,
            helpfulNotes: aiResponse.helpfulNotes || "No detailed notes provided by AI.",
            relatedSkills: relatedSkills,
            status: finalStatus,
          });
        });
      } else {
        // If AI response is completely missing/bad, log it and set status to OPEN
        console.warn(`⚠️ AI response missing or invalid for ticket ${ticketId}. Setting status to OPEN.`);
        
        await step.run("update-ticket-to-open", async () => {
             await Ticket.findByIdAndUpdate(ticketObjectId, {
                status: "OPEN", 
                priority: validPriority, // Ensure priority has a value
                summary: "AI analysis is currently unavailable. Reviewing manually." 
             });
        });
        
        // Skip assignment and email steps for non-actionable tickets
        return { success: false, reason: "AI failed to return valid data" };
      }


      // 4. Assign a moderator (by matching skills)
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

      // 5. Notify moderator via email
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
