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
      const { ticketId, title, description, createdBy } = event.data;
      console.log("🎟️ Ticket event received:", event.data);

      // ✅ Step 1: Fetch the ticket from DB
      const ticket = await step.run("fetch-ticket", async () => {
        const ticketObject = await Ticket.findById(ticketId);
        if (!ticketObject) throw new NonRetriableError("Ticket not found");
        return ticketObject;
      });

      // ✅ Step 2: Update initial status to indicate AI processing
      await step.run("update-status", async () => {
        await Ticket.findByIdAndUpdate(ticket._id, { status: "PROCESSING" });
      });

      // ✅ Step 3: AI Analysis via OpenAI
      console.log("🤖 Sending ticket to AI...");
      const aiResponse = await step.run("analyze-ticket", async () => {
        const result = await analyzeTicket({
          title: ticket.title,
          description: ticket.description,
        });
        console.log("🧠 AI Response:", result);
        return result;
      });

      // ✅ Step 4: Save AI results to MongoDB
      const relatedSkills = await step.run("update-ticket-with-ai", async () => {
        if (aiResponse) {
          const validPriority = ["low", "medium", "high"].includes(aiResponse.priority)
            ? aiResponse.priority
            : "medium";

          await Ticket.findByIdAndUpdate(ticket._id, {
            summary: aiResponse.summary || "",
            priority: validPriority,
            helpfulNotes: aiResponse.helpfulNotes || "",
            relatedSkills: aiResponse.relatedSkills || [],
            status: "IN_PROGRESS",
          });

          return aiResponse.relatedSkills || [];
        } else {
          console.warn("⚠️ No AI response received for ticket:", ticketId);
          return [];
        }
      });

      // ✅ Step 5: Assign a moderator (by matching skills)
      const moderator = await step.run("assign-moderator", async () => {
        let user = null;

        if (relatedSkills.length > 0) {
          user = await User.findOne({
            role: "moderator",
            skills: { $elemMatch: { $regex: relatedSkills.join("|"), $options: "i" } },
          });
        }

        // fallback to admin if no moderator matches
        if (!user) user = await User.findOne({ role: "admin" });

        await Ticket.findByIdAndUpdate(ticket._id, { assignedTo: user?._id || null });
        console.log("👤 Assigned moderator:", user?.email || "None");
        return user;
      });

      // ✅ Step 6: Notify moderator via email
      await step.run("send-notification-email", async () => {
        if (moderator) {
          await sendMail(
            moderator.email,
            "🎟️ New Ticket Assigned",
            `A new ticket titled "${title}" has been assigned to you.`
          );
        }
      });

      console.log("✅ Ticket processed successfully with AI insights and moderator assignment.");
      return { success: true };
    } catch (err) {
      console.error("❌ Error in onTicketCreated:", err);
      return { success: false, error: err.message };
    }
  }
);

