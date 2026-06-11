import express from "express";
import { prisma } from "../prisma.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply the middleware to all routes in this router
router.use(authenticateToken);

// ==========================================
// GET /api/subjects
// Get all subjects for the authenticated user
// ==========================================
router.get("/", async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: {
        userId: req.userId,
      },
    });
    res.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// ==========================================
// POST /api/subjects
// Create a new subject for the user
// ==========================================
router.post("/", async (req, res) => {
  const { name, color } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Subject 'name' is required" });
  }

  try {
    const newSubject = await prisma.subject.create({
      data: {
        name,
        color: color || "#3B82F6", // Default to a nice blue if no color provided
        userId: req.userId,
      },
    });
    res.status(201).json(newSubject); // 201 Created
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

export default router;
