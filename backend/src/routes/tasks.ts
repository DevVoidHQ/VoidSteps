import express, { Request, Response, Router } from 'express';
import Task from '../models/Task';
import auth from '../middleware/auth';

const router: Router = express.Router();

// Get all tasks
router.get('/', auth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await Task.find().populate('goalId').sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single task
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id).populate('goalId');
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const task = new Task(req.body);
    await task.save();
    await task.populate('goalId');
    res.status(201).json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update task
router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('goalId');

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle task completion
router.patch('/:id/toggle', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    task.completed = !task.completed;
    await task.save();
    await task.populate('goalId');

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add subtask
router.post('/:id/subtasks', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    task.subtasks.push(req.body);
    await task.save();
    await task.populate('goalId');

    res.json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update subtask
router.put('/:id/subtasks/:subtaskId', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const subtask = (task.subtasks as any).id(req.params.subtaskId);
    if (!subtask) {
      res.status(404).json({ error: 'Subtask not found' });
      return;
    }

    Object.assign(subtask, req.body);
    await task.save();
    await task.populate('goalId');

    res.json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete subtask
router.delete('/:id/subtasks/:subtaskId', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const subtask = (task.subtasks as any).id(req.params.subtaskId);
    if (subtask) {
      subtask.deleteOne();
    }
    await task.save();
    await task.populate('goalId');

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle subtask completion
router.patch('/:id/subtasks/:subtaskId/toggle', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const subtask = (task.subtasks as any).id(req.params.subtaskId);
    if (!subtask) {
      res.status(404).json({ error: 'Subtask not found' });
      return;
    }

    subtask.completed = !subtask.completed;
    await task.save();
    await task.populate('goalId');

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
