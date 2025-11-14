# DevVoid Personal Tracker

A personal task and goal tracking application with a beautiful dark UI inspired by devvoid.org.

## Features

- **Task Management**
  - Create, update, and delete tasks
  - Add optional subtasks to break down complex tasks
  - Set priority levels (low, medium, high)
  - Add due dates
  - Mark tasks as completed
  - Recurring tasks (daily, weekly, monthly, yearly)

- **Goal Tracking**
  - Create and manage goals
  - Link tasks to goals
  - Visualize progress with completion statistics
  - Track which tasks contribute to each goal

- **Authentication**
  - Simple JWT-based authentication
  - Single hardcoded user (no registration needed)

- **UI/UX**
  - Dark theme with blue accents from devvoid.org
  - Responsive design
  - Clean, modern interface with shadcn/ui
  - Progress bars and visual indicators

## Project Structure

```
personal-tracker/
├── backend/          # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── config/   # Database configuration
│   │   ├── models/   # Mongoose models
│   │   ├── routes/   # API routes
│   │   ├── middleware/ # Auth middleware
│   │   └── index.js  # Entry point
│   └── .env          # Environment variables
│
└── frontend/         # React + TypeScript + Vite
    ├── src/
    │   ├── components/ # Reusable UI components
    │   ├── contexts/   # React contexts (Auth)
    │   ├── lib/        # Utilities and API client
    │   ├── pages/      # Page components
    │   ├── types/      # TypeScript types
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
```

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

## Color Palette (from devvoid.org)

- Background: `#000000` (Black)
- Text: `#f8f8f8` (Off-white)
- Primary: `#76a0f2` (Blue)
- Primary Dark: `#1d52ba` (Dark Blue)
- Accent: `#003cd8` (Darker Blue)

## License

Private project for personal use.
