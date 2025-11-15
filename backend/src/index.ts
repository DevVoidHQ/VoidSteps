import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import connectDB from "./config/database";
import dotenv from "dotenv";

dotenv.config();

// Import routes
import authRoutes from "./routes/auth";
import stepRoutes from "./routes/steps";
import pathRoutes from "./routes/paths";
import routineRoutes from "./routes/routines";

const app = express();
const PORT = parseInt(process.env.PORT || "5050", 10);

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction): void => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/steps", stepRoutes);
app.use("/api/paths", pathRoutes);
app.use("/api/routines", routineRoutes);

// Health check
app.get("/api/health", (_req: Request, res: Response): void => {
  res.json({ status: "ok", message: "Server is running" });
});

app.listen(PORT, (): void => {
  console.log(`Server running on port ${PORT}`);
});
