import express from "express";
import cors from "cors";
import "dotenv/config";
import { prisma } from "./prisma.js";
import subjectRoutes from "./routes/subject.js";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Route
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/chat", chatRoutes);

// Startup function
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log("📁 Database connection established successfully.");

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to the database on startup:", error);
    process.exit(1);
  }
}

startServer();
