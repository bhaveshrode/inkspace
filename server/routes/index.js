import express from 'express';
const router = express.Router();

// Health check
router.get('/health', (req, res) => res.json({ ok: true }));

export default router;
