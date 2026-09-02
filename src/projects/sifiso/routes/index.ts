import { Router } from 'express';
import { DbePilotActivator } from '../controllers/dbePilotActivator';

const router = Router();
const pilotActivator = new DbePilotActivator();

// Route to trigger the final 100% activation
router.post('/pilot/activate', (req, res) => pilotActivator.activateNationalPilot(req, res));

export default router;
