import express, { Request, Response, Router } from 'express';
import Step from '../models/Step';
import auth from '../middleware/auth';

const router: Router = express.Router();

// Get all steps
router.get('/', auth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const steps = await Step.find().populate('pathId').sort({ createdAt: -1 });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single step
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const step = await Step.findById(req.params.id).populate('pathId');
    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }
    res.json(step);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create step
router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const step = new Step(req.body);
    await step.save();
    await step.populate('pathId');
    res.status(201).json(step);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update step
router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const step = await Step.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('pathId');

    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    res.json(step);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete step
router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const step = await Step.findByIdAndDelete(req.params.id);

    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    res.json({ message: 'Step deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle step completion
router.patch('/:id/toggle', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const step = await Step.findById(req.params.id);

    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    step.completed = !step.completed;
    await step.save();
    await step.populate('pathId');

    res.json(step);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add substep
router.post('/:id/substeps', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const step = await Step.findById(req.params.id);

    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    step.substeps.push(req.body);
    await step.save();
    await step.populate('pathId');

    res.json(step);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update substep
router.put('/:id/substeps/:substepId', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const step = await Step.findById(req.params.id);

    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    const substep = (step.substeps as any).id(req.params.substepId);
    if (!substep) {
      res.status(404).json({ error: 'Substep not found' });
      return;
    }

    Object.assign(substep, req.body);
    await step.save();
    await step.populate('pathId');

    res.json(step);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete substep
router.delete('/:id/substeps/:substepId', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const step = await Step.findById(req.params.id);

    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    const substep = (step.substeps as any).id(req.params.substepId);
    if (substep) {
      substep.deleteOne();
    }
    await step.save();
    await step.populate('pathId');

    res.json(step);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle substep completion
router.patch('/:id/substeps/:substepId/toggle', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const step = await Step.findById(req.params.id);

    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    const substep = (step.substeps as any).id(req.params.substepId);
    if (!substep) {
      res.status(404).json({ error: 'Substep not found' });
      return;
    }

    substep.completed = !substep.completed;
    await step.save();
    await step.populate('pathId');

    res.json(step);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
