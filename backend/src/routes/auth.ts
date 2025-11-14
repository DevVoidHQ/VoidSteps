import express, { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { LoginRequestBody, AuthResponse, ErrorResponse, JwtPayload } from '../types';

const router: Router = express.Router();

// Login route
router.post('/login', async (req: Request<{}, AuthResponse | ErrorResponse, LoginRequestBody>, res: Response<AuthResponse | ErrorResponse>): Promise<void> => {
  try {
    const { email, password } = req.body;

    console.log(email, password);

    // Validate credentials against environment variables
    if (email !== process.env.USER_EMAIL) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Compare password
    const isMatch = password === process.env.USER_PASSWORD;

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const payload: JwtPayload = { email: process.env.USER_EMAIL };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { email: process.env.USER_EMAIL }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token route
router.get('/verify', (req: Request, res: Response): void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    res.json({ user: { email: decoded.email } });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
