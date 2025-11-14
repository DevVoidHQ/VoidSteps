require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");

// Import routes
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const goalRoutes = require("./routes/goals");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://voidsteps.com",
      "http://voidsteps.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/goals", goalRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
