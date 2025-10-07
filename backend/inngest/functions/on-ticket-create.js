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
      const { ticketId } = event.data;
      console.log("🎟️ Ticket event received:", event.data);

      // Step 1: Fetch ticket
      const ticket = await step.run("fetch-ticket", async () => {
        const ticketObject = await Ticket.findById(ticketId);
        if (!ticketObject) throw new NonRetriableError("Ticket not found");
        return ticketObject;
      });

      // Step 2: Set initial status
      await step.run("update-status", async () => {
        await Ticket.findByIdAndUpdate(ticket._id, { status: "TODO" });
      });

      // Step 3: AI Analysis
      console.log("🤖 Sending to AI...");
      const aiResponse = await analyzeTicket(ticket);
      console.log("🧠 AI Response:", aiResponse);

      const relatedSkills = await step.run("ai-processing", async () => {
        if (aiResponse) {
          const priority = ["low", "medium", "high"].includes(aiResponse.priority)
            ? aiResponse.priority
            : "medium";

          await Ticket.findByIdAndUpdate(ticket._id, {
            priority,
            helpfulNotes: aiResponse.helpfulNotes || "",
            status: "IN_PROGRESS",
            relatedSkills: aiResponse.relatedSkills || [],
            summary: aiResponse.summary || "",
          });
          return aiResponse.relatedSkills || [];
        }
        return [];
      });

      // Step 4: Assign moderator
      const moderator = await step.run("assign-moderator", async () => {
        let user = await User.findOne({
          role: "moderator",
          skills: { $elemMatch: { $regex: relatedSkills.join("|"), $options: "i" } },
        });
        if (!user) user = await User.findOne({ role: "admin" });

        await Ticket.findByIdAndUpdate(ticket._id, { assignedTo: user?._id || null });
        console.log("👤 Assigned moderator:", user?.email || "None");
        return user;
      });

      // Step 5: Notify moderator
      await step.run("send-email", async () => {
        if (moderator) {
          await sendMail(
            moderator.email,
            "New Ticket Assigned",
            `A new ticket has been assigned: ${ticket.title}`
          );
        }
      });

      console.log("✅ Ticket processed successfully.");
      return { success: true };
    } catch (err) {
      console.error("❌ Error in onTicketCreated:", err.message);
      return { success: false, error: err.message };
    }
  }
);

