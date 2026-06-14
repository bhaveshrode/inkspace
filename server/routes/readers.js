import express from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { authLimiter, registrationLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
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

// Request password reset
router.post('/password-reset/request', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await readersModel.createPasswordResetToken(email);

    // Always return success to prevent email enumeration
    // In production, send email here with reset link containing token
    if (result) {
      console.log(`[Password Reset] Token for ${result.email}: ${result.token}`);
      console.log(`[Password Reset] Reset URL: ${req.protocol}://${req.get('host')}/#reader-reset-password?token=${result.token}`);
    }

    res.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
      // In development, include token for testing (REMOVE IN PRODUCTION)
      ...(process.env.NODE_ENV !== 'production' && result ? { token: result.token } : {})
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate reset token
router.get('/password-reset/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const resetToken = await readersModel.validatePasswordResetToken(token);

    if (!resetToken) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired reset token' });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
router.post('/password-reset/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    await readersModel.resetPassword(token, password);
    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (err) {
    console.error(err);
    if (err.message === 'Invalid or expired reset token') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
export { authenticateReader };
