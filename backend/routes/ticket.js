import express from "express";
import { createTicket, getTicket, getTickets } from "../controller/ticket.js";

const router = express.Router();

// 🧪 TEMP: remove authenticate middleware for testing
router.get("/", getTickets);
router.get("/:id", getTicket);
router.post("/", createTicket);

export default router;
