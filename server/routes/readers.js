import express from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { authLimiter, registrationLimiter } from '../middleware/rateLimiter.js';
import * as readersModel from '../db/models/readers.js';

const router = express.Router();

// Middleware for reader authentication
const authenticateReader = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.reader = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Register new reader
router.post('/', registrationLimiter, async (req, res) => {
    try {
        const { name, email, password, bio, avatar } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
        const exists = await readersModel.getReaderByEmail(email);
        if (exists) return res.status(409).json({ error: 'Email exists' });
        const newReader = await readersModel.createReader({ name, email, password, bio, avatar });
        const token = jwt.sign({ id: newReader.id, email: newReader.email, name: newReader.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: newReader, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Reader login
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
        const user = await readersModel.getReaderByEmail(email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const ok = readersModel.verifyPassword(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        const { password_hash, ...safe } = user;
        const token = jwt.sign({ id: safe.id, email: safe.email, name: safe.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: safe, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current reader (protected) - must be before /:id to avoid path collision
router.get('/me', authenticateReader, async (req, res) => {
    try {
        const reader = await readersModel.getReaderById(req.reader.id);
        if (!reader) return res.status(404).json({ error: 'Reader not found' });
        res.json(reader);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get reader profile (public)
router.get('/:id', async (req, res) => {
    try {
        const reader = await readersModel.getReaderById(req.params.id);
        if (!reader) return res.status(404).json({ error: 'Reader not found' });
        res.json(reader);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
export { authenticateReader };
