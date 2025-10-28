/**
 * inngest/functions/onTicketCreated.js
 * -------------------------------------
 * Triggered when a new support ticket is created.
 * Uses AI to auto-analyze the ticket, assign priority, and notify a moderator.
 */

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
    let validPriority = "medium";
    let relatedSkills = [];
    let finalStatus = "OPEN";

    try {
      console.log(`🎟️ Ticket event received for: ${ticketId}`);

      // --------------------
      // 1️⃣ AI Analysis
      // --------------------
      console.log("🤖 Sending ticket to AI for analysis...");
      aiResponse = await step.run("analyze-ticket", async () => {
        try {
          const result = await analyzeTicket({ title, description });
          console.log("🧠 AI Response (Raw):", result);
          return result;
        } catch (err) {
          console.error("❌ analyzeTicket() failed:", err.message);
          return { summary: null, priority: null, helpfulNotes: null, relatedSkills: [] };
        }
      });

      // --------------------
      // 2️⃣ Process & Save AI Results
      // --------------------
      await step.run("process-and-save-ai-results", async () => {
        let updateData = {
          status: "OPEN",
          priority: validPriority,
          summary: "AI analysis unavailable or failed.",
          helpfulNotes: "The AI could not complete analysis. Manual review required.",
          relatedSkills: [],
        };

        if (aiResponse && aiResponse.summary && aiResponse.priority) {
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
            relatedSkills,
            status: finalStatus,
          };
        } else {
          console.warn(`⚠️ AI response missing key fields for ticket ${ticketId}. Defaulting to OPEN.`);
        }

        await Ticket.findByIdAndUpdate(ticketObjectId, updateData);
      });

      // --------------------
      // 3️⃣ Assign Moderator
      // --------------------
      const moderator = await step.run("assign-moderator", async () => {
        let user = null;

        if (relatedSkills.length > 0) {
          user = await User.findOne({
            role: "moderator",
            skills: { $in: relatedSkills },
          });
        }

        if (!user) user = await User.findOne({ role: "admin" });

        await Ticket.findByIdAndUpdate(ticketObjectId, { assignedTo: user?._id || null });
        console.log("👤 Assigned moderator:", user?.email || "None");
        return user;
      });

      // --------------------
      // 4️⃣ Send Notification
      // --------------------
      await step.run("send-notification-email", async () => {
        if (moderator) {
          await sendMail(
            moderator.email,
            `🎟️ New Ticket Assigned: ${title}`,
            `A new ticket titled "${title}" has been assigned to you.\n\nAI Summary: ${
              aiResponse?.summary || "N/A"
            }\nPriority: ${validPriority}`
          );
        }
      });

      console.log("✅ Ticket processed successfully with AI insights and moderator assignment.");
      return { success: true };
    } catch (err) {
      console.error("❌ Error in onTicketCreated (Final Catch):", err.message);

      try {
        await Ticket.findByIdAndUpdate(ticketObjectId, { status: "ERROR", priority: "medium" });
      } catch (dbErr) {
        console.error("❌ Failed to set status to ERROR:", dbErr.message);
      }

      return { success: false, error: err.message };
    }
  }
);
