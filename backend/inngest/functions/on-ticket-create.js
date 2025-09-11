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

      // 1. Fetch ticket
      const ticket = await step.run("fetch-ticket", async () => {
        const ticketObject = await Ticket.findById(ticketId);
        if (!ticketObject) {
          throw new NonRetriableError("Ticket not found");
        }
        return ticketObject;
      });

      // 2. Temporary placeholder
      await step.run("set-status-placeholder", async () => {
        await Ticket.findByIdAndUpdate(ticket._id, { status: "PROCESSING" });
      });

      // 3. Get AI analysis
      const aiResponse = await analyzeTicket(ticket);

      // 4. Update ticket with AI data
      const relatedskills = await step.run("ai-processing", async () => {
        if (aiResponse) {
          await Ticket.findByIdAndUpdate(ticket._id, {
            priority: ["low", "medium", "high"].includes(aiResponse.priority)
              ? aiResponse.priority
              : "medium",
            helpfulNotes: aiResponse.helpfulNotes,
            relatedSkills: aiResponse.relatedSkills,
            status: aiResponse.summary || "IN_PROGRESS", // 👈 AI replaces TODO
          });
          return aiResponse.relatedSkills || [];
        }
        return [];
      });

      // 5. Assign a moderator
      const moderator = await step.run("assign-moderator", async () => {
        let user = await User.findOne({
          role: "moderator",
          skills: {
            $elemMatch: {
              $regex: relatedskills.join("|"),
              $options: "i",
            },
          },
        });

        if (!user) {
          user = await User.findOne({ role: "admin" });
        }

        await Ticket.findByIdAndUpdate(ticket._id, {
          assignedTo: user?._id || null,
        });

        return user;
      });

      // 6. Send email
      await step.run("send-email-notification", async () => {
        if (moderator) {
          const finalTicket = await Ticket.findById(ticket._id);
          await sendMail(
            moderator.email,
            "Ticket Assigned",
            `A new ticket has been assigned to you: ${finalTicket.title}`
          );
        }
      });

      return { success: true };
    } catch (err) {
      console.error("❌ Error running the step", err.message);
      return { success: false };
    }
  }
);
