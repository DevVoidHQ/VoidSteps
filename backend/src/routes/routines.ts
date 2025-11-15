import express, { Request, Response, Router } from 'express';
import Routine from '../models/Routine';
import Step from '../models/Step';
import auth from '../middleware/auth';

const router: Router = express.Router();

// Get all routines
router.get('/', auth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const routines = await Routine.find().sort({ createdAt: -1 });
    res.json(routines);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single routine
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const routine = await Routine.findById(req.params.id);
    if (!routine) {
      res.status(404).json({ error: 'Routine not found' });
      return;
    }
    res.json(routine);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create routine
router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const routine = new Routine(req.body);
    await routine.save();
    res.status(201).json(routine);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update routine
router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const routine = await Routine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!routine) {
      res.status(404).json({ error: 'Routine not found' });
      return;
    }

    res.json(routine);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete routine
router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const routine = await Routine.findByIdAndDelete(req.params.id);

    if (!routine) {
      res.status(404).json({ error: 'Routine not found' });
      return;
    }

    res.json({ message: 'Routine deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Instantiate routine - create steps from routine templates
router.post('/:id/instantiate', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const routine = await Routine.findById(req.params.id);

    if (!routine) {
      res.status(404).json({ error: 'Routine not found' });
      return;
    }

    const { pathId: overridePathId } = req.body;
    const createdSteps = [];

    // Create steps from templates
    for (const template of routine.stepTemplates) {
      const step = new Step({
        title: template.title,
        description: template.description || '',
        pathId: overridePathId || template.pathId || null,
        prioritizedToday: template.prioritizedToday || false,
        completed: false
      });

      await step.save();
      await step.populate('pathId');
      createdSteps.push(step);
    }

    res.json({
      message: `Created ${createdSteps.length} steps from routine`,
      steps: createdSteps
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
