# Personal Tracker Backend

Node.js + Express + MongoDB backend for the DevVoid Personal Tracker application.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables in `.env`:
```
PORT=5000
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_secret_key
USER_EMAIL=aneeshbhat@devvoid.org
USER_PASSWORD=your_password
```

3. Start the development server:
```bash
pnpm dev
```

4. Start the production server:
```bash
pnpm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/verify` - Verify JWT token

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/toggle` - Toggle task completion
- `POST /api/tasks/:id/subtasks` - Add subtask
- `PUT /api/tasks/:id/subtasks/:subtaskId` - Update subtask
- `DELETE /api/tasks/:id/subtasks/:subtaskId` - Delete subtask
- `PATCH /api/tasks/:id/subtasks/:subtaskId/toggle` - Toggle subtask completion

### Goals
- `GET /api/goals` - Get all goals
- `GET /api/goals/:id` - Get single goal
- `GET /api/goals/:id/tasks` - Get tasks for a goal
- `POST /api/goals` - Create goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

## Features

- JWT authentication with hardcoded user credentials
- Task management with subtasks
- Recurring tasks support
- Goal tracking with task associations
- Task priority levels
- Due dates for tasks
