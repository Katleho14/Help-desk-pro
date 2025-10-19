import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js";

export const onTicketCreated = inngest.createFunction(
  { id: "on-ticket-created", retries: 2 },
  { event: "ticket/created" },
  async ({ event, step }) => {
    try {
      // Destructure necessary data directly from the event payload
      const { ticketId, title, description } = event.data;
      console.log("🎟️ Ticket event received:", event.data);

      // We skip fetching the ticket again (Step 1 from previous version) as it's already in the event,
      // and immediately proceed to set the status to PROCESSING, giving the frontend confirmation.
      // NOTE: The initial status change in the controller is actually done by default
      // by Mongoose (status: "TODO"). The inngest job updates it to "IN_PROGRESS" after AI is done.

      // We will keep Step 2 as a quick update to confirm processing has started, which the frontend can show.
      // ✅ Step 2: Update initial status to indicate AI processing
      await step.run("update-status-to-processing", async () => {
        await Ticket.findByIdAndUpdate(ticketId, { status: "PROCESSING" });
      });

      // ✅ Step 3: AI Analysis via OpenAI - using event data directly
      console.log("🤖 Sending ticket to AI...");
      const aiResponse = await step.run("analyze-ticket", async () => {
        // Use title and description directly from the event data for the AI call
        const result = await analyzeTicket({
          title,
          description,
        });
        console.log("🧠 AI Response:", result);
        return result;
      });

      // ✅ Step 4: Save AI results to MongoDB
      const relatedSkills = await step.run("update-ticket-with-ai", async () => {
        if (aiResponse && !aiResponse.error) {
          // Normalize priority value to prevent schema issues
          const validPriority = ["low", "medium", "high"].includes(aiResponse.priority?.toLowerCase())
            ? aiResponse.priority.toLowerCase()
            : "medium";

          // Use findByIdAndUpdate on the specific ticketId
          const updatedTicket = await Ticket.findByIdAndUpdate(
            ticketId,
            {
              summary: aiResponse.summary || "",
              priority: validPriority,
              helpfulNotes: aiResponse.helpfulNotes || "",
              relatedSkills: aiResponse.relatedSkills || [],
              status: "IN_PROGRESS", // Change status to IN_PROGRESS after analysis
            },
            { new: true } // Return the updated document
          );
          
          if (!updatedTicket) {
             throw new NonRetriableError(`Ticket not found by ID: ${ticketId}`);
          }
          
          // Only return skills if present
          return aiResponse.relatedSkills || [];

        } else {
          console.warn("⚠️ No valid AI response received for ticket or AI error:", ticketId, aiResponse.error);
          
          // Update status to keep it visible, but mark as open since analysis failed
          await Ticket.findByIdAndUpdate(ticketId, { status: "OPEN" }); 
          
          return [];
        }
      });

      // ✅ Step 5: Assign a moderator (by matching skills)
      const moderator = await step.run("assign-moderator", async () => {
        let user = null;

        if (relatedSkills.length > 0) {
          // Find moderator whose skills array contains any of the relatedSkills
          user = await User.findOne({
            role: "moderator",
            // This query finds users where at least one element in their 'skills' array 
            // is also present in the 'relatedSkills' array from the AI response.
            skills: { $in: relatedSkills },
          });
        }

        // fallback to admin if no moderator matches
        if (!user) {
             user = await User.findOne({ role: "admin" });
        }
        
        // Final update with assignment status
        await Ticket.findByIdAndUpdate(ticketId, { assignedTo: user?._id || null });
        console.log("👤 Assigned moderator:", user?.email || "None");
        return user;
      });

      // ✅ Step 6: Notify moderator via email
      await step.run("send-notification-email", async () => {
        if (moderator) {
          // Fetch the creator's email to include it in the notification
          const creator = await User.findById(event.data.createdBy);
          
          await sendMail(
            moderator.email,
            `🎟️ New Ticket Assigned: ${title}`,
            `A new ticket titled "${title}" has been assigned to you.

---
Ticket Summary: ${aiResponse.summary || 'N/A'}
Priority: ${aiResponse.priority || 'Medium'}
Assigned to: ${moderator.email}
Created by: ${creator?.email || 'Unknown User'}
---
`
          );
        }
      });

      console.log("✅ Ticket processed successfully with AI insights and moderator assignment.");
      return { success: true };
    } catch (err) {
      // Important: if the error is due to something transient (like network issues), Inngest will retry.
      // If it's a permanent error (like "Ticket not found"), throwing NonRetriableError prevents retries.
      console.error("❌ Error in onTicketCreated:", err);
      // Re-throw if it's a non-retriable error, otherwise allow retry
      if (err instanceof NonRetriableError) {
         throw err;
      }
      // You might want to update the ticket status to 'ERROR' here too for visibility.
      // await Ticket.findByIdAndUpdate(event.data.ticketId, { status: "ERROR" }); 
      return { success: false, error: err.message };
    }
  }
);

