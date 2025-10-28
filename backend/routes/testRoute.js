// routes/testRoute.js
import express from "express";
import analyzeTicket from "../utils/ai.js"; // adjust path if your file is elsewhere

const router = express.Router();

// GET /api/test/test-ai
router.get("/test-ai", async (req, res) => {
  try {
    console.log("🔍 /api/test/test-ai called");
    // You can replace these with any test title/description
    const ticket = {
      title: "Printer keeps reporting paper jam despite restart",
      description:
        "User restarted the printer and checked for stuck paper. The jam persists. Please suggest steps.",
    };

    const result = await analyzeTicket(ticket);
    console.log("🧠 AI Test Result:", result);

    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("❌ /api/test/test-ai error:", err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

export default router;
