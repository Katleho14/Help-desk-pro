import mongoose from "mongoose";
import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.js";

export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    // Set the initial status to 'PROCESSING' immediately so the frontend
    // doesn't show 'OPEN' before the Inngest job can update it.
    const newTicket = await Ticket.create({
      title,
      description,
      createdBy: req.user.id.toString(),
      status: "PROCESSING",
    });

    try {
      // ⭐ Ensure event sending errors don't crash the system
      await inngest.send({
        name: "ticket/created",
        data: {
          ticketId: newTicket._id.toString(),
          title,
          description,
          createdBy: req.user.id.toString(),
        },
      });

      console.log(`✅ Inngest event sent for ticket ${newTicket._id}`);
    } catch (inngestError) {
      console.error(
        "❌ CRITICAL: Failed to send Inngest event:",
        inngestError.message
      );
    }

    return res.status(201).json({
      message: "Ticket created and processing started",
      ticket: newTicket,
    });
  } catch (error) {
    console.error("Error creating ticket:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const priority = req.query.priority;

    let query = {};
    if (priority) {
      query.priority = priority;
    }

    let ticketsQuery;
    if (user.role !== "user") {
      // Admin or agent — get all tickets
      ticketsQuery = Ticket.find(query)
        .populate("assignedTo", ["email", "_id"])
        .sort({ createdAt: -1 });
    } else {
      // Regular user — only their own tickets
      query.createdBy = user.id;
      ticketsQuery = Ticket.find(query)
        .select(
          "title description status priority createdAt helpfulNotes relatedSkills summary"
        )
        .sort({ createdAt: -1 });
    }

    const tickets = await ticketsQuery
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await Ticket.countDocuments(query);
    const pages = Math.ceil(count / limit);

    return res.status(200).json({
      tickets,
      pages,
      page,
    });
  } catch (error) {
    console.error("Error fetching tickets:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    // ✅ Validate ObjectId to avoid CastError
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    let ticket;

    if (user.role !== "user") {
      ticket = await Ticket.findById(id).populate("assignedTo", [
        "email",
        "_id",
      ]);
    } else {
      ticket = await Ticket.findOne({
        createdBy: user.id,
        _id: id,
      }).select(
        "title description status priority createdAt helpfulNotes relatedSkills summary"
      );
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ ticket });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return res.status(500).json({ message: "Server error fetching ticket" });
  }
};
