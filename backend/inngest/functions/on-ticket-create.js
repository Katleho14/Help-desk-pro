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

      // We rely on the controller to have set the initial status to "PROCESSING".
      
      // ✅ Step 1: AI Analysis via OpenAI - using event data directly
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

      let updatedTicket = null;
      let moderator = null;
      let finalStatus = "OPEN";
      let relatedSkills = [];
      let validPriority = "medium";
      
      // Check if AI response is valid and proceed with processing
      if (aiResponse && !aiResponse.error && aiResponse.summary) {
        
        // Normalize priority value to prevent schema issues
        validPriority = ["low", "medium", "high"].includes(aiResponse.priority?.toLowerCase())
          ? aiResponse.priority.toLowerCase()
          : "medium";

        relatedSkills = aiResponse.relatedSkills || [];
        finalStatus = "IN_PROGRESS";
        
        // ✅ Step 2: Assign a moderator (by matching skills)
        moderator = await step.run("assign-moderator", async () => {
          let user = null;

          if (relatedSkills.length > 0) {
            user = await User.findOne({
              role: "moderator",
              // Find users that have at least one of the required skills
              skills: { $in: relatedSkills },
            });
          }

          // fallback to admin if no moderator matches
          if (!user) {
              user = await User.findOne({ role: "admin" });
          }
          
          console.log("👤 Assigned moderator:", user?.email || "None");
          return user;
        });
        
        // ✅ Step 3: Save ALL AI results and assignment to MongoDB
        updatedTicket = await step.run("update-ticket-with-ai-and-assignment", async () => {
          
          const updateData = {
            summary: aiResponse.summary || "",
            priority: validPriority,
            helpfulNotes: aiResponse.helpfulNotes || "",
            relatedSkills: relatedSkills,
            status: finalStatus, // Set status to IN_PROGRESS
            assignedTo: moderator?._id || null, // Set assigned moderator ID
          };
          
          const result = await Ticket.findByIdAndUpdate(
            ticketId,
            updateData,
            { new: true } // Return the updated document
          );
          
          if (!result) {
             throw new NonRetriableError(`Ticket not found by ID: ${ticketId}`);
          }
          
          return result;
        });

      } else {
        // AI analysis failed or returned insufficient data
        console.warn("⚠️ AI analysis failed. Setting status to OPEN.");
        updatedTicket = await Ticket.findByIdAndUpdate(
            ticketId, 
            { status: finalStatus }, // Set status to OPEN
            { new: true }
        );
      }


      // ✅ Step 4: Notify moderator via email (Only if assignment was successful)
      await step.run("send-notification-email", async () => {
        if (moderator) {
          const creator = await User.findById(event.data.createdBy);
          
          await sendMail(
            moderator.email,
            `🎟️ New Ticket Assigned: ${title}`,
            `A new ticket titled "${title}" has been assigned to you.

---
Ticket Summary: ${aiResponse.summary || 'N/A'}
Priority: ${validPriority}
Assigned to: ${moderator.email}
Created by: ${creator?.email || 'Unknown User'}
---
Notes for Agent:
${aiResponse.helpfulNotes || 'No specific notes provided by AI.'}`
          );
        }
      });

      console.log("✅ Ticket processed successfully with AI insights and moderator assignment.");
      return { success: true, status: finalStatus };
    } catch (err) {
      console.error("❌ Error in onTicketCreated:", err);
      // Attempt to set status to ERROR for visibility if we can
      await step.run("update-status-to-error", async () => {
          await Ticket.findByIdAndUpdate(ticketId, { status: "ERROR" });
      });

      // Re-throw NonRetriableError to prevent endless retries on invalid data
      if (err instanceof NonRetriableError) {
         throw err;
      }
      return { success: false, error: err.message };
    }
  }
);
