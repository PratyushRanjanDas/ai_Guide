import express from "express";
import { prisma } from "../prisma.js";
import { getStudyBuddyResponse } from "../services/ai.js";
import multer from "multer";
import { createRequire } from "module";
import { authenticateToken } from "../middleware/auth.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(authenticateToken);

// ==========================================
// POST /api/chat
// Start a brand new ChatSession
// ==========================================
router.post("/", async (req, res) => {
  const { title, subjectId } = req.body;

  try {
    const newSession = await prisma.chatSession.create({
      data: {
        title: title || "New Chat",
        userId: req.userId,
        subjectId: subjectId || null
      }
    });
    res.status(201).json(newSession);
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

// ==========================================
// GET /api/chat
// Get all ChatSessions for the authenticated user
// ==========================================
router.get("/", async (req, res) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({ error: "Failed to fetch chat sessions" });
  }
});

// ==========================================
// GET /api/chat/:id
// Get a ChatSession and all its past messages
// ==========================================
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        // Fetch all messages inside this session, ordered by time
        messages: {
          orderBy: { createdAt: 'asc' } 
        }
      }
    });

    if (!session || session.userId !== req.userId) {
      return res.status(404).json({ error: "Chat session not found or unauthorized" });
    }

    res.json(session);
  } catch (error) {
    console.error("Error fetching chat session:", error);
    res.status(500).json({ error: "Failed to fetch chat session" });
  }
});

// ==========================================
// PATCH /api/chat/:id
// Update a ChatSession (e.g., rename title)
// ==========================================
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  try {
    const session = await prisma.chatSession.findUnique({ where: { id } });
    if (!session || session.userId !== req.userId) {
      return res.status(404).json({ error: "Chat session not found or unauthorized" });
    }

    const updatedSession = await prisma.chatSession.update({
      where: { id },
      data: { title }
    });
    res.json(updatedSession);
  } catch (error) {
    console.error("Error updating chat session:", error);
    res.status(500).json({ error: "Failed to update chat session" });
  }
});

// ==========================================
// POST /api/chat/:id/upload
// Upload a PDF to set as context for the session
// ==========================================
router.post("/:id/upload", upload.single("file"), async (req, res) => {
  const { id } = req.params;
  
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const session = await prisma.chatSession.findUnique({ where: { id } });
    if (!session || session.userId !== req.userId) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Extract text from the PDF
    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    // Append it to the context
    const newContext = session.context 
      ? session.context + "\n\n---\n\n" + extractedText
      : extractedText;

    const updatedSession = await prisma.chatSession.update({
      where: { id },
      data: { context: newContext }
    });

    res.json({ success: true, message: "PDF processed successfully" });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

// ==========================================
// POST /api/chat/:id/messages
// Send a message to the AI and save the response
// ==========================================
router.post("/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Message 'content' is required" });
  }

  try {
    // 1. Verify the session belongs to the user and fetch past history
    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session || session.userId !== req.userId) {
      return res.status(404).json({ error: "Chat session not found or unauthorized" });
    }

    // 2. Save the user's message to the database
    const userMessage = await prisma.message.create({
      data: {
        chatSessionId: id,
        role: "USER",
        content: content
      }
    });

    // 3. Ask Gemini for a response, passing the past messages for context
    const aiResponseText = await getStudyBuddyResponse(content, session.messages, session.context);

    // 4. Save the AI's response to the database
    const aiMessage = await prisma.message.create({
      data: {
        chatSessionId: id,
        role: "ASSISTANT",
        content: aiResponseText
      }
    });

    // Return the newly created messages
    res.status(201).json({
      userMessage,
      aiMessage
    });

  } catch (error) {
    console.error("Error sending message:", error);
    
    // Provide a helpful error message if it's the missing API key
    if (error.message.includes("GEMINI_API_KEY")) {
      return res.status(500).json({ error: error.message });
    }

    res.status(500).json({ error: "Failed to process message" });
  }
});

export default router;
