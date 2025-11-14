import express, { Request, Response, Router } from 'express';
import Path from '../models/Path';
import Step from '../models/Step';
import auth from '../middleware/auth';

const router: Router = express.Router();

// Get all paths
router.get('/', auth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const paths = await Path.find().sort({ createdAt: -1 });
    res.json(paths);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single path
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const path = await Path.findById(req.params.id);
    if (!path) {
      res.status(404).json({ error: 'Path not found' });
      return;
    }
    res.json(path);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get steps associated with a path
router.get('/:id/steps', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const steps = await Step.find({ pathId: req.params.id }).sort({ createdAt: -1 });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create path
router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const path = new Path(req.body);
    await path.save();
    res.status(201).json(path);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update path
router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const path = await Path.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!path) {
      res.status(404).json({ error: 'Path not found' });
      return;
    }

    res.json(path);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete path
router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const path = await Path.findByIdAndDelete(req.params.id);

    if (!path) {
      res.status(404).json({ error: 'Path not found' });
      return;
    }

    // Optionally, unlink steps associated with this path
    await Step.updateMany(
      { pathId: req.params.id },
      { $set: { pathId: null } }
    );

    res.json({ message: 'Path deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
