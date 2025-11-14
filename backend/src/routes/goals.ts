import express, { Request, Response, Router } from 'express';
import Goal from '../models/Goal';
import Task from '../models/Task';
import auth from '../middleware/auth';

const router: Router = express.Router();

// Get all goals
router.get('/', auth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const goals = await Goal.find().sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single goal
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tasks associated with a goal
router.get('/:id/tasks', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await Task.find({ goalId: req.params.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create goal
router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const goal = new Goal(req.body);
    await goal.save();
    res.status(201).json(goal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update goal
router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const goal = await Goal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    res.json(goal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete goal
router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const goal = await Goal.findByIdAndDelete(req.params.id);

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    // Optionally, unlink tasks associated with this goal
    await Task.updateMany(
      { goalId: req.params.id },
      { $set: { goalId: null } }
    );

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
