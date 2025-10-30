// routes/ticket.js
import express from "express";
import {
  createTicket,
  getTickets,
  getTicket,
} from "../controller/ticket.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// ✅ Protect routes with JWT middleware
router.post("/", authenticate, createTicket);
router.get("/", authenticate, getTickets);
router.get("/:id", authenticate, getTicket);

export default router;


