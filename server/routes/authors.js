import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';
import * as authorsModel from '../db/models/authors.js';
import * as ratingsModel from '../db/models/ratings.js';
import * as reviewsModel from '../db/models/reviews.js';
import * as commentsModel from '../db/models/comments.js';

const router = express.Router();

// Get all authors
router.get('/', async (req, res) => {
  try {
    const authors = await authorsModel.getAuthors();
    res.json(authors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get author by ID
router.get('/:id', async (req, res) => {
  try {
    const a = await authorsModel.getAuthorById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Author not found' });
    res.json(a);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new author (signup)
router.post('/', async (req, res) => {
  try {
    const { name, email, password, bio, avatar } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const exists = await authorsModel.getAuthorByEmail(email);
    if (exists) return res.status(409).json({ error: 'Email exists' });
    const newAuthor = await authorsModel.createAuthor({ name, email, password, bio, avatar });
    const token = jwt.sign({ id: newAuthor.id, email: newAuthor.email, name: newAuthor.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: newAuthor, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Author login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const user = await authorsModel.getAuthorByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = authorsModel.verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // return user without password hash
    const { password_hash, ...safe } = user;
    const token = jwt.sign({ id: safe.id, email: safe.email, name: safe.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: safe, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get author statistics (protected)
router.get('/statistics/me', authenticate, async (req, res) => {
  try {
    const stats = await ratingsModel.getAuthorStatistics(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent reviews for author's books (protected)
router.get('/reviews/me', authenticate, async (req, res) => {
  try {
    const reviews = await reviewsModel.getReviewsForAuthorBooks(req.user.id);
    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent comments for author's books (protected)
router.get('/comments/me', authenticate, async (req, res) => {
  try {
    const comments = await commentsModel.getCommentsForAuthorBooks(req.user.id);
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
