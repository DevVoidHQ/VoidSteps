import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import connectDB from './config/database';

// Import routes
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import goalRoutes from './routes/goals';

const app = express();
const PORT = parseInt(process.env.PORT || '5050', 10);

// Middleware - CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction): void => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/goals', goalRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response): void => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, (): void => {
  console.log(`Server running on port ${PORT}`);
});
