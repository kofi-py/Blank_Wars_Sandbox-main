import express from 'express';
// TODO: Re-enable when externalChatService is ready
// import { interopService } from '../services/interopService';

const router = express.Router();

// Interop routes are temporarily disabled
// See externalChatService.ts for implementation status

router.get('/character/:id', async (_req, res) => {
    res.status(503).json({ error: 'Interop API is temporarily disabled' });
});

router.post('/character/:id/chat', async (_req, res) => {
    res.status(503).json({ error: 'Interop API is temporarily disabled' });
});

export default router;
