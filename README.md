# VoidSteps

Track your paths and steps through your journey with a beautiful dark UI.

## Features

- **Step Management**
  - Create, update, and delete steps
  - Add optional substeps to break down complex steps
  - Prioritize steps for today
  - Mark steps as completed
  - Recurring steps (daily, weekly, monthly, yearly)

- **Path Tracking**
  - Create and manage paths (your goals/journeys)
  - Link steps to paths
  - Track which steps contribute to each path

- **Authentication**
  - Simple JWT-based authentication
  - Single hardcoded user (no registration needed)

- **UI/UX**
  - Dark theme with beautiful spiral logo
  - Minimal, clean interface
  - Tab-based navigation (Today, Steps, Paths)
  - Responsive design

## Project Structure

```
voidsteps/
├── backend/          # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── config/   # Database configuration
│   │   ├── models/   # Mongoose models (Step, Path)
│   │   ├── routes/   # API routes (/steps, /paths)
│   │   ├── middleware/ # Auth middleware
│   │   └── index.ts  # Entry point
│   └── .env          # Environment variables
│
└── frontend/         # React + TypeScript + Vite
    ├── public/
    │   └── logo.png  # VoidSteps logo
    ├── src/
    │   ├── components/ # Reusable UI components
    │   ├── contexts/   # React contexts (Auth)
    │   ├── lib/        # Utilities and API client
    │   ├── pages/      # Page components (Dashboard, Login)
    │   ├── types/      # TypeScript types (Step, Path)
    │   └── App.tsx     # Main app component
    └── .env            # Environment variables
```

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- pnpm
- MongoDB Atlas account (or local MongoDB)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pnpm install
```

3. Create `.env` file with your MongoDB connection string:
```env
PORT=5000
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_secret_key
USER_EMAIL=aneeshbhat@devvoid.org
USER_PASSWORD=VoidEmpire@2030
FRONTEND_URL=http://localhost:5173,https://your-production-domain.com
```
Note: `FRONTEND_URL` is optional. Defaults to localhost:5173, localhost:3000, localhost:4173. For production, add your frontend URL (comma-separated for multiple).

4. Start the backend:
```bash
pnpm dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Create `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the frontend:
```bash
pnpm dev
```

5. Open your browser to `http://localhost:5173`

6. Login with:
   - Email: `aneeshbhat@devvoid.org`
   - Password: `VoidEmpire@2030`

## Deployment

### Backend Deployment (Railway/Render/Heroku)

1. Set environment variables on your platform
2. Deploy the `/backend` directory
3. Ensure MongoDB connection string is configured

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
```bash
cd frontend
pnpm build
```

2. Set environment variable `VITE_API_URL` to your backend URL
3. Deploy the `frontend/dist` directory

## Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT for authentication
- bcryptjs for password handling
- CORS enabled

### Frontend
- React 19 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui for components
- React Router for navigation
- Axios for API calls
- Lucide React for icons

## Color Palette

- Background: `#000000` (Black)
- Text: `#f8f8f8` (Off-white)
- Primary: `#76a0f2` (Blue)
- Primary Dark: `#1d52ba` (Dark Blue)
- Accent: Cyan and Purple spiral in logo

## License

Private project for personal use.
