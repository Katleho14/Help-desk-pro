import express from "express";
import { authenticate } from "../middleware/auth.js";
import { createTicket, getTicket, getTickets } from "../controller/ticket.js";

const router = express.Router();

// ✅ All routes protected again
router.get("/", authenticate, getTickets);
router.get("/:id", authenticate, getTicket);
router.post("/", authenticate, createTicket);

export default router;

